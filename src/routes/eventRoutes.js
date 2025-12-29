import express from "express";
import { nanoid } from "nanoid";
import cloudinary from "../lib/cloudinary.js";
import verifyRole from "../middleware/verifyRole.middleware.js";
import verifyToken from "../middleware/verifyToken.middleware.js";
import Event from "../models/Event.js";
import User from "../models/User.js";
const router = express.Router();

router.post("/", verifyToken, verifyRole(["organizer"]), async (req, res) => {
  const {
    eventName,
    locationType,
    location,
    category,
    description,
    numberOfSeats,
    image,
    eventLink,
    fee,
    organizer,
    date,
    time,
    deadline,
  } = req.body;
  try {
    const uploadResponse = await cloudinary.uploader.upload(image);
    const imageUrl = uploadResponse.secure_url;

    const newEvent = new Event({
      eventName,
      locationType,
      location,
      category,
      description,
      numberOfSeats,
      eventImage: imageUrl,
      eventLink,
      fee,
      date,
      time,
      organizer,
      deadline,
      organizerEmail: req.user.email,
    });

    await newEvent.save();

    res.status(201).json(newEvent);
  } catch (error) {
    console.error("Error on event post route", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
});

router.get("/", async (req, res) => {
  try {
    const events = await Event.find().select(
      "category eventName eventImage date location numberOfSeats"
    );
    res.status(200).json(events);
  } catch (error) {
    console.log("Error in event get route", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.get("/featured", async (req, res) => {
  try {
    const featuredEvents = await Event.find()
      .sort("-1")
      .limit(3)
      .select("category eventName eventImage date location numberOfSeats");
    if (!featuredEvents) {
      return res
        .status(404)
        .json({ success: false, message: "Featured events not found" });
    }
    res.status(200).json(featuredEvents);
  } catch (error) {
    console.error("Error on get featured events route", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.get("/categories", async (req, res) => {
  try {
    const categories = await Event.distinct("category");
    res.json(categories);
  } catch (error) {
    console.error("Error on get categories route", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.get("/my-tickets", verifyToken, async (req, res) => {
  try {
    const email = req.user.email;

    // 1. Find events where user is registered and payment is free/accepted
    const events = await Event.find({
      "registrations.email": email,
      $or: [
        { "registrations.paymentStatus": "accepted" },
        { "registrations.paymentStatus": "free" },
      ],
    });

    // 2. Map to ticket info
    const tickets = events
      .map((event) => {
        const reg = event.registrations.find((r) => r.email === email);
        if (!reg || !reg.ticket) return null;
        return {
          eventName: event.eventName,
          ticketId: reg.ticket.id,
          used: reg.ticket.used,
          date: event.date,
          time: event.time,
        };
      })
      .filter(Boolean);

    res.json(tickets);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.post(
  "/validate-ticket",
  verifyToken,
  verifyRole(["organizer", "super_admin"]),
  async (req, res) => {
    try {
      const { ticketId } = req.body; // typed or scanned

      // Find ticket in any registration of the organizer's events
      const event = await Event.findOne({
        "registrations.ticket.id": ticketId,
      });

      if (!event) return res.status(404).json({ message: "Ticket not found" });

      const registration = event.registrations.find(
        (r) => r.ticket?.id === ticketId
      );

      // Only validate if ticket is free or accepted
      if (!["free", "accepted"].includes(registration.paymentStatus))
        return res.status(403).json({ message: "Ticket payment not valid" });

      // Check if already used
      if (registration.ticket.used)
        return res.status(409).json({ message: "Ticket already used" });

      // Mark ticket as used
      registration.ticket.used = true;
      registration.ticket.usedAt = new Date();
      await event.save();

      res.json({
        message: "Ticket validated successfully",
        eventName: event.eventName,
        user: registration.name,
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.get("/recent-reviews", async (req, res) => {
  try {
    const recentReviews = await Event.aggregate([
      { $unwind: "$reviews" },
      { $sort: { "reviews.createdAt": -1 } },
      { $limit: 3 },
      {
        $project: {
          eventName: 1,
          "reviews.name": 1,
          "reviews.comment": 1,
          "reviews.rating": 1,
          "reviews.createdAt": 1,
        },
      },
    ]);
    if (!recentReviews || recentReviews.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Recent reviews not found" });
    }
    res.status(200).json(recentReviews);
  } catch (error) {
    console.error("Error on get recent reviews route", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.get(
  "/payment/payment-requests",
  verifyToken,
  verifyRole(["organizer"]),
  async (req, res) => {
    try {
      const paymentRequests = await Event.aggregate([
        {
          $match: {
            organizerEmail: req.user.email, // 🔒 ONLY OWN EVENTS
          },
        },
        { $unwind: "$registrations" },
        {
          $match: {
            "registrations.paymentStatus": {
              $in: ["pending", "accepted", "rejected"],
            },
          },
        },

        { $sort: { "registrations.createdAt": -1 } },
        {
          $project: {
            eventName: 1,
            fee: 1,
            "registrations._id": 1,
            "registrations.name": 1,
            "registrations.phone": 1,
            "registrations.paymentStatus": 1,
            "registrations.paymentMethod": 1,
            "registrations.transactionId": 1,
            "registrations.createdAt": 1,
          },
        },
      ]);

      if (!paymentRequests.length) {
        return res.status(404).json({
          success: false,
          message: "No payment requests found",
        });
      }

      res.status(200).json(paymentRequests);
    } catch (error) {
      console.error("Error on get payment requests", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

router.put(
  "/payment/:id/accept-payment",
  verifyToken,
  verifyRole(["organizer"]),
  async (req, res) => {
    try {
      const event = await Event.findOne({
        organizerEmail: req.user.email, // 🔒 ownership enforced
        "registrations._id": req.params.id,
      });

      if (!event) {
        return res.status(403).json({
          success: false,
          message: "Not allowed or registration not found",
        });
      }

      const registration = event.registrations.id(req.params.id);
      registration.paymentStatus = "accepted";

      await event.save();

      res.status(200).json({ message: "Payment accepted" });
    } catch (error) {
      console.error("Error on accept payment", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

router.put(
  "/payment/:id/reject-payment",
  verifyToken,
  verifyRole(["organizer"]),
  async (req, res) => {
    try {
      const event = await Event.findOne({
        organizerEmail: req.user.email, // 🔒 ownership enforced
        "registrations._id": req.params.id,
      });

      if (!event) {
        return res.status(403).json({
          success: false,
          message: "Not allowed or registration not found",
        });
      }

      const registration = event.registrations.id(req.params.id);
      registration.paymentStatus = "rejected";

      await event.save();

      res.status(200).json({ message: "Payment rejected" });
    } catch (error) {
      console.error("Error on reject payment", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

router.get("/my-events", verifyToken, async (req, res) => {
  try {
    const { role, email } = req.user;

    // Super admin sees all events, organizer only their own
    const query = role === "super_admin" ? {} : { organizerEmail: email };
    const events = await Event.find(query).sort({ date: -1 });

    res.status(200).json(events);
  } catch (error) {
    console.error("Error fetching events", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});
router.get(
  "/reviews",
  verifyToken,
  verifyRole(["organizer", "super_admin"]),
  async (req, res) => {
    try {
      const matchStage =
        req.user.role === "organizer" ? { organizerEmail: req.user.email } : {};

      const reviews = await Event.aggregate([
        { $match: matchStage },
        { $unwind: "$reviews" },
        { $sort: { "reviews.createdAt": -1 } },
        {
          $project: {
            eventName: 1,
            organizerEmail: 1,
            "reviews._id": 1,
            "reviews.name": 1,
            "reviews.email": 1,
            "reviews.rating": 1,
            "reviews.comment": 1,
            "reviews.createdAt": 1,
          },
        },
      ]);

      if (!reviews.length) {
        return res
          .status(404)
          .json({ success: false, message: "No reviews found" });
      }

      res.status(200).json(reviews);
    } catch (error) {
      console.error("Error fetching reviews", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  }
);

router.get("/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const event = await Event.findById(id).select(
      "-registrations -reviews -eventLink"
    );
    res.status(200).json(event);
  } catch (error) {
    console.log("Error in event get route", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.post("/:id/registration", verifyToken, async (req, res) => {
  try {
    const registrationData = req.body;
    const { id } = req.params;
    const email = req.user.email;

    //1. Find Event
    const event = await Event.findById(id);
    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    //2. Check already registered or not
    const alreadyBooked = event.registrations.some((r) => r.email === email);
    if (alreadyBooked) {
      return res
        .status(409)
        .json({ success: false, message: "Already booked this event" });
    }

    // 3. Update user only if needed
    const user = await User.findOne({ email });
    if (user) {
      // Update user on first registration if want to study
      if (
        !user.studyStatus &&
        registrationData.studyStatus === "want-to-study"
      ) {
        Object.assign(user, {
          studyStatus: "want-to-study",
          phone: registrationData.phone,
          address: registrationData.address || null,
          targetTechnology: registrationData.targetTechnology || null,
          sscYear: registrationData.sscYear || null,
        });
        await user.save();

        // Update user first registration if already studying or if update studyStatus
      } else if (
        user.studyStatus !== "already-studying" &&
        registrationData.studyStatus === "already-studying"
      ) {
        Object.assign(user, {
          studyStatus: "already-studying",
          phone: registrationData.phone,
        });
        await user.save();
      }
    }

    const ticketId = nanoid(10);
    registrationData.ticket = { id: ticketId, used: false };

    // 4. Handle payment status securely
    if (Number(event.fee) === 0) {
      registrationData.paymentStatus = "free";
    } else {
      // Paid event → payment info REQUIRED
      if (!registrationData.transactionId || !registrationData.paymentMethod) {
        return res.status(400).json({
          success: false,
          message: "Payment information required for paid events",
        });
      }

      registrationData.paymentStatus = "pending";
    }

    // 5. save registration if event exist, not already booked and user updated
    event.registrations.push(registrationData);
    await event.save();

    res.status(201).json(registrationData);
  } catch (error) {
    console.error("Error on registration post route", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

// Cancel event registration
router.delete("/:id/registration", verifyToken, async (req, res) => {
  try {
    const { id } = req.params; // Event ID
    const email = req.user.email; // Logged-in user

    const event = await Event.findById(id);

    if (!event) {
      return res
        .status(404)
        .json({ success: false, message: "Event not found" });
    }

    // Check if user has a registration
    const registrationIndex = event.registrations.findIndex(
      (reg) => reg.email === email
    );

    if (registrationIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "You have not registered for this event",
      });
    }

    // Remove registration
    event.registrations.splice(registrationIndex, 1);
    await event.save();

    res.status(200).json({
      success: true,
      message: "Registration canceled successfully",
    });
  } catch (error) {
    console.error("Error canceling registration:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.get("/:email/my-bookings", verifyToken, async (req, res) => {
  try {
    const { email } = req.params;

    if (req.user.email !== email) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const myEvents = await Event.find(
      {
        "registrations.email": email,
      },
      {
        registrations: { $elemMatch: { email } },
        eventName: 1,
        date: 1,
        location: 1,
        deadline: 1,
        time: 1,
      }
    );

    res.status(200).json(myEvents);
  } catch (error) {
    console.error("Error on my bookings events route", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.post("/:id/review", verifyToken, async (req, res) => {
  try {
    const reviewData = req.body;
    const { id } = req.params;
    const email = req.user.email;

    // 1. find the event
    const event = await Event.findById(id).select(
      "reviews.email registrations.email registrations.paymentStatus"
    );
    //2. check is reviewed before or not
    const alreadyReviewed = event.reviews.some(
      (review) => review.email === email
    );

    if (alreadyReviewed) {
      return res.status(409).json({
        success: false,
        message: "Already reviewed this event",
      });
    }

    // 3. check is payment accept/free or not. if not, don't allow to review
    const registered = event.registrations.some(
      (registration) =>
        registration.email === email &&
        ["accepted", "free"].includes(registration.paymentStatus)
    );

    if (!registered) {
      return res.status(403).json({
        success: false,
        message: "You are not allowed to review this event",
      });
    }

    // 5. push reviews data to event collection
    event.reviews.push(reviewData);

    // 6. save updated event
    event.save();
    res.status(201).json(event);
  } catch (error) {
    console.error("Error on my bookings events route", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.put(
  "/:id",
  verifyToken,
  verifyRole(["organizer", "super_admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      const event = await Event.findById(id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // Ownership check
      if (
        req.user.role === "organizer" &&
        event.organizerEmail !== req.user.email
      ) {
        return res.status(403).json({
          message: "You are not allowed to update this event",
        });
      }

      Object.assign(event, req.body);
      await event.save();

      res.status(200).json(event);
    } catch (error) {
      console.error("Error updating event", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

router.delete(
  "/:id",
  verifyToken,
  verifyRole(["organizer", "super_admin"]),
  async (req, res) => {
    try {
      const { id } = req.params;

      const event = await Event.findById(id);
      if (!event) {
        return res.status(404).json({ message: "Event not found" });
      }

      // 🔒 Ownership check
      if (
        req.user.role === "organizer" &&
        event.organizerEmail !== req.user.email
      ) {
        return res.status(403).json({
          message: "You are not allowed to delete this event",
        });
      }

      await event.deleteOne();
      res.status(200).json({ message: "Event deleted successfully" });
    } catch (error) {
      console.error("Error deleting event", error);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

export default router;

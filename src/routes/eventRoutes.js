import express, { json } from "express";
import cloudinary from "../lib/cloudinary.js";
import Event from "../models/Event.js";
import verifyToken from "../middleware/verifyToken.middleware.js";
import verifyAdmin from "../middleware/verifyAdmin.middleware.js";
import User from "../models/User.js";
const router = express.Router();

router.post("/", verifyToken, verifyAdmin, async (req, res) => {
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
      return res.status(404).json({ success: false, message: "Featured events not found" });
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
      return res.status(404).json({ success: false, message: "Recent reviews not found" });
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

router.get("/payment/payments-requests", verifyToken, verifyAdmin, async (req, res) => {
  try {
    // 1. Find payment requests of each events
    const paymentRequests = await Event.aggregate([
      { $match: { "registrations.paymentStatus": "pending" } },
      { $unwind: "$registrations" },
      {
        $project: {
          eventName: 1,
          fee: 1,
          "registrations.paymentStatus": 1,
          "registrations.paymentMethod": 1,
          "registrations.transactionId": 1,
          "registrations.name": 1,
          "registrations.phone": 1,
          "registrations.createdAt": 1,
        },
      },
    ]);

    // 2. return 404 if no payment requests or empty payment requests
    if (!paymentRequests || paymentRequests.length === 0) {
      return res.status(404).json({ success: false, message: "Payment requests not found" });
    }

    // 3. send response
    res.status(200).json(paymentRequests);
  } catch (error) {
    console.error("Error on get payments requests", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.get("/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const event = await Event.findById(id).select(
      "-registrations -reviews -eventLink -locationType"
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
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    //2. Check already registered or not
    const alreadyBooked = event.registrations.some((r) => r.email === email);
    if (alreadyBooked) {
      return res.status(409).json({ success: false, message: "Already booked this event" });
    }

    // 3. Update user only if needed
    const user = await User.findOne({ email });
    if (user) {
      // Update user on first registration if want to study
      if (!user.studyStatus && registrationData.studyStatus === "want-to-study") {
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
    // 4. save registration if event exist, not already booked and user updated
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
      return res.status(404).json({ success: false, message: "Event not found" });
    }

    // Check if user has a registration
    const registrationIndex = event.registrations.findIndex((reg) => reg.email === email);

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
      { registrations: { $elemMatch: { email } }, eventName: 1, date: 1 }
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

    const event = await Event.findById(id);
    const alreadyReviewed = await Event.findOne({
      _id: id,
      "reviews.email": email,
    });

    if (alreadyReviewed) {
      return res.status(409).json({
        success: false,
        message: "Already reviewed this event",
      });
    }

    event.reviews.push(reviewData);

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

export default router;

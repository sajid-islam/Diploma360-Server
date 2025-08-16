import express from "express";
import cloudinary from "../lib/cloudinary.js";
import Event from "../models/Event.js";
import verifyToken from "../middleware/verifyToken.middleware.js";
import verifyAdmin from "../middleware/verifyAdmin.middleware.js";
const router = express.Router();

router.post("/", verifyToken, verifyAdmin, async (req, res) => {
    const {
        eventName,
        date,
        location,
        category,
        description,
        numberOfSeats,
        image,
        eventLink,
    } = req.body;
    try {
        if (
            !eventName ||
            !date ||
            !location ||
            !category ||
            !description ||
            !numberOfSeats ||
            !image
        ) {
            res.status(400).json({
                success: false,
                message: "All field are required expect EventLink",
            });
        }

        const uploadResponse = await cloudinary.uploader.upload(image);
        const imageUrl = uploadResponse.secure_url;

        const newEvent = new Event({
            eventName,
            location,
            date,
            category,
            description,
            numberOfSeats,
            eventImage: imageUrl,
            eventLink,
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
        const events = await Event.find();
        res.status(200).json(events);
    } catch (error) {
        console.log("Error in event get route", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
});
router.get("/:id", async (req, res) => {
    const id = req.params.id;
    try {
        const event = await Event.findById(id);
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

        const event = await Event.findById(id);

        if (!event) {
            return res
                .status(404)
                .json({ success: false, message: "Event not found" });
        }

        const alreadyBooked = await Event.findOne({
            _id: id,
            "registrations.email": email,
        });
        if (alreadyBooked) {
            return res
                .status(409)
                .json({ success: false, message: "Already booked this event" });
        }

        event.registrations.push(registrationData);

        await event.save();

        res.status(201).json(event);
    } catch (error) {
        console.error("Error on registration post route", error);
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
            return res
                .status(401)
                .json({ success: false, message: "Unauthorized" });
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

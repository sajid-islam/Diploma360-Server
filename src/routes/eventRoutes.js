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
        res.status(500).json({ message: "Internal Server Error" });
    }
});

export default router;

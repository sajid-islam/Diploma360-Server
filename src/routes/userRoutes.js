import express from "express";
import User from "../models/User.js";

const router = express.Router();

router.post("/", async (req, res) => {
    const { name, email, photoURL, uid } = req.body;
    try {
        if (!uid) {
            return res.status(400).json({ message: "Auth UID not find" });
        }
        if (!name || !email || !photoURL) {
            return res.status(400).json({ message: "All filed are required" });
        }
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(200).json(existingUser);
        }

        const user = new User({
            name,
            email,
            photoURL,
            uid,
        });
        await user.save();

        res.status(201).send(user);
    } catch (error) {
        console.log("Error on user creating route", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

export default router;

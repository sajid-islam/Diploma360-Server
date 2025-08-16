import express from "express";
import User from "../models/User.js";
import generateToken from "../lib/generateToken.js";

const router = express.Router();

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" ? true : false,
    sameSite: process.env.NODE_ENV === "production" ? "None" : "lax",
};

router.post("/", async (req, res) => {
    const { name, email, photoURL, uid } = req.body;
    try {
        if (!uid) {
            return res
                .status(400)
                .json({ success: false, message: "Auth UID not find" });
        }
        if (!name || !email || !photoURL) {
            return res
                .status(400)
                .json({ success: false, message: "All filed are required" });
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
        const token = generateToken({ email: user.email });

        res.cookie("token", token, cookieOptions);

        res.status(201).send(user);
    } catch (error) {
        console.log("Error on user creating route", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
});

router.post("/jwt", (req, res) => {
    const { email } = req.body;
    const token = generateToken({ email });
    res.cookie("token", token, cookieOptions);
    res.json({ message: "Token set in cookie" });
});
router.delete("/logout", (req, res) => {
    res.clearCookie("token", { ...cookieOptions, maxAge: 0 }).send("Logout");
});

export default router;

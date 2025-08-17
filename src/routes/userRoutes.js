import express from "express";
import User from "../models/User.js";
import generateToken from "../lib/generateToken.js";
import verifyToken from "./../middleware/verifyToken.middleware.js";

const router = express.Router();

const cookieOptions = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
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

router.get("/is-admin", verifyToken, async (req, res) => {
    try {
        const { email } = req.user; // from verifyToken middleware
        const user = await User.findOne({ email });
        console.log(user);
        if (!user) {
            return res
                .status(404)
                .json({ success: false, message: "User not found" });
        }

        const isAdmin = user.role === "admin";
        res.json({ isAdmin });
    } catch (error) {
        console.error("Error checking admin", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
        });
    }
});

export default router;

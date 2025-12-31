import express from "express";
import generateToken from "../lib/generateToken.js";
import verifyRole from "../middleware/verifyRole.middleware.js";
import User from "../models/User.js";
import verifyToken from "./../middleware/verifyToken.middleware.js";

const router = express.Router();

const isProduction = process.env.NODE_ENV === "production";

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? "none" : "strict",
  maxAge: 30 * 24 * 60 * 60 * 1000,
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
    const isAdmin = req.user.role === "super_admin";
    res.json({ isAdmin });
  } catch (error) {
    console.error("Error checking admin", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

router.get("/me", verifyToken, async (req, res) => {
  const user = await User.findOne({ email: req.user.email }).select(
    "role email"
  );

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json(user);
});

router.get(
  "/all",
  verifyToken,
  verifyRole(["super_admin"]),
  async (req, res) => {
    try {
      const users = await User.find().select("name email role createdAt");

      res.json({ success: true, users });
    } catch (err) {
      console.error("Error fetching users:", err);
      res
        .status(500)
        .json({ success: false, message: "Internal server error" });
    }
  }
);

router.patch(
  "/:id/role",
  verifyToken,
  verifyRole(["super_admin"]),
  async (req, res) => {
    try {
      const { role } = req.body;
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ message: "User not found" });

      user.role = role;
      await user.save();

      res.json({ message: "Role updated successfully" });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Internal server error" });
    }
  }
);

export default router;

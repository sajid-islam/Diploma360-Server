import jwt from "jsonwebtoken";
import User from "../models/User.js";

const verifyToken = async (req, res, next) => {
    try {
        const token = req.cookies.token;
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findOne({ email: decoded.email });

        if (!user) {
            return res
                .status(401)
                .json({ message: "Invalid or expired token" });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error("Error while verify token", error);
        res.status(401).json({ message: "Token is no valid" });
    }
};

export default verifyToken;

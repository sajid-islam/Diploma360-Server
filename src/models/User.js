import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        photoURL: {
            type: String,
            required: true,
        },
        role: {
            type: String,
            required: true,
            default: "student",
        },
        uid: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;

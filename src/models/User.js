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
    studyStatus: {
      type: String,
    },
    phone: {
      type: String,
    },
    sscYear: {
      type: Number,
    },
    address: {
      type: String,
    },
    targetTechnology: {
      type: String,
    },
    role: {
      type: String,
      enum: ["student", "organizer", "super_admin"],
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

import mongoose from "mongoose";

const registrationSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true, lowercase: true },
        phone: { type: String, required: true },
        numberOfSeats: { type: Number, required: true, min: 1 },
        paymentMethod: { type: String, required: true },
    },
    { timestamps: true }
);

const reviewSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true },
        rating: { type: Number, required: true, default: 1 },
        comment: { type: String, required: true },
    },
    { timestamps: true }
);

const eventSchema = new mongoose.Schema(
    {
        eventName: { type: String, required: true, trim: true },
        date: { type: Date, required: true },
        location: { type: String, required: true, trim: true },
        category: { type: String, required: true, trim: true },
        description: { type: String, required: true },
        numberOfSeats: { type: Number, required: true, min: 1 },
        eventImage: { type: String, required: true },
        eventLink: { type: String, trim: true },
        registrations: [registrationSchema],
        reviews: [reviewSchema],
    },
    { timestamps: true }
);

const Event = mongoose.model("Events", eventSchema);

export default Event;

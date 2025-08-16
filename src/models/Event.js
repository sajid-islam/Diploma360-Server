import mongoose from "mongoose";

const eventSchema = new mongoose.Schema(
    {
        eventName: {
            type: String,
            required: true,
            trim: true,
        },
        date: {
            type: Date,
            required: true,
        },
        location: {
            type: String,
            required: true,
            trim: true,
        },
        category: {
            type: String,
            required: true,
            trim: true,
        },
        description: {
            type: String,
            required: true,
        },
        numberOfSeats: {
            type: Number,
            required: true,
            min: 1,
        },
        eventImage: {
            type: String,
            required: true,
        },
        eventLink: {
            type: String,
            trim: true,
        },
    },
    { timestamps: true } // adds createdAt and updatedAt
);

const Event = mongoose.model("Events", eventSchema);

export default Event;

import mongoose from "mongoose";

const registrationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, lowercase: true },
    phone: { type: String, required: true },
    studyStatus: { type: String, required: true },
    paymentMethod: { type: String },
    transactionId: { type: String },
    paymentStatus: {
      type: String,
      enum: ["pending", "accepted", "rejected", "free"],
      default: "free",
    },

    sscYear: {
      type: String,
      required: function () {
        return this.studyStatus === "want-to-study";
      },
    },
    address: {
      type: String,
      required: function () {
        return this.studyStatus === "want-to-study";
      },
    },
    targetTechnology: {
      type: String,
      required: function () {
        return this.studyStatus === "want-to-study";
      },
    },
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
    location: { type: String, required: true, trim: true },
    locationType: { type: String, required: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, required: true },

    // Number of seats required when location type is physical
    numberOfSeats: {
      type: Number,
      required: function () {
        return this.locationType === "physical";
      },
    },
    eventImage: { type: String, required: true },

    // Event link id required when location type is Online
    eventLink: {
      type: String,
      trim: true,
      required: function () {
        return this.locationType === "online";
      },
    },
    registrations: [registrationSchema],
    reviews: [reviewSchema],
    fee: { type: Number, default: 0 },
    organizer: { type: String, default: "Unknown" },
    date: { type: Date, required: true },

    // Time required when location type is physical
    time: {
      type: String,
      required: function () {
        return this.locationType === "physical";
      },
    },
    deadline: { type: Date, required: true },
    organizerEmail: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

const Event = mongoose.model("Events", eventSchema);

export default Event;

import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("MONGODB IS CONNECTED");
    } catch (error) {
        console.log("CONNECTED FAILED TO DATABASE");
        process.exit(1);
    }
};

export default connectDB;

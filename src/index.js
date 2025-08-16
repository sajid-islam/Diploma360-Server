import express from "express";
import "dotenv/config";
import cors from "cors";
import connectDB from "./lib/db.js";
import cookieParser from "cookie-parser";

import userRoutes from "./routes/userRoutes.js";

const app = express();
const port = process.env.PORT || 3001;
app.use(cookieParser());
app.use(
    cors({
        origin: ["http://localhost:3000"],
        credentials: true,
    })
);
app.use(express.json());

app.use("/api/user", userRoutes);

app.get("/", (req, res) => {
    res.send("HELLO FROM DIPLOMA360 SERVER");
});

app.listen(port, () => {
    console.log(`Diploma360 server listening on port ${port}`);
    connectDB();
});

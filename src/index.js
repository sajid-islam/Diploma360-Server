import cookieParser from "cookie-parser";
import cors from "cors";
import "dotenv/config";
import express from "express";
import connectDB from "./lib/db.js";

import job from "./lib/cron.js";
import eventRoutes from "./routes/eventRoutes.js";
import userRoutes from "./routes/userRoutes.js";

const app = express();
const port = process.env.PORT || 3001;
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:3000", "https://diploma360.vercel.app"],
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));
job.start();

connectDB();

app.use("/api/user", userRoutes);
app.use("/api/events", eventRoutes);

app.get("/", (req, res) => {
  res.send("HELLO FROM DIPLOMA360 SERVER");
});

app.listen(port, () => {
  console.log(`Diploma360 server listening on port ${port}`);
});

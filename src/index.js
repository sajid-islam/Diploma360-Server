import express from "express";
import "dotenv/config";
import cors from "cors";
import connectDB from "./lib/db.js";

import userRoutes from "./routes/userRoutes.js";

const app = express();
const port = process.env.PORT || 3001;
app.use(cors());

app.use("/api/user", userRoutes);

app.get("/", (req, res) => {
    res.send("HELLO FROM DIPLOMA360 SERVER");
});

app.listen(port, () => {
    console.log(`Diploma360 server listening on port ${port}`);
    connectDB();
});

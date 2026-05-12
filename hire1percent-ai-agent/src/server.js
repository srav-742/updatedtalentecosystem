require("dotenv").config();

const express = require("express");

const connectDB = require("./config/db");
const testRoute = require("./routes/test");

const app = express();

console.log("Connecting to DB:", process.env.MONGO_URI);
connectDB();

const path = require("path");
app.use(express.json({ limit: "50mb" }));
app.use(express.static(path.join(__dirname, ".."))); // Serve files from root
app.use("/api", testRoute);

// Start Automated Scheduler
require("./services/scheduler");

const PORT = process.env.PORT || 5005;
app.listen(PORT, () => {
    console.log(`AI Agent Running on port ${PORT}`);
});
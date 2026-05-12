require("dotenv").config();
const mongoose = require("mongoose");
const Candidate = require("./src/models/Candidate");

async function checkDb() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const candidates = await Candidate.find({});
        console.log("Candidates in DB:", candidates.map(c => c.name));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
checkDb();

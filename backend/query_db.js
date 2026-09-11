const mongoose = require('mongoose');

const uri = "mongodb+srv://Nexhire:Sravya%407624@cluster0.17ifydh.mongodb.net/talentechosystem?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB.");

    const db = mongoose.connection.db;
    
    // Check both standard and enhanced violations
    const violations = await db.collection('proctoringviolations').find({
      $or: [
        { examId: "rec_l7zEsGX7vWWGedCPuyFh4kskP9G3_6a9aa514f2c8aedac26ba937_1789058129114_121d5b23" },
        { userId: "rec_l7zEsGX7vWWGedCPuyFh4kskP9G3_6a9aa514f2c8aedac26ba937_1789058129114_121d5b23" }
      ],
      type: "MULTIPLE_DEVICES"
    }).toArray();
    
    const enhancedViolations = await db.collection('proctoringviolationenhanceds').find({
      $or: [
        { examId: "rec_l7zEsGX7vWWGedCPuyFh4kskP9G3_6a9aa514f2c8aedac26ba937_1789058129114_121d5b23" },
        { userId: "rec_l7zEsGX7vWWGedCPuyFh4kskP9G3_6a9aa514f2c8aedac26ba937_1789058129114_121d5b23" },
        // Fallback: sometimes examId is a combination string separated by ':'
        { examId: { $regex: "rec_l7zEsGX7vWWGedCPuyFh4kskP9G3_6a9aa514f2c8aedac26ba937_1789058129114_121d5b23" } }
      ]
    }).toArray();

    // Filter just to be sure we get the MULTIPLE_DEVICES
    const specificViolations = enhancedViolations.filter(v => v.type === 'MULTIPLE_DEVICES');

    console.log("Standard Violations count:", violations.length);
    console.log("Enhanced MULTIPLE_DEVICES count:", specificViolations.length);
    if (specificViolations.length > 0) {
        console.log("Enhanced Violations (MULTIPLE_DEVICES):", JSON.stringify(specificViolations, null, 2));
    } else {
        // if no multiple devices, just print all violations to see what's there
        console.log("Total Enhanced Violations:", enhancedViolations.length);
        const types = enhancedViolations.map(v => v.type);
        console.log("Types of violations:", [...new Set(types)]);
    }

  } finally {
    await mongoose.disconnect();
  }
}

run().catch(console.dir);

const mongoose = require('mongoose');

const uri = "mongodb+srv://Nexhire:Sravya%407624@cluster0.17ifydh.mongodb.net/talentechosystem?retryWrites=true&w=majority&appName=Cluster0";

async function run() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB.");

    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    for (const c of collections) {
      const match = await db.collection(c.name).find({
        $or: [
          { $text: { $search: "Sravya" } }
        ]
      }).toArray().catch(() => []);
      
      // also regex search
      const cursor = db.collection(c.name).find();
      while (await cursor.hasNext()) {
        const doc = await cursor.next();
        const str = JSON.stringify(doc);
        if (str.includes("print(1") || str.includes("print(1 -1)") || str.includes("1 -1")) {
          console.log(`FOUND IN COLLECTION ${c.name}, DOC ID: ${doc._id}`);
          console.log(str.substring(0, 500));
        }
      }
    }

  } finally {
    await mongoose.disconnect();
  }
}

run().catch(console.dir);

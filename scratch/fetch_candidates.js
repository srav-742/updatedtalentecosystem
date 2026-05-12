const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

const MONGO_URI = "mongodb+srv://Nexhire:Sravya%407624@cluster0.17ifydh.mongodb.net/talentechosystem?retryWrites=true&w=majority&appName=Cluster0";

mongoose.connect(MONGO_URI)
  .then(async () => {
    // Basic user schema
    const UserSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    // Fetch seekers
    const candidates = await User.find({ role: 'seeker' }).select('name _id').lean();
    
    let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
    
    candidates.forEach(c => {
        if(c.name && c._id) {
            // Slugify the name
            const slugName = c.name.toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
            const slug = `${slugName}-${c._id.toString()}`;
            xmlContent += `   <url><loc>https://hire1percent.com/candidates/${slug}</loc><priority>0.6</priority></url>\n`;
        }
    });

    xmlContent += `</urlset>`;

    const sitemapPath = path.join(__dirname, '../frontend/public/sitemap-candidates.xml');
    fs.writeFileSync(sitemapPath, xmlContent, 'utf8');
    console.log(`Successfully generated ${candidates.length} candidates in sitemap-candidates.xml`);
    
    mongoose.disconnect();
  })
  .catch(err => {
    console.error("Error:", err);
    process.exit(1);
  });

require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');
const Application = require('./models/Application');

async function deeplyAnalyzeDatabase() {
    try {
        await connectDB();
        console.log('--- MONGODB CANDIDATE ANALYSIS REPORT ---');
        
        const candidates = await User.find({ role: 'seeker' });
        console.log(`Total Candidates Registered: ${candidates.length}\n`);

        const categories = {
            "Just Logged In / Inactive": [],
            "Applied (Pending Resume Check)": [],
            "Resume Selected (Skill Pending)": [],
            "Skill Assessment Complete (Interview Pending)": [],
            "Interview Completed / Hired": []
        };

        for (const user of candidates) {
            const apps = await Application.find({ userId: user.uid }).sort({ createdAt: -1 });
            
            if (apps.length === 0) {
                categories["Just Logged In / Inactive"].push(user.name + ` (${user.email}) | ID: ${user._id}`);
                continue;
            }

            const latest = apps[0];
            const { status, resumeMatchPercent, assessmentScore, interviewScore } = latest;

            if (status === 'HIRED' || status === 'ELIGIBLE' || interviewScore != null) {
                categories["Interview Completed / Hired"].push(user.name + ` (${user.email}) | App: ${latest._id}`);
            } else if (assessmentScore != null) {
                categories["Skill Assessment Complete (Interview Pending)"].push(user.name + ` (${user.email}) | App: ${latest._id}`);
            } else if (resumeMatchPercent >= 70) {
                categories["Resume Selected (Skill Pending)"].push(user.name + ` (${user.email}) | App: ${latest._id}`);
            } else {
                categories["Applied (Pending Resume Check)"].push(user.name + ` (${user.email}) | App: ${latest._id}`);
            }
        }

        for (const [category, users] of Object.entries(categories)) {
            console.log(`\n========================================`);
            console.log(`[STAGE] ${category}: ${users.length} Candidates`);
            console.log(`========================================`);
            users.forEach(u => console.log(` - ${u}`));
        }

        console.log('\nAnalysis Complete.');

    } catch(e) {
        console.error("Analysis Failed:", e);
    } finally {
        process.exit(0);
    }
}

deeplyAnalyzeDatabase();

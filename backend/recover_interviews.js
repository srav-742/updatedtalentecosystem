const mongoose = require('mongoose');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const { transcribeAudio } = require('./transcription_service');
const { callInterviewAI } = require('./utils/aiClients');
const { scoreInterviewAnswer, averageInterviewScore } = require('./utils/interviewScoring');

async function recoverApplication(appId) {
    console.log(`\n[RECOVERY] Starting recovery for Application: ${appId}`);
    
    try {
        const Application = mongoose.model('Application');
        const app = await Application.findById(appId).populate('jobId');
        if (!app) return;

        if (!app.recordingUrl) {
            console.error(`[ERROR] No recording URL for ${app.applicantName}`);
            return;
        }

        // 1. Construct Transformation URL (Cloudinary)
        // Convert webm to low-bitrate mp3 for faster processing and to fit in 25MB limit
        const audioUrl = app.recordingUrl.replace('/video/upload/', '/video/upload/ac_mp3,br_32k/').replace('.webm', '.mp3');
        console.log(`[RECOVERY] Audio URL: ${audioUrl}`);

        const tempDir = path.join(__dirname, 'temp_recovery');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
        const audioPath = path.join(tempDir, `${appId}.mp3`);

        // 2. Download
        console.log(`[RECOVERY] Downloading audio...`);
        const response = await axios({ method: 'get', url: audioUrl, responseType: 'stream' });
        const writer = fs.createWriteStream(audioPath);
        response.data.pipe(writer);
        await new Promise((resolve, reject) => { writer.on('finish', resolve); writer.on('error', reject); });
        console.log(`[RECOVERY] Download complete (${fs.statSync(audioPath).size} bytes).`);

        // 3. Transcribe
        console.log(`[RECOVERY] Transcribing with Whisper...`);
        const fullTranscript = await transcribeAudio(audioPath);
        if (!fullTranscript || fullTranscript.includes("I am describing my technical experience")) {
            console.error(`[RECOVERY] Transcription failed for ${app.applicantName}`);
            return;
        }
        console.log(`[RECOVERY] Transcript received (Length: ${fullTranscript.length}).`);

        // 4. Segment with AI
        console.log(`[RECOVERY] Segmenting transcript into per-question answers...`);
        const questionsList = app.interviewAnswers.map((a, i) => `${i+1}. ${a.question}`).join('\n');
        const prompt = `
            You are an interview recovery tool. I will provide a full transcript of an interview.
            Below are the 10 questions that were asked. 
            Please extract the candidate's answer for EACH question from the transcript.
            
            QUESTIONS:
            ${questionsList}
            
            TRANSCRIPT:
            ${fullTranscript}
            
            Return a JSON array of objects: [{ "questionNumber": 1, "answer": "..." }, ...]
            Ensure EVERY question has an entry, even if the answer is an empty string.
            Return ONLY the JSON.
        `;

        const segmentedJson = await callInterviewAI(prompt, 2000, true);
        if (!segmentedJson) throw new Error("Segmentation failed");
        
        let recoveredAnswers = JSON.parse(segmentedJson);
        // Handle if it's wrapped in an object like { "answers": [...] }
        if (!Array.isArray(recoveredAnswers) && recoveredAnswers.answers) {
            recoveredAnswers = recoveredAnswers.answers;
        }

        if (!Array.isArray(recoveredAnswers)) {
            throw new Error("Recovered answers is not an array");
        }

        // 5. Re-score and Update
        console.log(`[RECOVERY] Re-scoring and updating database...`);
        const updatedAnswers = [];
        for (const entry of recoveredAnswers) {
            const original = app.interviewAnswers[entry.questionNumber - 1];
            if (!original) continue;

            const scoring = scoreInterviewAnswer({
                questionText: original.question,
                answerText: entry.answer,
                jobSkills: app.jobId?.skills || [],
                jobDescription: app.jobId?.description || ''
            });

            updatedAnswers.push({
                question: original.question,
                answer: entry.answer || "",
                score: scoring.score,
                marks: scoring.marks,
                feedback: scoring.feedback
            });
        }

        const newInterviewScore = averageInterviewScore(updatedAnswers);
        app.interviewAnswers = updatedAnswers;
        app.interviewScore = newInterviewScore;

        // Final score calculation
        let totalScore = 0, numModules = 0;
        const job = app.jobId;
        if (job) {
            if (job.resumeAnalysis?.enabled) { totalScore += (app.resumeMatchPercent || 0); numModules++; }
            if (job.assessment?.enabled) { totalScore += (app.assessmentScore || 0); numModules++; }
            if (job.mockInterview?.enabled) { totalScore += newInterviewScore; numModules++; }
        }
        if (numModules > 0) app.finalScore = Math.round(totalScore / numModules);
        app.status = app.finalScore >= 55 ? 'SHORTLISTED' : 'APPLIED';

        await app.save();
        console.log(`[RECOVERY] SUCCESS for ${app.applicantName}. New Score: ${newInterviewScore}`);

        // Cleanup
        fs.unlinkSync(audioPath);

    } catch (err) {
        console.error(`[RECOVERY-ERROR] Failed for ${appId}:`, err.message);
    }
}

async function runRecovery() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        require('./models/Job');
        const Application = require('./models/Application');

        const apps = await Application.find({ 'interviewAnswers.0': { $exists: true }, recordingUrl: { $exists: true, $ne: null } });
        const missingApps = apps.filter(app => app.interviewAnswers.some(ans => !ans.answer || ans.answer === "" || ans.answer === "Thank you." || ans.answer === "E aí"));

        console.log(`[RECOVERY] Recovering ${missingApps.length} candidates...`);
        for (const app of missingApps) await recoverApplication(app._id);
        
        console.log("\n[RECOVERY] Finished.");
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

runRecovery();

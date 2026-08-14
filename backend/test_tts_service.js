// Quick integration test for the updated tts.service.js
require('dotenv').config({ override: true });

async function test() {
    const { generateSpeech } = require('./services/tts.service');

    console.log('=== TTS Service Integration Test ===\n');

    // Test 1: Default voice (will try ElevenLabs, then fall back to Edge)
    console.log('Test 1: Generating speech for "podcast_host" persona...');
    const buf1 = await generateSpeech("Hello! Can you walk me through your experience with Node.js and how you've applied it in production?", 'podcast_host');
    if (buf1) {
        console.log(`✅ Success! Buffer: ${buf1.buffer.length} bytes | mime: ${buf1.mimeType} | engine: ${buf1.engine}\n`);
    } else {
        console.log('❌ Failed — both engines returned null\n');
    }

    // Test 2: Female voice
    console.log('Test 2: Generating speech for "jessica" (female voice)...');
    const buf2 = await generateSpeech("Great answer! Now let me ask you about your experience with system design.", 'jessica');
    if (buf2) {
        console.log(`✅ Success! Buffer: ${buf2.buffer.length} bytes | mime: ${buf2.mimeType} | engine: ${buf2.engine}\n`);
    } else {
        console.log('❌ Failed — both engines returned null\n');
    }

    // Test 3: Edge TTS only
    console.log('Test 3: Testing generateEdgeSpeech() directly...');
    const { generateEdgeSpeech } = require('./services/tts.service');
    const buf3 = await generateEdgeSpeech("This is a direct test of the Microsoft Edge Neural TTS engine.", 'professional_interviewer');
    if (buf3) {
        console.log(`✅ Success! Buffer: ${buf3.buffer.length} bytes | mime: ${buf3.mimeType} | engine: ${buf3.engine}\n`);
    } else {
        console.log('❌ Failed\n');
    }

    console.log('=== Test Complete ===');
}

test().catch(console.error);

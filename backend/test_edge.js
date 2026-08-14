const { Communicate } = require('edge-tts-universal');
const fs = require('fs');

async function test() {
    try {
        console.log("Initializing Communicate...");
        const text = "Hello! This is a test of Microsoft Edge Text to Speech. It is completely free and sounds like a real human.";
        const communicate = new Communicate(text, {
            voice: 'en-US-AndrewNeural' // A high-quality male voice
        });

        console.log("Streaming chunks...");
        const chunks = [];
        for await (const chunk of communicate.stream()) {
            if (chunk.type === 'audio' && chunk.data) {
                chunks.push(chunk.data);
            }
        }

        const buffer = Buffer.concat(chunks);
        console.log("Success! Audio generated, buffer size:", buffer.length);
        fs.writeFileSync('edge_test_output.mp3', buffer);
        console.log("Audio written to edge_test_output.mp3");
    } catch (err) {
        console.error("Error occurred:", err);
    }
}

test();

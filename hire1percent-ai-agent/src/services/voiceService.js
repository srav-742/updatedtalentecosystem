const say = require("say");

const speakMessage = async (message) => {
    console.log("Speaking:", message);
    say.speak(message);

};

module.exports = speakMessage;
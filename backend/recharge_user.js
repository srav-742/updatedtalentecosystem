const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const userSchema = new mongoose.Schema({
    uid: String,
    coins: { type: Number, default: 50 },
    coinHistory: Array
});

const User = mongoose.model('User', userSchema);

async function rechargeUser(uid) {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const user = await User.findOne({ uid: uid });
        if (user) {
            console.log(`Current Coins: ${user.coins}`);
            user.coins += 500;
            console.log(`Recharged! New balance: ${user.coins}`);
            await user.save();
        } else {
            console.log("User not found");
        }
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

rechargeUser("2RsLJPk0ythsfNqrlMoa6wsUwE03");

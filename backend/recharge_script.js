const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const mongoose = require('mongoose');
require('dotenv').config();

const recharge = async () => {
    try {
        await mongoose.connect('mongodb+srv://venkatasravyareddy:Sravya%4033@cluster0.p7szp.mongodb.net/TalentEcoSystem?retryWrites=true&w=majority&appName=Cluster0');

        // We just need a minimal schema to update
        const userSchema = new mongoose.Schema({ uid: String, coins: Number }, { strict: false });
        const User = mongoose.model('User', userSchema);

        const res = await User.updateOne(
            { $or: [{ uid: '2RsLJPk0ythsfNqrlMoa6wsUwE03' }, { email: 'sravyareddy@gmail.com' }] },
            { $set: { coins: 10000 } }
        );

        console.log("Recharge Status:", res);
        process.exit(0);
    } catch (e) {
        console.error("Recharge Failed:", e);
        process.exit(1);
    }
}

recharge();

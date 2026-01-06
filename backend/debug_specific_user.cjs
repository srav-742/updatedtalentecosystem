const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const userSchema = new mongoose.Schema({
    name: String,
    email: String,
    role: String
});
const User = mongoose.model('User', userSchema);

async function checkSpecificUser() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const user = await User.findById("69537dcc524820fec83aa98d");
        console.log('User Found:', user);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSpecificUser();

require('dotenv').config();
const connectDB = require('./config/db');
const User = require('./models/User');

async function check() {
    await connectDB();
    const admins = await User.find({ role: 'admin' });
    console.log('Admins in DB:', admins.map(a => ({ email: a.email, role: a.role, password: a.password })));
    process.exit(0);
}
check();

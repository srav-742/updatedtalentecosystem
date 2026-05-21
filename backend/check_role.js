const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const user = await User.findOne({ email: 'sravyadhadi@gmail.com' });
    if (user) {
      console.log('User found:', user.email, 'Role:', user.role);
    } else {
      console.log('User not found');
    }
  } catch (error) {
    console.error(error);
  } finally {
    mongoose.disconnect();
  }
}

checkUser();

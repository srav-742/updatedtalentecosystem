const User = require('../models/User');
const mongoose = require('mongoose');
const { addCoins } = require('../services/coinService');

const getAllUsers = async (req, res) => {
    try {
        const users = await User.find({}, 'email role');
        res.json(users);
    } catch (error) {
        console.error("[GET-USERS] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const getUserProfile = async (req, res) => {
    try {
        const user = await User.findOne({
            $or: [{ uid: req.params.userId }, { _id: mongoose.Types.ObjectId.isValid(req.params.userId) ? req.params.userId : null }, { email: req.params.userId }]
        });
        res.json(user);
    } catch (error) {
        console.error("[GET-USERS] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const getUserCoins = async (req, res) => {
    try {
        const user = await User.findOne({
            $or: [{ uid: req.params.userId }, { _id: mongoose.Types.ObjectId.isValid(req.params.userId) ? req.params.userId : null }, { email: req.params.userId }]
        });
        if (!user) {
            return res.json({ coins: 50, history: [] });
        }
        res.json({ coins: user.coins, history: user.coinHistory });
    } catch (error) {
        console.error("[GET-USERS] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const updateUserProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const updateData = req.body;
        delete updateData._id;
        let query = {};
        if (mongoose.Types.ObjectId.isValid(userId)) {
            query = { _id: userId };
        } else {
            if (updateData.email) {
                const existingUser = await User.findOne({ email: updateData.email });
                if (existingUser) {
                    if (existingUser.uid !== userId) {
                        existingUser.uid = userId;
                        await existingUser.save();
                    }
                    query = { _id: existingUser._id };
                } else {
                    query = { uid: userId };
                }
            } else {
                query = { uid: userId };
            }
        }
        const user = await User.findOneAndUpdate(query, updateData, { new: true, upsert: true });
        const isSeekerComplete = updateData.skills && updateData.skills.length > 3;
        const isRecruiterComplete = updateData.company && updateData.company.name && updateData.designation;
        if ((isSeekerComplete || isRecruiterComplete) && !(user.coinHistory || []).some(h => h.reason === 'Profile Completion Bonus')) {
            await addCoins(user.uid, 50, 'Profile Completion Bonus');
            try {
                const refreshedUser = await User.findOne(query);
                if (refreshedUser) user.coins = refreshedUser.coins;
            } catch (e) { }
        }
        res.json(user);
    } catch (error) {
        console.error("[GET-USERS] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

const addCoinsManual = async (req, res) => {
    try {
        const { userId, amount } = req.body;
        if (!userId) return res.status(400).json({ message: "Missing userId" });
        await addCoins(userId, amount || 100, 'Manual Top-up');
        res.json({ message: `Success. Added ${amount || 100} coins.` });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const getSampleSeekers = async (req, res) => {
    try {
        const seekers = await User.find({ role: 'seeker' }, 'name skills experience bio profilePic education designation')
            .limit(6);
        res.json(seekers);
    } catch (error) {
        console.error("[GET-SAMPLE-SEEKERS] Error:", error);
        res.status(500).json({ message: error.message });
    }
};

module.exports = { getAllUsers, getUserProfile, getUserCoins, updateUserProfile, addCoinsManual, getSampleSeekers };

const mongoose = require('mongoose');
const User = require('../models/User');

const deductCoins = async (userIdOrUid, amount, reason) => {
    try {
        const query = { $or: [{ uid: userIdOrUid }, { _id: mongoose.Types.ObjectId.isValid(userIdOrUid) ? userIdOrUid : null }, { email: userIdOrUid }] };
        const user = await User.findOne(query);
        if (!user) throw new Error("User not found for coin deduction");
        if (user.coins === undefined) user.coins = 50;
        if (!user.coinHistory) user.coinHistory = [];
        if (user.coins < amount) {
            console.warn(`[ECONOMY] Insufficient coins for ${userIdOrUid} (${user.coins}/${amount}). Demo Mode: Proceeding...`);
            return user.coins;
        }
        user.coins -= amount;
        user.coinHistory.push({ amount, type: 'DEBIT', reason });
        await user.save();
        return user.coins;
    } catch (error) {
        console.warn("[ECONOMY] Soft-fail:", error.message);
        return 0;
    }
};

const addCoins = async (userIdOrUid, amount, reason) => {
    try {
        const query = { $or: [{ uid: userIdOrUid }, { _id: mongoose.Types.ObjectId.isValid(userIdOrUid) ? userIdOrUid : null }, { email: userIdOrUid }] };
        const user = await User.findOne(query);
        if (!user) return;
        if (user.coins === undefined) user.coins = 50;
        if (!user.coinHistory) user.coinHistory = [];
        user.coins += amount;
        user.coinHistory.push({ amount, type: 'CREDIT', reason });
        await user.save();
        console.log(`[REWARDS] Added ${amount} coins to ${user.email} for ${reason}`);
    } catch (error) {
        console.error("[REWARDS] Error adding coins:", error.message);
    }
};

module.exports = { deductCoins, addCoins };

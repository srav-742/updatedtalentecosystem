const mongoose = require('mongoose');
const User = require('../models/User');

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

/**
 * Builds a multi-field $or query for resolving a user across _id, uid, and email.
 * @param {string|Object} identifier - MongoDB _id, Firebase uid, email string, or user object
 * @returns {Object} Mongoose query condition object
 */
const buildRecruiterQuery = (identifier) => {
    if (!identifier) return { _id: null };

    // If a user object was passed directly
    let target = identifier;
    if (typeof identifier === 'object') {
        target = identifier.uid || identifier._id || identifier.id || identifier.email;
    }

    if (!target) return { _id: null };
    const targetStr = String(target).trim();

    const queryConditions = [];
    if (OBJECT_ID_REGEX.test(targetStr)) {
        queryConditions.push({ _id: targetStr });
    }
    queryConditions.push({ uid: targetStr });
    if (targetStr.includes('@')) {
        queryConditions.push({ email: targetStr.toLowerCase() });
    }

    return queryConditions.length > 1 ? { $or: queryConditions } : queryConditions[0];
};

/**
 * Finds a recruiter user document matching any of the identifier variants.
 * @param {string|Object} identifier 
 * @returns {Promise<Object|null>} Lean user document or null
 */
const findRecruiterUser = async (identifier) => {
    if (!identifier) return null;
    const query = buildRecruiterQuery(identifier);
    return await User.findOne(query).lean();
};

/**
 * Resolves all 3 identifier formats (_id, _idStr, uid, email, allIds) for a recruiter.
 * @param {string|Object} identifier 
 * @returns {Promise<Object>} Object containing all equivalent identifier formats
 */
const resolveRecruiterIdentifiers = async (identifier) => {
    const rawId = typeof identifier === 'object' 
        ? (identifier.uid || identifier._id || identifier.id || identifier.email)
        : identifier;

    const user = await findRecruiterUser(identifier);

    const recruiterIds = [rawId];
    if (user) {
        if (user.uid) recruiterIds.push(user.uid);
        if (user._id) recruiterIds.push(user._id.toString());
        if (user.email) recruiterIds.push(user.email);
    }

    const uniqueRecruiterIds = [...new Set(recruiterIds.filter(Boolean))];

    return {
        user,
        _id: user?._id || null,
        _idStr: user?._id ? user._id.toString() : null,
        uid: user?.uid || null,
        email: user?.email || null,
        allIds: uniqueRecruiterIds
    };
};

/**
 * Generates a MongoDB query for Job.find() matching any valid recruiter identifier.
 * @param {string|Object} identifier 
 * @returns {Promise<Object>} Mongoose job query filter
 */
const buildRecruiterJobQuery = async (identifier) => {
    const { allIds } = await resolveRecruiterIdentifiers(identifier);
    return allIds.length > 1
        ? { recruiterId: { $in: allIds } }
        : { recruiterId: allIds[0] || identifier };
};

module.exports = {
    buildRecruiterQuery,
    findRecruiterUser,
    resolveRecruiterIdentifiers,
    buildRecruiterJobQuery
};

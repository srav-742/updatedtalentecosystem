const ResumeProfile = require('../models/ResumeProfile');
const UserResume = require('../models/UserResume');

const uniqueStrings = (values = []) => [...new Set(values.map((value) => String(value || '').trim()).filter(Boolean))];

const syncFromBuilder = async (req, res) => {
    try {
        const uid = req.user.uid || req.user._id || req.user.id;
        if (!uid) {
            return res.status(401).json({ message: "Unauthorized: User identification missing" });
        }

        const resumeData = req.body;
        console.log(`[RESUME-SYNC] Syncing resume from builder for user UID: ${uid}`);

        // 1. Map basic details
        const basics = {
            name: String(resumeData.personalInfo?.fullName || '').trim(),
            email: String(resumeData.personalInfo?.email || '').trim(),
            phone: String(resumeData.personalInfo?.phone || '').trim(),
            location: String(resumeData.personalInfo?.location || '').trim()
        };

        // 2. Categorize flat skills list
        const skills = {
            programming: [],
            frameworks: [],
            databases: [],
            tools: [],
            soft: []
        };

        const programmingKeywords = ['javascript', 'typescript', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'go', 'rust', 'swift', 'kotlin', 'scala', 'sql', 'r', 'html', 'css'];
        const frameworkKeywords = ['react', 'angular', 'vue', 'express', 'django', 'flask', 'spring', 'laravel', 'rails', 'next.js', 'nuxt', 'flutter', 'tailwind', 'bootstrap', 'jquery', 'redux', 'nest.js', 'fastapi'];
        const databaseKeywords = ['mongodb', 'postgresql', 'mysql', 'sqlite', 'redis', 'elasticsearch', 'oracle', 'cassandra', 'mariadb', 'firebase', 'dynamodb'];
        const toolKeywords = ['git', 'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'jenkins', 'jira', 'figma', 'postman', 'nginx', 'terraform', 'ansible'];
        const softKeywords = ['communication', 'teamwork', 'leadership', 'problem solving', 'time management', 'adaptability', 'creativity'];

        if (Array.isArray(resumeData.skills)) {
            resumeData.skills.forEach(skill => {
                const s = String(skill || '').toLowerCase().trim();
                if (!s) return;

                if (programmingKeywords.includes(s)) {
                    skills.programming.push(skill);
                } else if (frameworkKeywords.includes(s)) {
                    skills.frameworks.push(skill);
                } else if (databaseKeywords.includes(s)) {
                    skills.databases.push(skill);
                } else if (toolKeywords.includes(s)) {
                    skills.tools.push(skill);
                } else {
                    // Check if it belongs to soft skills
                    const isSoft = softKeywords.some(kw => s.includes(kw));
                    if (isSoft) {
                        skills.soft.push(skill);
                    } else {
                        // Default fallback
                        skills.tools.push(skill);
                    }
                }
            });
        }

        // Clean arrays
        skills.programming = uniqueStrings(skills.programming);
        skills.frameworks = uniqueStrings(skills.frameworks);
        skills.databases = uniqueStrings(skills.databases);
        skills.tools = uniqueStrings(skills.tools);
        skills.soft = uniqueStrings(skills.soft);

        // 3. Map work experience
        const workExperience = (resumeData.workExperience || []).map(exp => {
            const startParts = String(exp.startDate || '').split('-');
            const endParts = String(exp.endDate || '').split('-');
            
            // Map month number to month name helper
            const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const getMonthName = (numStr) => {
                const idx = parseInt(numStr, 10) - 1;
                return (idx >= 0 && idx < 12) ? months[idx] : '';
            };

            const startYear = startParts[0] || '';
            const startMonth = startParts[1] ? getMonthName(startParts[1]) : '';
            const endYear = exp.currentlyWorking ? '' : (endParts[0] || '');
            const endMonth = (exp.currentlyWorking || !endParts[1]) ? '' : getMonthName(endParts[1]);

            // Combine description & achievements into one text block
            let desc = String(exp.description || '').trim();
            if (Array.isArray(exp.achievements) && exp.achievements.length > 0) {
                const achievementsStr = exp.achievements
                    .map(a => `- ${String(a.text || a).trim()}`)
                    .filter(Boolean)
                    .join('\n');
                if (achievementsStr) {
                    desc = desc ? `${desc}\n\nKey Achievements:\n${achievementsStr}` : achievementsStr;
                }
            }

            return {
                company: String(exp.company || '').trim(),
                position: String(exp.jobTitle || '').trim(),
                startYear,
                startMonth,
                endYear,
                endMonth,
                currentlyWorking: Boolean(exp.currentlyWorking),
                employmentType: 'Full Time',
                description: desc,
                projects: []
            };
        });

        // 4. Map education
        const education = (resumeData.education || []).map(edu => {
            const startParts = String(edu.startDate || '').split('-');
            const endParts = String(edu.endDate || '').split('-');
            
            const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            const getMonthName = (numStr) => {
                const idx = parseInt(numStr, 10) - 1;
                return (idx >= 0 && idx < 12) ? months[idx] : '';
            };

            const startYear = startParts[0] || '';
            const startMonth = startParts[1] ? getMonthName(startParts[1]) : '';
            const endYear = endParts[0] || '';
            const endMonth = endParts[1] ? getMonthName(endParts[1]) : '';
            
            // Check GPA
            let cgpa = '';
            let scale = '10';
            if (edu.gpa) {
                const gpaStr = String(edu.gpa);
                if (gpaStr.includes('/')) {
                    const gpaParts = gpaStr.split('/');
                    cgpa = gpaParts[0].trim();
                    scale = gpaParts[1].trim();
                } else {
                    cgpa = gpaStr.trim();
                    scale = parseFloat(cgpa) <= 4.0 ? '4' : '10';
                }
            }

            return {
                institution: String(edu.institution || '').trim(),
                country: String(edu.location || '').trim(),
                degree: String(edu.degree || '').trim(),
                field: String(edu.fieldOfStudy || '').trim(),
                startYear,
                startMonth,
                endYear,
                endMonth,
                currentlyStudying: !edu.endDate,
                cgpa,
                scale
            };
        });

        // 5. Map projects
        const projects = (resumeData.projects || []).map(proj => ({
            name: String(proj.title || '').trim(),
            tech: uniqueStrings(proj.technologies || []),
            role: 'Developer',
            description: String(proj.description || '').trim()
        }));

        // 6. Map languages and professional profiles
        const languages = [];
        const professionalProfiles = [];
        
        if (resumeData.personalInfo?.website) {
            professionalProfiles.push({
                platform: 'Portfolio',
                url: String(resumeData.personalInfo.website).trim()
            });
        }

        if (Array.isArray(resumeData.additionalSections)) {
            resumeData.additionalSections.forEach(section => {
                const type = String(section.type || '').toLowerCase();
                const title = String(section.title || '').toLowerCase();
                
                if (type === 'languages' || title.includes('language')) {
                    (section.items || []).forEach(item => {
                        if (item.title) languages.push(item.title);
                        if (item.content) languages.push(item.content);
                    });
                }
                
                if (type === 'socials' || type === 'links' || title.includes('social') || title.includes('link')) {
                    (section.items || []).forEach(item => {
                        let platform = String(item.title || 'Profile').trim();
                        let url = String(item.content || '').trim();
                        if (url) {
                            const urlLower = url.toLowerCase();
                            if (urlLower.includes('linkedin')) platform = 'LinkedIn';
                            else if (urlLower.includes('github')) platform = 'GitHub';
                            else if (urlLower.includes('leetcode')) platform = 'LeetCode';
                            
                            professionalProfiles.push({ platform, url });
                        }
                    });
                }
            });
        }

        // Calculate experience years roughly
        let totalMonths = 0;
        workExperience.forEach(exp => {
            const startYr = parseInt(exp.startYear, 10);
            const endYr = exp.currentlyWorking ? new Date().getFullYear() : parseInt(exp.endYear, 10);
            if (!isNaN(startYr) && !isNaN(endYr)) {
                totalMonths += (endYr - startYr) * 12;
            }
        });
        const experienceYears = Math.max(0, Math.round((totalMonths / 12) * 10) / 10);

        // 7. Update/Upsert ResumeProfile model in MongoDB
        const updatedProfile = await ResumeProfile.findOneAndUpdate(
            { userId: uid },
            {
                userId: uid,
                basics,
                summary: String(resumeData.personalInfo?.summary || '').trim(),
                skills,
                languages: uniqueStrings(languages),
                workExperience,
                education,
                projects,
                professionalProfiles,
                experienceYears,
                lastUpdated: new Date()
            },
            { upsert: true, new: true }
        );
        
        // Sync to UserResume collection as a builder-generated resume
        try {
            await UserResume.updateMany({ userId: uid }, { isDefault: false });
            await UserResume.findOneAndUpdate(
                { userId: uid, source: 'builder' },
                {
                    userId: uid,
                    title: `${basics.name || 'Builder'} Resume`,
                    source: 'builder',
                    isDefault: true,
                    updatedAt: new Date()
                },
                { upsert: true, new: true }
            );
        } catch (syncError) {
            console.error("[RESUME-SYNC] Failed to save to UserResume collection:", syncError);
        }

        console.log(`[RESUME-SYNC] Synced successfully for user UID: ${uid}`);

        // Sync candidate profile with new parsed ResumeProfile details (skills/location)
        const User = require('../models/User');
        const user = await User.findOne({
            $or: [
                { uid: uid },
                { _id: require('mongoose').Types.ObjectId.isValid(uid) ? uid : null }
            ]
        });
        if (user) {
            const { syncUserToProfile } = require('../utils/dbSync');
            await syncUserToProfile(user);
        }

        return res.status(200).json({ success: true, profile: updatedProfile });
    } catch (error) {
        console.error("[RESUME-SYNC-ERROR] Failure:", error);
        return res.status(500).json({ message: "Internal server error syncing resume data", error: error.message });
    }
};

module.exports = { syncFromBuilder };

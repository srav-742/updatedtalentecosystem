import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Code2, Briefcase, GraduationCap, Loader2, Search, Mail, Phone, MapPin, ExternalLink, Calendar, FileText, Globe, Download, Sparkles } from 'lucide-react';
import axios from 'axios';
import { API_URL, getAuthHeaders } from '../firebase';
import { useNavigate } from 'react-router-dom';
import GeneratedResumeModal from '../pages/recruiter/GeneratedResumeModal';

const mockProfiles = [
    {
        name: "Arjun Mehta",
        role: "Senior AI Engineer",
        background: "IIT Delhi • Ex-Google",
        location: "Bengaluru, India",
        match: "98%",
        technicalScore: "94/100",
        skills: ["PyTorch", "LLMs", "RAG", "CUDA"],
        experience: "5+ Years in Generative AI",
        bio: "Specializes in scaling LLM architectures and optimizing inference latency for production environments."
    },
    {
        name: "Sanya Iyer",
        role: "MLOps Specialist",
        background: "IIT Bombay • Ex-Zomato",
        location: "Mumbai, India",
        match: "95%",
        technicalScore: "91/100",
        skills: ["Kubernetes", "MLflow", "Terraform", "Python"],
        experience: "4 Years in AI Infrastructure",
        bio: "Expert in building robust CI/CD pipelines for machine learning models and managing GPU clusters."
    },
    {
        name: "Vikram Singh",
        role: "Fullstack AI Developer",
        background: "IIT Madras • Ex-Microsoft",
        location: "Hyderabad, India",
        match: "92%",
        technicalScore: "88/100",
        skills: ["React", "Node.js", "Python", "OpenAI API"],
        experience: "3+ Years Fullstack AI",
        bio: "Bridging the gap between complex AI models and intuitive user interfaces with high-performance web apps."
    }
];

const SampleProfilesModal = ({ isOpen, onClose }) => {
    const [realSeekers, setRealSeekers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedSeekerId, setSelectedSeekerId] = useState(null);
    const [selectedProfile, setSelectedProfile] = useState(null);
    const [resumeData, setResumeData] = useState(null);
    const [fetchingResume, setFetchingResume] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        if (isOpen) {
            const fetchSampleSeekers = async () => {
                setLoading(true);
                try {
                    const res = await axios.get(`${API_URL}/sample-candidates`);
                    // Filter out seekers with no data or private names if necessary
                    const validSeekers = res.data.filter(s => s.name && s.skills?.length > 0);
                    setRealSeekers(validSeekers);
                } catch (error) {
                    console.error("Error fetching sample seekers:", error);
                } finally {
                    setLoading(false);
                }
            };
            fetchSampleSeekers();
        }
    }, [isOpen]);

    useEffect(() => {
        const fetchResumeData = async () => {
            if (!selectedProfile || !selectedProfile.isReal) {
                setResumeData(null);
                return;
            }
            setFetchingResume(true);
            try {
                const headers = await getAuthHeaders();
                const id = selectedProfile.uid || selectedProfile._id;
                const res = await axios.get(`${API_URL}/resume-profile/${id}`, { headers });
                setResumeData(res.data);
            } catch (error) {
                console.log("No AI resume profile found or failed to load, falling back to database user data:", error.message);
                setResumeData(null);
            } finally {
                setFetchingResume(false);
            }
        };
        fetchResumeData();
    }, [selectedProfile]);

    const handleDownloadResume = () => {
        if (!resumeData) return;
        
        const printWindow = window.open('', '_blank');
        
        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Resume - ${resumeData.basics?.name || 'Candidate'}</title>
            <style>
                @page { margin: 0.75in; }
                body { 
                    font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; 
                    color: #222; 
                    line-height: 1.5; 
                    margin: 0; 
                    padding: 0;
                    font-size: 11pt;
                }
                .header { text-align: center; margin-bottom: 20px; }
                .name { font-size: 24pt; font-weight: bold; margin: 0 0 5px 0; text-transform: uppercase; letter-spacing: 1px; color: #111; }
                .contact { font-size: 10pt; color: #444; margin-bottom: 15px; }
                .contact span { margin: 0 5px; }
                .summary { margin-bottom: 20px; font-size: 10.5pt; text-align: justify; }
                
                .section { margin-bottom: 20px; }
                .section-title { 
                    font-size: 12pt; 
                    font-weight: bold; 
                    color: #111; 
                    border-bottom: 1px solid #000; 
                    padding-bottom: 3px; 
                    margin-bottom: 12px;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                
                .item { margin-bottom: 15px; }
                .item-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 3px; }
                .item-title { font-weight: bold; font-size: 11pt; color: #111; }
                .item-subtitle { font-style: italic; font-size: 10.5pt; color: #333; }
                .item-date { font-size: 10pt; color: #555; text-align: right; white-space: nowrap; }
                
                .item-description { margin: 5px 0 0 0; font-size: 10.5pt; }
                .item-description p { margin: 0 0 5px 0; }
                .item-description ul { margin: 0; padding-left: 20px; }
                .item-description li { margin-bottom: 3px; }
                
                .skills-container { display: flex; flex-wrap: wrap; gap: 15px; }
                .skill-group { margin-bottom: 10px; }
                .skill-label { font-weight: bold; margin-right: 5px; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1 class="name">${resumeData.basics?.name || 'Candidate Name'}</h1>
                <div class="contact">
                    ${resumeData.basics?.email ? `<span>${resumeData.basics.email}</span>` : ''}
                    ${resumeData.basics?.phone ? `<span>|</span><span>${resumeData.basics.phone}</span>` : ''}
                    ${resumeData.basics?.location ? `<span>|</span><span>${resumeData.basics.location}</span>` : ''}
                </div>
            </div>
            
            ${resumeData.summary ? `
            <div class="section">
                <div class="summary">${resumeData.summary}</div>
            </div>
            ` : ''}
            
            ${resumeData.workExperience && resumeData.workExperience.length > 0 ? `
            <div class="section">
                <h2 class="section-title">Experience</h2>
                ${resumeData.workExperience.map(exp => `
                    <div class="item">
                        <div class="item-header">
                            <span class="item-title">${exp.position || ''}</span>
                            <span class="item-date">${exp.startMonth ? exp.startMonth + ' ' : ''}${exp.startYear || ''} - ${exp.currentlyWorking ? 'Present' : (exp.endMonth ? exp.endMonth + ' ' : '') + (exp.endYear || '')}</span>
                        </div>
                        <div class="item-subtitle">${exp.company || ''} ${exp.employmentType ? `(${exp.employmentType})` : ''}</div>
                        <div class="item-description">
                            <p>${exp.description || ''}</p>
                        </div>
                    </div>
                `).join('')}
            </div>
            ` : ''}
            
            ${resumeData.education && resumeData.education.length > 0 ? `
            <div class="section">
                <h2 class="section-title">Education</h2>
                ${resumeData.education.map(edu => `
                    <div class="item">
                        <div class="item-header">
                            <span class="item-title">${edu.institution || ''}</span>
                            <span class="item-date">${edu.startYear || ''} - ${edu.currentlyStudying ? 'Present' : edu.endYear || ''}</span>
                        </div>
                        <div class="item-subtitle">${edu.degree || ''}${edu.field ? ` in ${edu.field}` : ''}</div>
                        ${edu.cgpa ? `<div class="item-description"><p>CGPA/Score: ${edu.cgpa}${edu.scale ? ` / ${edu.scale}` : ''}</p></div>` : ''}
                    </div>
                `).join('')}
            </div>
            ` : ''}
            
            ${resumeData.projects && resumeData.projects.length > 0 ? `
            <div class="section">
                <h2 class="section-title">Projects</h2>
                ${resumeData.projects.map(proj => `
                    <div class="item">
                        <div class="item-header">
                            <span class="item-title">${proj.name || ''}</span>
                        </div>
                        ${proj.role ? `<div class="item-subtitle">${proj.role}</div>` : ''}
                        <div class="item-description">
                            <p>${proj.description || ''}</p>
                            ${proj.tech && proj.tech.length > 0 ? `<p><strong>Technologies:</strong> ${proj.tech.join(', ')}</p>` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
            ` : ''}
            
            ${resumeData.skills ? `
            <div class="section">
                <h2 class="section-title">Skills</h2>
                <div class="skills-container">
                    ${resumeData.skills.programming && resumeData.skills.programming.length > 0 ? `
                        <div class="skill-group"><span class="skill-label">Programming:</span> ${resumeData.skills.programming.join(', ')}</div>
                    ` : ''}
                    ${resumeData.skills.frameworks && resumeData.skills.frameworks.length > 0 ? `
                        <div class="skill-group"><span class="skill-label">Frameworks:</span> ${resumeData.skills.frameworks.join(', ')}</div>
                    ` : ''}
                    ${resumeData.skills.databases && resumeData.skills.databases.length > 0 ? `
                        <div class="skill-group"><span class="skill-label">Databases:</span> ${resumeData.skills.databases.join(', ')}</div>
                    ` : ''}
                    ${resumeData.skills.tools && resumeData.skills.tools.length > 0 ? `
                        <div class="skill-group"><span class="skill-label">Tools:</span> ${resumeData.skills.tools.join(', ')}</div>
                    ` : ''}
                    ${resumeData.skills.soft && resumeData.skills.soft.length > 0 ? `
                        <div class="skill-group"><span class="skill-label">Soft Skills:</span> ${resumeData.skills.soft.join(', ')}</div>
                    ` : ''}
                </div>
            </div>
            ` : ''}
            
        </body>
        </html>
        `;
        
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        
        setTimeout(() => {
            printWindow.print();
        }, 300);
    };

    // Filter and merge real seekers dynamically with mock profiles (deduplicated by name)
    const displayProfiles = [
        ...realSeekers.map(s => ({ ...s, isReal: true })),
        ...mockProfiles.filter(mock => 
            !realSeekers.some(real => real.name.toLowerCase().trim() === mock.name.toLowerCase().trim())
        ).map(mock => ({ ...mock, isReal: false }))
    ];

    const handleDossierRequest = (profile) => {
        setSelectedProfile(profile);
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <div className={`fixed inset-0 ${selectedSeekerId || selectedProfile ? 'z-[90]' : 'z-[110]'} flex items-center justify-center p-4 sm:p-6 overflow-y-auto`}>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={onClose}
                            className="fixed inset-0 bg-black/90 backdrop-blur-md"
                        />

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 40 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 40 }}
                            className="relative w-full max-w-6xl bg-[#0c0f16] border border-white/10 rounded-[2.5rem] shadow-[0_0_50px_rgba(37,99,235,0.15)] my-auto max-h-[90vh] flex flex-col"
                        >
                            <div className="p-8 md:p-12 overflow-y-auto custom-scrollbar">
                                <button
                                    onClick={onClose}
                                    className="absolute top-8 right-8 z-10 p-2 text-gray-500 hover:text-white transition-colors bg-white/5 rounded-full"
                                >
                                    <X className="w-6 h-6" />
                                </button>

                                <div className="mb-10">
                                    <span className="text-blue-500 font-black uppercase tracking-[0.3em] text-[10px] mb-2 block">Live Talent Pool</span>
                                    <h3 className="text-3xl font-bold text-white mb-2">Verified AI Specialists</h3>
                                    <p className="text-gray-400">Hand-picked engineers from the top 1% of the Indian engineering ecosystem.</p>
                                </div>

                                {loading ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                                        <Loader2 className="animate-spin text-blue-500" size={40} />
                                        <p className="text-xs font-black uppercase tracking-widest text-gray-500">Accessing Talent Ledger...</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {displayProfiles.map((profile, idx) => (
                                            <motion.div
                                                key={idx}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: idx * 0.05 }}
                                                onClick={() => setSelectedProfile(profile)}
                                                className="p-6 rounded-[2rem] bg-white/[0.03] border border-white/10 flex flex-col h-full hover:border-blue-500/40 transition-all group backdrop-blur-sm cursor-pointer"
                                            >
                                                <div className="flex items-start justify-between mb-8">
                                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-teal-500 p-0.5 relative group-hover:scale-110 transition-transform">
                                                        <div className="w-full h-full rounded-[0.9rem] bg-[#0c0f16] flex items-center justify-center overflow-hidden">
                                                            {profile.profilePic ? (
                                                                <img loading="lazy" src={profile.profilePic} alt={profile.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="text-xl font-black text-white">{profile.name[0]}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1">
                                                        <div className="px-2 py-1 rounded-md bg-green-500/10 border border-green-500/20 text-[9px] font-black text-green-400 uppercase tracking-widest">
                                                            {profile.match || '90%+ Match'}
                                                        </div>
                                                        <div className="px-2 py-1 rounded-md bg-blue-500/10 border border-blue-500/20 text-[9px] font-black text-blue-400 uppercase tracking-widest">
                                                            Score: {profile.technicalScore || 'A+'}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mb-6">
                                                    <h4 className="text-xl font-bold text-white mb-1 group-hover:text-blue-400 transition-colors uppercase tracking-tight italic">
                                                        {profile.name}
                                                    </h4>
                                                    <p className="text-blue-400/80 text-[10px] font-black uppercase tracking-[0.2em]">
                                                        {profile.role || profile.designation || 'Specialist AI Engineer'}
                                                    </p>
                                                </div>

                                                <div className="space-y-4 flex-1">
                                                    <div className="space-y-2">
                                                        <div className="flex items-center gap-3 text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                                                            <GraduationCap className="w-3.5 h-3.5 text-blue-500/50" />
                                                            {typeof profile.education === 'string' ? profile.education : (profile.education?.[0]?.institution || 'Elite Technical Background')}
                                                        </div>
                                                        <div className="flex items-center gap-3 text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                                                            <Briefcase className="w-3.5 h-3.5 text-blue-500/50" />
                                                            {typeof profile.experience === 'string' ? profile.experience : (profile.experience?.[0]?.company ? `${profile.experience[0].role} @ ${profile.experience[0].company}` : 'Proven Industry Expertise')}
                                                        </div>
                                                    </div>

                                                    <p className="text-gray-500 text-[11px] leading-relaxed italic line-clamp-3 group-hover:line-clamp-none transition-all">
                                                        "{profile.bio || `Exceptional AI talent specializing in ${profile.skills?.slice(0, 3).join(', ') || 'advanced machine learning'}. Highly recommended for scale-up environments.`}"
                                                    </p>

                                                    <div className="flex flex-wrap gap-1.5 pt-2">
                                                        {(profile.skills || []).slice(0, 5).map((skill, sIdx) => (
                                                            <span key={sIdx} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-bold text-gray-400 hover:bg-white/10 transition-colors">
                                                                {skill}
                                                            </span>
                                                        ))}
                                                        {profile.skills?.length > 5 && (
                                                            <span className="text-[9px] text-gray-600 font-bold self-center">+{profile.skills.length - 5} More</span>
                                                        )}
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDossierRequest(profile);
                                                    }}
                                                    className="w-full mt-8 py-4 rounded-2xl bg-white text-black text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-500 hover:text-white transition-all shadow-xl shadow-black/20 group-hover:scale-[1.02] active:scale-95"
                                                >
                                                    Request Full Dossier
                                                </button>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Slide-in Profile Preview Drawer */}
            <AnimatePresence>
                {selectedProfile && (
                    <>
                        {/* Drawer Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.6 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedProfile(null)}
                            className="fixed inset-0 bg-black z-[120] backdrop-blur-sm"
                        />

                        {/* Drawer Panel */}
                        <motion.div
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                            className="fixed top-0 right-0 h-full w-full max-w-2xl bg-[#0c0f16]/98 backdrop-blur-xl border-l border-white/10 z-[130] shadow-[[-20px_0_50px_rgba(0,0,0,0.8)]] flex flex-col text-white overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Sticky Header */}
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#090b10]/95 backdrop-blur-md shrink-0">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-teal-500 p-0.5 relative">
                                        <div className="w-full h-full rounded-[0.9rem] bg-[#0c0f16] flex items-center justify-center overflow-hidden">
                                            {selectedProfile.profilePic ? (
                                                <img loading="lazy" src={selectedProfile.profilePic} alt={selectedProfile.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-xl font-black text-white">{selectedProfile.name[0]}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-0.5">
                                            <h4 className="text-xl font-bold text-white uppercase tracking-tight italic leading-none">{selectedProfile.name}</h4>
                                            {fetchingResume && (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                                            )}
                                        </div>
                                        <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.2em]">
                                            {selectedProfile.role || selectedProfile.designation || 'Specialist AI Engineer'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {resumeData && (
                                        <button
                                            onClick={handleDownloadResume}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all shadow-lg shadow-blue-600/20 active:scale-95"
                                            title="Download PDF"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                            <span>PDF</span>
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setSelectedProfile(null)}
                                        className="p-2.5 text-gray-500 hover:text-white transition-colors bg-white/5 rounded-xl border border-white/5"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 custom-scrollbar">
                                {/* Match Score Card */}
                                <div className="p-6 rounded-3xl bg-white/[0.02] border border-white/5 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none" />
                                    <div className="flex items-center justify-between mb-4">
                                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1">
                                            <Sparkles className="w-3.5 h-3.5" /> Live Assessment
                                        </span>
                                        <div className="flex gap-2">
                                            <div className="px-2.5 py-1 rounded-lg bg-green-500/10 border border-green-500/20 text-[9px] font-black text-green-400 uppercase tracking-widest">
                                                {selectedProfile.match || '90%+ Match'}
                                            </div>
                                            <div className="px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[9px] font-black text-blue-400 uppercase tracking-widest">
                                                Score: {selectedProfile.technicalScore || 'A+'}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="text-gray-400 text-xs italic leading-relaxed">
                                        "{resumeData?.summary || selectedProfile.bio || `Exceptional AI talent specializing in ${selectedProfile.skills?.slice(0, 3).join(', ') || 'advanced machine learning'}. Highly recommended for scale-up environments.`}"
                                    </p>
                                </div>

                                {/* Contact Details */}
                                {(selectedProfile.email || selectedProfile.phone || selectedProfile.location || resumeData?.basics) && (
                                    <div className="space-y-4">
                                        <h5 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.25em]">Contact Information</h5>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {(selectedProfile.email || resumeData?.basics?.email) && (
                                                <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 flex items-center gap-3">
                                                    <Mail className="w-4 h-4 text-blue-400/80 shrink-0" />
                                                    <div className="overflow-hidden">
                                                        <span className="text-[9px] font-bold text-gray-500 uppercase block leading-none mb-1">Email Address</span>
                                                        <span className="text-xs text-gray-300 font-semibold truncate block">{selectedProfile.email || resumeData?.basics?.email}</span>
                                                    </div>
                                                </div>
                                            )}
                                            {(selectedProfile.phone || resumeData?.basics?.phone) && (
                                                <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 flex items-center gap-3">
                                                    <Phone className="w-4 h-4 text-blue-400/80 shrink-0" />
                                                    <div className="overflow-hidden">
                                                        <span className="text-[9px] font-bold text-gray-500 uppercase block leading-none mb-1">Phone Number</span>
                                                        <span className="text-xs text-gray-300 font-semibold truncate block">{selectedProfile.phone || resumeData?.basics?.phone}</span>
                                                    </div>
                                                </div>
                                            )}
                                            {(selectedProfile.location || resumeData?.basics?.location) && (
                                                <div className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 flex items-center gap-3 sm:col-span-2">
                                                    <MapPin className="w-4 h-4 text-blue-400/80 shrink-0" />
                                                    <div className="overflow-hidden">
                                                        <span className="text-[9px] font-bold text-gray-500 uppercase block leading-none mb-1">Location</span>
                                                        <span className="text-xs text-gray-300 font-semibold truncate block">{selectedProfile.location || resumeData?.basics?.location}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Skills Section */}
                                <div className="space-y-4">
                                    <h5 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.25em]">Skills & Expertises</h5>
                                    {resumeData?.skills ? (
                                        <div className="space-y-4">
                                            {Object.entries(resumeData.skills).map(([category, items]) => {
                                                if (!items || !items.length || category === '_id') return null;
                                                return (
                                                    <div key={category} className="space-y-2">
                                                        <span className="text-[9px] font-black text-blue-400/80 uppercase tracking-widest block">{category}</span>
                                                        <div className="flex flex-wrap gap-1.5">
                                                            {items.map((skill, sIdx) => (
                                                                <span key={sIdx} className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[9px] font-semibold text-gray-300 hover:bg-white/10 transition-colors">
                                                                    {skill}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-2">
                                            {(selectedProfile.skills || []).map((skill, sIdx) => (
                                                <span key={sIdx} className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-semibold text-gray-300 hover:bg-white/10 hover:border-blue-500/30 transition-all">
                                                    {skill}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Experience Timeline */}
                                <div className="space-y-4">
                                    <h5 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.25em]">Work Experience</h5>
                                    {resumeData?.workExperience && resumeData.workExperience.length > 0 ? (
                                        <div className="space-y-6 relative border-l border-white/5 pl-4 ml-2">
                                            {resumeData.workExperience.map((exp, idx) => (
                                                <div key={idx} className="relative group">
                                                    <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-[#0c0f16] group-hover:scale-125 transition-transform" />
                                                    <div className="flex flex-wrap justify-between items-start mb-1 gap-2">
                                                        <div>
                                                            <h6 className="font-bold text-sm text-gray-200">{exp.position}</h6>
                                                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{exp.company}</span>
                                                        </div>
                                                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[9px] font-semibold text-gray-400">
                                                            {exp.startMonth ? exp.startMonth + ' ' : ''}{exp.startYear || ''} - {exp.currentlyWorking ? 'Present' : (exp.endMonth ? exp.endMonth + ' ' : '') + (exp.endYear || '')}
                                                        </span>
                                                    </div>
                                                    <p className="text-gray-400 text-xs mt-2 leading-relaxed whitespace-pre-wrap">{exp.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : selectedProfile.experience && selectedProfile.experience.length > 0 && typeof selectedProfile.experience !== 'string' ? (
                                        <div className="space-y-6 relative border-l border-white/5 pl-4 ml-2">
                                            {selectedProfile.experience.map((exp, idx) => (
                                                <div key={idx} className="relative group">
                                                    <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 border-2 border-[#0c0f16]" />
                                                    <div className="flex flex-wrap justify-between items-start mb-1 gap-2">
                                                        <div>
                                                            <h6 className="font-bold text-sm text-gray-200">{exp.role}</h6>
                                                            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{exp.company}</span>
                                                        </div>
                                                        <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-[9px] font-semibold text-gray-400">
                                                            {exp.duration}
                                                        </span>
                                                    </div>
                                                    {exp.description && (
                                                        <p className="text-gray-400 text-xs mt-2 leading-relaxed whitespace-pre-wrap">{exp.description}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 text-center text-xs text-gray-500 italic">
                                            {typeof selectedProfile.experience === 'string' ? selectedProfile.experience : 'No detailed work experience logged.'}
                                        </div>
                                    )}
                                </div>

                                {/* Education Section */}
                                <div className="space-y-4">
                                    <h5 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.25em]">Education</h5>
                                    {resumeData?.education && resumeData.education.length > 0 ? (
                                        <div className="space-y-4">
                                            {resumeData.education.map((edu, idx) => (
                                                <div key={idx} className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 flex justify-between items-start gap-4">
                                                    <div>
                                                        <h6 className="font-bold text-sm text-gray-200">{edu.institution}</h6>
                                                        <span className="text-xs text-gray-400">{edu.degree}{edu.field ? `, ${edu.field}` : ''}</span>
                                                        {edu.cgpa && <div className="text-[10px] text-gray-500 mt-1 font-bold">CGPA/Score: {edu.cgpa}{edu.scale ? ` / ${edu.scale}` : ''}</div>}
                                                    </div>
                                                    <span className="text-[10px] text-gray-500 font-semibold whitespace-nowrap">
                                                        {edu.startYear || ''} - {edu.currentlyStudying ? 'Present' : edu.endYear || ''}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : selectedProfile.education && selectedProfile.education.length > 0 && typeof selectedProfile.education !== 'string' ? (
                                        <div className="space-y-4">
                                            {selectedProfile.education.map((edu, idx) => (
                                                <div key={idx} className="p-4 rounded-2xl bg-white/[0.01] border border-white/5 flex justify-between items-start gap-4">
                                                    <div>
                                                        <h6 className="font-bold text-sm text-gray-200">{edu.institution}</h6>
                                                        <span className="text-xs text-gray-400">{edu.degree}</span>
                                                    </div>
                                                    <span className="text-[10px] text-gray-500 font-semibold whitespace-nowrap">
                                                        {edu.year}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-6 rounded-2xl bg-white/[0.01] border border-white/5 text-center text-xs text-gray-500 italic">
                                            {typeof selectedProfile.education === 'string' ? selectedProfile.education : 'No education history logged.'}
                                        </div>
                                    )}
                                </div>

                                {/* Projects Section */}
                                {(resumeData?.projects?.length > 0 || (selectedProfile.projects?.length > 0)) && (
                                    <div className="space-y-4">
                                        <h5 className="text-[10px] font-black text-gray-500 uppercase tracking-[0.25em]">Featured Projects</h5>
                                        {resumeData?.projects && resumeData.projects.length > 0 ? (
                                            <div className="space-y-4">
                                                {resumeData.projects.map((proj, idx) => (
                                                    <div key={idx} className="p-5 rounded-2xl bg-white/[0.01] border border-white/5">
                                                        <div className="flex justify-between items-baseline mb-2 gap-2">
                                                            <h6 className="font-bold text-sm text-gray-200">{proj.name}</h6>
                                                            {proj.role && <span className="text-[9px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/10 uppercase tracking-widest">{proj.role}</span>}
                                                        </div>
                                                        <p className="text-gray-400 text-xs mb-3 leading-relaxed">{proj.description}</p>
                                                        {proj.tech && proj.tech.length > 0 && (
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {proj.tech.map((t, i) => (
                                                                    <span key={i} className="text-[8px] font-bold text-gray-500 bg-white/5 border border-white/5 px-2 py-0.5 rounded uppercase tracking-wider">{t}</span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : selectedProfile.projects && selectedProfile.projects.length > 0 && (
                                            <div className="space-y-4">
                                                {selectedProfile.projects.map((proj, idx) => (
                                                    <div key={idx} className="p-5 rounded-2xl bg-white/[0.01] border border-white/5">
                                                        <div className="flex justify-between items-baseline mb-2 gap-2">
                                                            <h6 className="font-bold text-sm text-gray-200">{proj.name}</h6>
                                                            {proj.role && <span className="text-[9px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/10 uppercase tracking-widest">{proj.role}</span>}
                                                        </div>
                                                        <p className="text-gray-400 text-xs mb-3 leading-relaxed">{proj.description}</p>
                                                        {proj.tech && proj.tech.length > 0 && (
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {proj.tech.map((t, i) => (
                                                                    <span key={i} className="text-[8px] font-bold text-gray-500 bg-white/5 border border-white/5 px-2 py-0.5 rounded uppercase tracking-wider">{t}</span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Social Links & Actions */}
                                {(selectedProfile.linkedinUrl || selectedProfile.githubUrl || selectedProfile.resumeUrl) && (
                                    <div className="pt-4 border-t border-white/5 flex flex-wrap gap-3">
                                        {selectedProfile.linkedinUrl && (
                                            <a
                                                href={selectedProfile.linkedinUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-4 py-2.5 rounded-xl bg-[#0077b5]/10 border border-[#0077b5]/20 text-[10px] font-bold text-[#0077b5] uppercase tracking-wider flex items-center gap-2 hover:bg-[#0077b5]/20 transition-all"
                                            >
                                                LinkedIn Profile <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                        {selectedProfile.githubUrl && (
                                            <a
                                                href={selectedProfile.githubUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-2 hover:bg-white/10 transition-all"
                                            >
                                                GitHub Profile <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {selectedSeekerId && (
                <GeneratedResumeModal
                    userId={selectedSeekerId}
                    onClose={() => setSelectedSeekerId(null)}
                />
            )}
        </>
    );
};

export default SampleProfilesModal;

import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL, getAuthHeaders } from '../../firebase';

const GeneratedResumeModal = ({ userId, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchResumeProfile = async () => {
            setLoading(true);
            setError(null);
            try {
                const headers = await getAuthHeaders();
                const res = await axios.get(`${API_URL}/resume-profile/${userId}`, { headers });
                setData(res.data);
            } catch (err) {
                console.error("Failed to fetch resume profile:", err);
                setError(err.response?.data?.message || 'Failed to load candidate resume data. The candidate may not have an AI-parsed resume profile yet.');
            } finally {
                setLoading(false);
            }
        };

        if (userId) {
            fetchResumeProfile();
        }
    }, [userId]);

    const handleDownload = () => {
        if (!data) return;
        
        const printWindow = window.open('', '_blank');
        
        // Generate pure HTML string for the resume to ensure perfect printing formatting
        let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Resume - ${data.basics?.name || 'Candidate'}</title>
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
                <h1 class="name">${data.basics?.name || 'Candidate Name'}</h1>
                <div class="contact">
                    ${data.basics?.email ? `<span>${data.basics.email}</span>` : ''}
                    ${data.basics?.phone ? `<span>|</span><span>${data.basics.phone}</span>` : ''}
                    ${data.basics?.location ? `<span>|</span><span>${data.basics.location}</span>` : ''}
                </div>
            </div>
            
            ${data.summary ? `
            <div class="section">
                <div class="summary">${data.summary}</div>
            </div>
            ` : ''}
            
            ${data.workExperience && data.workExperience.length > 0 ? `
            <div class="section">
                <h2 class="section-title">Experience</h2>
                ${data.workExperience.map(exp => `
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
            
            ${data.education && data.education.length > 0 ? `
            <div class="section">
                <h2 class="section-title">Education</h2>
                ${data.education.map(edu => `
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
            
            ${data.projects && data.projects.length > 0 ? `
            <div class="section">
                <h2 class="section-title">Projects</h2>
                ${data.projects.map(proj => `
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
            
            ${data.skills ? `
            <div class="section">
                <h2 class="section-title">Skills</h2>
                <div class="skills-container">
                    ${data.skills.programming && data.skills.programming.length > 0 ? `
                        <div class="skill-group"><span class="skill-label">Programming:</span> ${data.skills.programming.join(', ')}</div>
                    ` : ''}
                    ${data.skills.frameworks && data.skills.frameworks.length > 0 ? `
                        <div class="skill-group"><span class="skill-label">Frameworks:</span> ${data.skills.frameworks.join(', ')}</div>
                    ` : ''}
                    ${data.skills.databases && data.skills.databases.length > 0 ? `
                        <div class="skill-group"><span class="skill-label">Databases:</span> ${data.skills.databases.join(', ')}</div>
                    ` : ''}
                    ${data.skills.tools && data.skills.tools.length > 0 ? `
                        <div class="skill-group"><span class="skill-label">Tools:</span> ${data.skills.tools.join(', ')}</div>
                    ` : ''}
                    ${data.skills.soft && data.skills.soft.length > 0 ? `
                        <div class="skill-group"><span class="skill-label">Soft Skills:</span> ${data.skills.soft.join(', ')}</div>
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
        
        // Wait a small delay for CSS to apply before triggering print
        setTimeout(() => {
            printWindow.print();
            // Optional: printWindow.close(); 
            // Better to leave it open so they can review it if they cancel print
        }, 300);
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-[#1a1d24] border border-white/10 rounded-3xl p-12 text-center max-w-md w-full shadow-2xl">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-500 mx-auto mb-6"></div>
                    <h3 className="text-xl font-bold text-white">Loading Resume Data</h3>
                    <p className="text-gray-400 mt-2">Parsing candidate information...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-[#1a1d24] text-white border border-white/10 rounded-3xl p-12 text-center max-w-md w-full shadow-2xl">
                    <X className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">Resume Not Found</h3>
                    <p className="text-gray-400 mb-6">{error || 'Could not load the parsed resume for this candidate.'}</p>
                    <button
                        onClick={onClose}
                        className="w-full bg-white/5 hover:bg-white/10 text-gray-300 font-bold px-6 py-3 rounded-xl border border-white/10 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto print:hidden">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-[#f0f2f5] rounded-[2rem] max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden my-8"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Navbar */}
                <div className="bg-[#111827] text-white p-6 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-500/20 p-2 rounded-lg">
                            <User className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold leading-tight">AI Parsed Resume</h2>
                            <p className="text-xs text-gray-400 font-medium">Standardized Candidate View</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleDownload}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20"
                        >
                            <Download className="w-4 h-4" />
                            Download PDF
                        </button>
                        <button
                            onClick={onClose}
                            className="bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-xl transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Professional Resume Render */}
                <div className="overflow-y-auto p-4 sm:p-8 flex-1 custom-scrollbar">
                    <div className="bg-white shadow-xl max-w-3xl mx-auto rounded-xl p-8 sm:p-12 text-gray-800 font-sans" id="resume-document">
                        
                        {/* Resume Header */}
                        <div className="text-center border-b-2 border-gray-200 pb-8 mb-8">
                            <h1 className="text-4xl font-black text-gray-900 mb-4 tracking-tight uppercase">
                                {data.basics?.name || 'Candidate Name'}
                            </h1>
                            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium text-gray-600">
                                {data.basics?.email && (
                                    <span className="flex items-center gap-1.5">
                                        <Mail className="w-4 h-4" /> {data.basics.email}
                                    </span>
                                )}
                                {data.basics?.phone && (
                                    <span className="flex items-center gap-1.5">
                                        <Phone className="w-4 h-4" /> {data.basics.phone}
                                    </span>
                                )}
                                {data.basics?.location && (
                                    <span className="flex items-center gap-1.5">
                                        <MapPin className="w-4 h-4" /> {data.basics.location}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Summary */}
                        {data.summary && (
                            <div className="mb-8">
                                <h2 className="text-lg font-bold text-indigo-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <User className="w-5 h-5" /> Professional Summary
                                </h2>
                                <p className="text-gray-700 leading-relaxed text-sm">
                                    {data.summary}
                                </p>
                            </div>
                        )}

                        {/* Experience */}
                        {data.workExperience && data.workExperience.length > 0 && (
                            <div className="mb-8">
                                <h2 className="text-lg font-bold text-indigo-700 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                    <Briefcase className="w-5 h-5" /> Work Experience
                                </h2>
                                <div className="space-y-6">
                                    {data.workExperience.map((exp, idx) => (
                                        <div key={idx}>
                                            <div className="flex justify-between items-start mb-1">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 text-base">{exp.position}</h3>
                                                    <div className="text-sm font-semibold text-gray-700">{exp.company} {exp.employmentType ? `· ${exp.employmentType}` : ''}</div>
                                                </div>
                                                <div className="text-sm font-medium text-gray-500 whitespace-nowrap bg-gray-50 px-2 py-1 rounded">
                                                    {exp.startMonth ? exp.startMonth + ' ' : ''}{exp.startYear || ''} - {exp.currentlyWorking ? 'Present' : (exp.endMonth ? exp.endMonth + ' ' : '') + (exp.endYear || '')}
                                                </div>
                                            </div>
                                            <p className="text-sm text-gray-700 mt-2 leading-relaxed whitespace-pre-wrap">{exp.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Education */}
                        {data.education && data.education.length > 0 && (
                            <div className="mb-8">
                                <h2 className="text-lg font-bold text-indigo-700 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                    <GraduationCap className="w-5 h-5" /> Education
                                </h2>
                                <div className="space-y-4">
                                    {data.education.map((edu, idx) => (
                                        <div key={idx} className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-gray-900 text-base">{edu.institution}</h3>
                                                <div className="text-sm text-gray-700">{edu.degree}{edu.field ? `, ${edu.field}` : ''}</div>
                                                {edu.cgpa && <div className="text-xs text-gray-500 mt-1">CGPA/Score: {edu.cgpa}{edu.scale ? ` / ${edu.scale}` : ''}</div>}
                                            </div>
                                            <div className="text-sm font-medium text-gray-500 whitespace-nowrap">
                                                {edu.startYear || ''} - {edu.currentlyStudying ? 'Present' : edu.endYear || ''}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Projects */}
                        {data.projects && data.projects.length > 0 && (
                            <div className="mb-8">
                                <h2 className="text-lg font-bold text-indigo-700 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                    <Code className="w-5 h-5" /> Projects
                                </h2>
                                <div className="space-y-5">
                                    {data.projects.map((proj, idx) => (
                                        <div key={idx}>
                                            <div className="flex justify-between items-baseline mb-1">
                                                <h3 className="font-bold text-gray-900 text-base">{proj.name}</h3>
                                                {proj.role && <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{proj.role}</span>}
                                            </div>
                                            <p className="text-sm text-gray-700 mb-2">{proj.description}</p>
                                            {proj.tech && proj.tech.length > 0 && (
                                                <div className="flex flex-wrap gap-1.5">
                                                    {proj.tech.map((t, i) => (
                                                        <span key={i} className="text-[10px] font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full uppercase tracking-wider">{t}</span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Skills */}
                        {data.skills && (
                            <div className="mb-4">
                                <h2 className="text-lg font-bold text-indigo-700 uppercase tracking-widest mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                                    <Award className="w-5 h-5" /> Skills & Expertise
                                </h2>
                                <div className="space-y-3">
                                    {data.skills.programming && data.skills.programming.length > 0 && (
                                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
                                            <span className="w-32 text-sm font-bold text-gray-900 shrink-0">Programming:</span>
                                            <div className="text-sm text-gray-700">{data.skills.programming.join(', ')}</div>
                                        </div>
                                    )}
                                    {data.skills.frameworks && data.skills.frameworks.length > 0 && (
                                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
                                            <span className="w-32 text-sm font-bold text-gray-900 shrink-0">Frameworks:</span>
                                            <div className="text-sm text-gray-700">{data.skills.frameworks.join(', ')}</div>
                                        </div>
                                    )}
                                    {data.skills.databases && data.skills.databases.length > 0 && (
                                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
                                            <span className="w-32 text-sm font-bold text-gray-900 shrink-0">Databases:</span>
                                            <div className="text-sm text-gray-700">{data.skills.databases.join(', ')}</div>
                                        </div>
                                    )}
                                    {data.skills.tools && data.skills.tools.length > 0 && (
                                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
                                            <span className="w-32 text-sm font-bold text-gray-900 shrink-0">Tools:</span>
                                            <div className="text-sm text-gray-700">{data.skills.tools.join(', ')}</div>
                                        </div>
                                    )}
                                    {data.skills.soft && data.skills.soft.length > 0 && (
                                        <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
                                            <span className="w-32 text-sm font-bold text-gray-900 shrink-0">Soft Skills:</span>
                                            <div className="text-sm text-gray-700">{data.skills.soft.join(', ')}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default GeneratedResumeModal;

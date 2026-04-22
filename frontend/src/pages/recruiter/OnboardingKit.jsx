import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FileText, 
    ShieldCheck, 
    HardDrive, 
    Target, 
    Download, 
    Printer, 
    User, 
    Briefcase, 
    DollarSign, 
    Calendar,
    ChevronRight,
    Sparkles
} from 'lucide-react';
import { onboardingTemplates } from './onboardingTemplates';

const OnboardingKit = () => {
    const [selectedId, setSelectedId] = useState('offer');
    const [formData, setFormData] = useState({
        candidateName: '',
        roleTitle: '',
        salary: '',
        startDate: '',
        companyName: 'Your Tech Company',
        managerName: 'Hiring Manager',
        effectiveDate: new Date().toLocaleDateString(),
    });

    const activeTemplate = onboardingTemplates[selectedId];

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const renderPreview = () => {
        let content = activeTemplate.content;
        const placeholders = activeTemplate.fields;
        
        placeholders.forEach(field => {
            const val = formData[field] || `[${field.toUpperCase()}]`;
            content = content.replaceAll(`{{${field}}}`, val);
        });

        // Current Date fallback
        content = content.replaceAll('{{currentDate}}', new Date().toLocaleDateString());

        // Simple Markdown-ish to HTML conversion for preview
        return content.split('\n').map((line, idx) => {
            if (line.startsWith('# ')) return <h1 key={idx} className="text-3xl font-black uppercase mb-6 text-black border-b-2 border-black pb-2">{line.replace('# ', '')}</h1>;
            if (line.startsWith('### ')) return <h3 key={idx} className="text-lg font-bold mt-6 mb-2 text-black">{line.replace('### ', '')}</h3>;
            if (line.startsWith('**')) {
                const parts = line.split('**');
                return <p key={idx} className="mb-4 text-gray-800">{parts.map((p, i) => i % 2 === 1 ? <strong key={i}>{p}</strong> : p)}</p>;
            }
            if (line.startsWith('* ')) return <li key={idx} className="ml-4 mb-2 text-gray-800 list-disc">{line.replace('* ', '')}</li>;
            if (line.trim() === '') return <div key={idx} className="h-4" />;
            return <p key={idx} className="mb-4 text-gray-800 leading-relaxed">{line}</p>;
        });
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-8 min-h-screen pb-20">
            <style>
                {`
                @media print {
                    body * { visibility: hidden; }
                    #print-area, #print-area * { visibility: visible; }
                    #print-area { 
                        position: absolute; 
                        left: 0; 
                        top: 0; 
                        width: 100%; 
                        padding: 40px;
                        background: white !important;
                        color: black !important;
                    }
                    .no-print { display: none !important; }
                }
                `}
            </style>

            <header className="no-print">
                <h1 className="text-4xl font-black uppercase tracking-tight mb-2">Zero Admin <span className="text-blue-500">Kit</span></h1>
                <p className="text-gray-500 font-medium">Professional onboarding templates for a friction-less hiring experience.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 no-print">
                {/* Sidebar Selector */}
                <div className="lg:col-span-3 space-y-4">
                    {Object.entries(onboardingTemplates).map(([id, template]) => (
                        <button
                            key={id}
                            onClick={() => setSelectedId(id)}
                            className={`w-full text-left p-5 rounded-[2rem] border transition-all duration-300 group ${
                                selectedId === id 
                                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.1)]' 
                                : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20'
                            }`}
                        >
                            <div className="flex items-center gap-3 mb-2">
                                {id === 'offer' && <FileText size={18} />}
                                {id === 'nda' && <ShieldCheck size={18} />}
                                {id === 'ip' && <HardDrive size={18} />}
                                {id === 'goals' && <Target size={18} />}
                                <span className={`text-[10px] font-black uppercase tracking-widest ${selectedId === id ? 'text-blue-400' : 'text-gray-500'}`}>Template</span>
                            </div>
                            <h3 className="font-black uppercase tracking-tight text-sm mb-1">{template.title}</h3>
                            <p className="text-[10px] line-clamp-2 opacity-60 italic leading-relaxed">{template.description}</p>
                        </button>
                    ))}

                    <div className="mt-8 p-6 rounded-[2.5rem] bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-white/5">
                        <Sparkles size={24} className="text-blue-400 mb-4" />
                        <h4 className="text-xs font-black uppercase tracking-widest mb-2">Pro Tip</h4>
                        <p className="text-[10px] text-gray-500 leading-relaxed font-medium">Use these templates to close candidates faster. All documents are formatted for professional executive standards.</p>
                    </div>
                </div>

                {/* Form & Editor */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 space-y-6">
                        <div className="flex items-center gap-2 mb-4">
                            <ChevronRight size={16} className="text-blue-400" />
                            <h2 className="text-sm font-black uppercase tracking-widest">Document Details</h2>
                        </div>

                        <div className="space-y-5">
                            {activeTemplate.fields.map(field => (
                                <div key={field} className="space-y-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 flex items-center gap-2">
                                        {field === 'candidateName' && <User size={12} />}
                                        {field === 'roleTitle' && <Briefcase size={12} />}
                                        {field === 'salary' && <DollarSign size={12} />}
                                        {field === 'startDate' && <Calendar size={12} />}
                                        {field.replace(/([A-Z])/g, ' $1')}
                                    </label>
                                    <input
                                        type="text"
                                        name={field}
                                        value={formData[field]}
                                        onChange={handleInputChange}
                                        placeholder={`Enter ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}`}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm text-white focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-gray-700 font-medium"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Live Preview Area */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-sm font-black uppercase tracking-widest text-gray-400">Live Preview</h2>
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={handlePrint}
                                className="px-4 py-2 rounded-xl bg-white text-black text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-blue-400 hover:text-white transition-all shadow-xl shadow-blue-500/20"
                            >
                                <Printer size={14} /> Print / Export
                            </button>
                        </div>
                    </div>

                    <motion.div
                        key={selectedId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        id="print-area"
                        className="bg-white rounded-[2.5rem] p-12 shadow-2xl min-h-[700px] text-black overflow-y-auto max-h-[80vh] custom-scrollbar selection:bg-blue-100"
                    >
                        {/* Company Logo Mock */}
                        <div className="flex justify-between items-center mb-16 border-b border-gray-100 pb-8 no-print-background">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                                    <span className="text-white font-black text-xl italic">{formData.companyName?.[0]}</span>
                                </div>
                                <span className="font-black uppercase tracking-tighter text-xl">{formData.companyName}</span>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Official Document</p>
                                <p className="text-[10px] font-bold text-gray-500">{activeTemplate.title} Ref #GEN-{Math.floor(Math.random() * 9000) + 1000}</p>
                            </div>
                        </div>

                        {renderPreview()}

                        <div className="mt-20 pt-8 border-t border-gray-100 text-gray-400 text-[10px] flex justify-between italic">
                            <span>Copyright © {new Date().getFullYear()} {formData.companyName}</span>
                            <span>Generated via hire1percent Zero-Admin Suite</span>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default OnboardingKit;

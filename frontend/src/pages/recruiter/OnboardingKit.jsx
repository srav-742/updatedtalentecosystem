import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
    FileText, 
    ShieldCheck, 
    HardDrive, 
    Target, 
    Printer, 
    User, 
    Briefcase, 
    DollarSign, 
    Calendar,
    ChevronRight,
    Sparkles,
    CheckCircle2
} from 'lucide-react';
import { onboardingTemplates } from './onboardingTemplates';
import './recruiter-theme.css';

const getDocumentRef = (id) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return 1000 + Math.abs(hash % 9000);
};

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
    const documentRef = getDocumentRef(selectedId);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const renderInlineMarkdown = (text) => {
        if (!text.includes('**')) return text;
        const parts = text.split('**');
        return parts.map((p, i) => 
            i % 2 === 1 ? <strong key={i} className="font-extrabold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md">{p}</strong> : p
        );
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
            if (line.startsWith('# ')) return <h1 key={idx} className="text-2xl md:text-3xl font-extrabold tracking-tight mb-6 text-slate-900 border-b border-slate-200 pb-3">{renderInlineMarkdown(line.replace('# ', ''))}</h1>;
            if (line.startsWith('### ')) return <h3 key={idx} className="text-base font-bold mt-6 mb-2 text-slate-900">{renderInlineMarkdown(line.replace('### ', ''))}</h3>;
            if (line.startsWith('* ')) return <li key={idx} className="ml-4 mb-2 text-slate-700 list-disc">{renderInlineMarkdown(line.replace('* ', ''))}</li>;
            if (line.trim() === '') return <div key={idx} className="h-3" />;
            return <p key={idx} className="mb-3 text-slate-700 leading-relaxed text-sm">{renderInlineMarkdown(line)}</p>;
        });
    };

    const handlePrint = () => {
        const printWindow = window.open('', '_blank');
        let content = activeTemplate.content;
        
        activeTemplate.fields.forEach(field => {
            const val = formData[field] || `[${field.toUpperCase()}]`;
            content = content.replaceAll(`{{${field}}}`, val);
        });
        content = content.replaceAll('{{currentDate}}', new Date().toLocaleDateString());
        
        let htmlContent = content.split('\n').map(line => {
            if (line.startsWith('# ')) return `<h1 style="font-size: 20pt; text-transform: uppercase; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 20px; font-weight: 900; color: #000;">${line.replace('# ', '')}</h1>`;
            if (line.startsWith('### ')) return `<h3 style="font-size: 13pt; font-weight: bold; margin-top: 20px; margin-bottom: 10px; color: #000;">${line.replace('### ', '')}</h3>`;
            
            let processedLine = line;
            if (processedLine.includes('**')) {
                const parts = processedLine.split('**');
                processedLine = parts.map((p, i) => i % 2 === 1 ? `<strong>${p}</strong>` : p).join('');
            }

            if (processedLine.startsWith('* ')) return `<li style="margin-left: 20px; margin-bottom: 8px;">${processedLine.replace('* ', '')}</li>`;
            if (processedLine.trim() === '') return `<div style="height: 14px;"></div>`;
            return `<p style="margin-bottom: 12px; color: #222; line-height: 1.6; font-size: 10.5pt;">${processedLine}</p>`;
        }).join('\n');

        printWindow.document.write(`
            <html>
            <head>
                <title>${activeTemplate.title}</title>
                <style>
                    @page { margin: 1in; }
                    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111; }
                    strong { font-weight: 800; color: #000; }
                </style>
            </head>
            <body>
                <div style="display: flex; justify-content: space-between; margin-bottom: 40px; border-bottom: 1px solid #ddd; padding-bottom: 20px;">
                    <div style="font-size: 18pt; font-weight: 900; text-transform: uppercase;">${formData.companyName}</div>
                    <div style="text-align: right; font-size: 9pt; color: #555;">
                        <strong>OFFICIAL DOCUMENT</strong><br/>
                        ${activeTemplate.title} Ref #GEN-${documentRef}
                    </div>
                </div>
                ${htmlContent}
                <div style="margin-top: 50px; border-top: 1px solid #ddd; padding-top: 20px; font-size: 8pt; color: #777; text-align: center;">
                    Copyright © ${new Date().getFullYear()} ${formData.companyName} | Generated via hire1percent Zero-Admin Suite
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); }, 250);
    };

    return (
        <div className="space-y-8 min-h-screen pb-20">
            {/* Header */}
            <header className="rec-hero p-8 md:p-9 relative">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <span className="rec-badge-dark px-3 py-1 text-[10px] font-bold uppercase tracking-wider">
                                Legal & Onboarding Hub
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
                            Zero-Admin <span className="rec-text-gradient-blue">Onboarding Kit</span>
                        </h1>
                        <p className="text-sm text-slate-600 max-w-2xl">
                            Auto-generate executive-grade offer letters, non-disclosure agreements, and employee onboarding documents in seconds.
                        </p>
                    </div>

                    <div className="shrink-0">
                        <button 
                            onClick={handlePrint}
                            className="rec-btn-primary px-5 py-3 text-xs font-bold uppercase tracking-wider gap-2 shadow-sm cursor-pointer"
                        >
                            <Printer size={15} /> Print / Export PDF
                        </button>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 1. Sidebar Selector */}
                <div className="lg:col-span-3 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">Available Templates</p>
                    {Object.entries(onboardingTemplates).map(([id, template]) => {
                        const isSelected = selectedId === id;
                        return (
                            <button
                                key={id}
                                onClick={() => setSelectedId(id)}
                                className={`w-full text-left p-4.5 rounded-2xl border transition-all duration-200 cursor-pointer ${
                                    isSelected 
                                    ? 'bg-slate-900 border-slate-900 shadow-md' 
                                    : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/60'
                                }`}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                                            isSelected ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            {id === 'offer' && <FileText size={15} />}
                                            {id === 'nda' && <ShieldCheck size={15} />}
                                            {id === 'ip' && <HardDrive size={15} />}
                                            {id === 'goals' && <Target size={15} />}
                                        </div>
                                        <span className={`text-[10px] font-bold uppercase tracking-widest ${
                                            isSelected ? 'text-slate-300' : 'text-slate-400'
                                        }`}>
                                            Document
                                        </span>
                                    </div>
                                    {isSelected && <CheckCircle2 size={16} className="text-emerald-400" />}
                                </div>
                                <h3 className={`font-bold text-sm mb-1 ${
                                    isSelected ? 'text-white' : 'text-slate-900'
                                }`}>
                                    {template.title}
                                </h3>
                                <p className={`text-xs line-clamp-2 leading-relaxed ${
                                    isSelected ? 'text-slate-300' : 'text-slate-500'
                                }`}>
                                    {template.description}
                                </p>
                            </button>
                        );
                    })}

                    <div className="rec-card p-5 rounded-2xl mt-4 bg-gradient-to-br from-indigo-50/50 to-blue-50/30 border border-indigo-100">
                        <div className="flex items-center gap-2 text-indigo-700 mb-2">
                            <Sparkles size={16} />
                            <h4 className="text-xs font-bold uppercase tracking-wider">Executive Advice</h4>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">
                            Issuing standardized offer packages and NDAs quickly helps prevent offer drop-offs and reduces time-to-hire by 45%.
                        </p>
                    </div>
                </div>

                {/* 2. Form & Editor */}
                <div className="lg:col-span-4 space-y-4">
                    <div className="rec-card p-7 rounded-2xl space-y-5">
                        <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                            <ChevronRight size={16} className="text-indigo-600" />
                            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Fill Document Fields</h2>
                        </div>

                        <div className="space-y-4">
                            {activeTemplate.fields.map(field => (
                                <div key={field} className="space-y-1.5">
                                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
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
                                        className="rec-input w-full px-4 py-2.5 text-xs font-medium"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* 3. Live Document Letterhead Preview */}
                <div className="lg:col-span-5 space-y-4">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">Live Paper Preview</h2>
                        <span className="text-xs text-slate-500 font-medium">Ref #GEN-{documentRef}</span>
                    </div>

                    <motion.div
                        key={selectedId}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-3xl p-8 md:p-10 border border-slate-200/80 shadow-md min-h-[600px] overflow-y-auto max-h-[75vh] custom-scrollbar"
                    >
                        {/* Company Letterhead Top */}
                        <div className="flex justify-between items-start mb-8 pb-6 border-b border-slate-200">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-bold text-lg">
                                    {formData.companyName?.[0] || 'C'}
                                </div>
                                <div>
                                    <h3 className="font-extrabold uppercase tracking-tight text-base text-slate-900">{formData.companyName}</h3>
                                    <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Confidential Document</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="rec-badge-dark px-2.5 py-0.5 text-[9px] uppercase tracking-wider">Official</span>
                                <p className="text-[10px] font-semibold text-slate-500 mt-1">{activeTemplate.title}</p>
                            </div>
                        </div>

                        {/* Document Body */}
                        <div className="prose prose-slate max-w-none">
                            {renderPreview()}
                        </div>

                        {/* Document Footer */}
                        <div className="mt-14 pt-6 border-t border-slate-200 text-slate-400 text-[11px] flex flex-col sm:flex-row justify-between gap-2">
                            <span>Copyright © {new Date().getFullYear()} {formData.companyName}</span>
                            <span>Generated via hire1percent Recruitment Suite</span>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default OnboardingKit;

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
    Mail, MessageSquare, Send, Clock, ShieldCheck, 
    AlertTriangle, CheckCircle2, ChevronDown, HelpCircle, 
    Lock, Package, Sparkles
} from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { V5_CONTACT_TOPICS } from '../utils/v5Content';

const VALID_TOPICS = ['assessment-support', 'security', 'packages', 'other'];

const Contact = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [theme, setTheme] = useState(() => localStorage.getItem('landing-theme') || 'dark');
    
    // Topic Router State
    const [selectedTopic, setSelectedTopic] = useState('other');
    const [submitted, setSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        message: ''
    });

    const isLight = theme === 'light';

    // Synchronize query parameter with state on direct navigation or refresh
    useEffect(() => {
        const rawTopic = searchParams.get('topic');
        if (rawTopic && VALID_TOPICS.includes(rawTopic)) {
            setSelectedTopic(rawTopic);
        } else {
            setSelectedTopic('other');
        }
    }, [searchParams]);

    const handleTopicChange = (newTopic) => {
        if (VALID_TOPICS.includes(newTopic)) {
            setSelectedTopic(newTopic);
            setSearchParams({ topic: newTopic });
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitted(true);
    };

    const topicConfig = V5_CONTACT_TOPICS[selectedTopic] || V5_CONTACT_TOPICS.other;

    return (
        <div className={`min-h-screen flex flex-col font-sans transition-colors duration-200 ${isLight ? 'bg-white text-gray-900' : 'bg-[#0a0d14] text-white'}`}>
            <SEO 
                title={`${topicConfig.h1} | Contact Hire1Percent`}
                description={topicConfig.intro}
                canonical="https://www.hire1percent.com/contact"
            />

            <Navbar theme={theme} onToggleTheme={() => setTheme(isLight ? 'dark' : 'light')} />

            <main className="flex-grow pt-28 pb-20">
                <div className="container mx-auto px-6 max-w-5xl">
                    {/* Dynamic Topic Header */}
                    <div className="text-center space-y-4 mb-12">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-bold tracking-widest uppercase">
                            <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Contact &amp; Support Router</span>
                        </div>
                        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
                            {topicConfig.h1}
                        </h1>
                        <p className={`text-base sm:text-lg max-w-2xl mx-auto leading-relaxed ${isLight ? 'text-gray-600' : 'text-gray-300'}`}>
                            {topicConfig.intro}
                        </p>

                        {/* Assessment Support Warning Callout */}
                        {topicConfig.note && (
                            <div className="max-w-xl mx-auto p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" aria-hidden="true" />
                                <span>{topicConfig.note}</span>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
                        {/* Topic Selector / Info Sidebar */}
                        <div className="lg:col-span-1 space-y-4">
                            <div className={`p-6 rounded-3xl border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#101422] border-white/10'}`}>
                                <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">
                                    Select Inquiry Topic
                                </h2>
                                <div className="space-y-2">
                                    {[
                                        { id: 'assessment-support', label: 'Assessment Support', icon: HelpCircle },
                                        { id: 'security', label: 'Security & Privacy', icon: Lock },
                                        { id: 'packages', label: 'Packages & Pricing', icon: Package },
                                        { id: 'other', label: 'General Inquiries', icon: Sparkles }
                                    ].map((t) => {
                                        const Icon = t.icon;
                                        const isSelected = selectedTopic === t.id;
                                        return (
                                            <button
                                                key={t.id}
                                                type="button"
                                                onClick={() => handleTopicChange(t.id)}
                                                className={`w-full p-3 rounded-xl text-xs font-semibold flex items-center gap-2.5 transition-all cursor-pointer text-left ${
                                                    isSelected 
                                                        ? 'bg-blue-600 text-white shadow-md' 
                                                        : isLight ? 'hover:bg-gray-200 text-gray-700' : 'hover:bg-white/5 text-gray-300'
                                                }`}
                                            >
                                                <Icon className="w-4 h-4 shrink-0" />
                                                <span>{t.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Direct Email Card */}
                            <div className={`p-6 rounded-3xl border ${isLight ? 'bg-gray-50 border-gray-200' : 'bg-[#101422] border-white/10'} text-xs space-y-2`}>
                                <span className="font-bold uppercase tracking-wider text-gray-400 block">Direct Channel</span>
                                <div className="flex items-center gap-2 text-blue-400 font-medium">
                                    <Mail className="w-4 h-4 shrink-0" />
                                    <a href="mailto:contact@hire1percent.com" className="hover:underline">
                                        contact@hire1percent.com
                                    </a>
                                </div>
                                <p className="text-gray-400 text-[11px]">
                                    Typical response time: Under 4 business hours.
                                </p>
                            </div>
                        </div>

                        {/* Contact Form */}
                        <div className={`lg:col-span-2 p-8 rounded-3xl border ${
                            isLight ? 'bg-white border-gray-200 shadow-md' : 'bg-[#101422] border-white/10'
                        }`}>
                            {!submitted ? (
                                <form onSubmit={handleSubmit} className="space-y-5">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label htmlFor="contact-name" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                                                Full Name <span className="text-rose-400">*</span>
                                            </label>
                                            <input 
                                                id="contact-name"
                                                type="text" 
                                                required
                                                value={formData.fullName}
                                                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                                                placeholder="Jane Doe"
                                                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-black/20 text-sm outline-none focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="contact-email" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                                                Email Address <span className="text-rose-400">*</span>
                                            </label>
                                            <input 
                                                id="contact-email"
                                                type="email" 
                                                required
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                placeholder="jane@company.com"
                                                className="w-full px-4 py-3 rounded-xl border border-white/10 bg-black/20 text-sm outline-none focus:border-blue-500"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="contact-topic-select" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                                            Topic
                                        </label>
                                        <select 
                                            id="contact-topic-select"
                                            value={selectedTopic}
                                            onChange={(e) => handleTopicChange(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-[#0c101b] text-sm outline-none focus:border-blue-500"
                                        >
                                            <option value="assessment-support">Assessment Support</option>
                                            <option value="security">Security &amp; Privacy</option>
                                            <option value="packages">Packages &amp; Pricing</option>
                                            <option value="other">General Inquiries</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="contact-message" className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">
                                            Your Message <span className="text-rose-400">*</span>
                                        </label>
                                        <textarea 
                                            id="contact-message"
                                            rows="5"
                                            required
                                            value={formData.message}
                                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                            placeholder="Provide details about your query or assessment question..."
                                            className="w-full px-4 py-3 rounded-xl border border-white/10 bg-black/20 text-sm outline-none focus:border-blue-500 leading-relaxed"
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full py-4 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <Send className="w-4 h-4" />
                                        <span>Send Message</span>
                                    </button>
                                </form>
                            ) : (
                                <div className="py-12 text-center space-y-4" role="status">
                                    <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                                        <CheckCircle2 className="w-8 h-8" />
                                    </div>
                                    <h2 className="text-xl font-bold">Message Dispatched</h2>
                                    <p className="text-xs sm:text-sm text-gray-400 max-w-md mx-auto">
                                        Thank you, {formData.fullName}. Your inquiry under <strong>{topicConfig.h1}</strong> has been received. Our team will follow up at {formData.email}.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>

            <Footer theme={theme} />
        </div>
    );
};

export default Contact;

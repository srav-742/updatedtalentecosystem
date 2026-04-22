import React, { useState, useEffect } from 'react';
import { X, Save, MessageSquare, Briefcase, Terminal, Plus, Trash2 } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../firebase';

const CommunitySettingsModal = ({ onClose }) => {
    const [loading, setLoading] = useState(false);
    const [community, setCommunity] = useState({
        name: '',
        description: '',
        platform: 'Slack',
        invitationLink: '',
        benefits: [],
        amaSessions: []
    });

    useEffect(() => {
        const fetchCommunity = async () => {
            try {
                const res = await axios.get(`${API_URL}/community`);
                if (res.data) setCommunity(res.data);
            } catch (err) {
                console.error("Failed to fetch community settings:", err);
            }
        };
        fetchCommunity();
    }, []);

    const handleSave = async () => {
        setLoading(true);
        try {
            await axios.post(`${API_URL}/community`, community);
            onClose();
        } catch (err) {
            console.error("Save failed:", err);
            alert("Failed to save settings.");
        } finally {
            setLoading(false);
        }
    };

    const addBenefit = () => {
        setCommunity({
            ...community,
            benefits: [...community.benefits, { title: '', description: '', icon: 'MessageSquare' }]
        });
    };

    const removeBenefit = (index) => {
        setCommunity({
            ...community,
            benefits: community.benefits.filter((_, i) => i !== index)
        });
    };

    const addSession = () => {
        setCommunity({
            ...community,
            amaSessions: [...community.amaSessions, { title: '', date: new Date(), speaker: '' }]
        });
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="relative w-full max-w-4xl bg-[#1a1d24] rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tight">Community <span className="text-teal-400">Settings</span></h3>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Manage Elite Club links and benefits</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-gray-500 hover:text-white transition-all">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Platform Name</label>
                            <input
                                type="text"
                                value={community.name}
                                onChange={e => setCommunity({ ...community, name: e.target.value })}
                                className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-teal-500/50 outline-none transition-all font-medium"
                                placeholder="Elite Talent Club"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Platform Type</label>
                            <select
                                value={community.platform}
                                onChange={e => setCommunity({ ...community, platform: e.target.value })}
                                className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-teal-500/50 outline-none transition-all font-medium text-white"
                            >
                                <option value="Slack">Slack</option>
                                <option value="Discord">Discord</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Invitation Link</label>
                        <input
                            type="text"
                            value={community.invitationLink}
                            onChange={e => setCommunity({ ...community, invitationLink: e.target.value })}
                            className="w-full px-5 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-teal-500/50 outline-none transition-all font-medium"
                            placeholder="https://slack.com/invitation/..."
                        />
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Benefits List</label>
                            <button onClick={addBenefit} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-teal-400 hover:text-teal-300 transition-colors">
                                <Plus size={14} /> Add Benefit
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            {community.benefits.map((benefit, i) => (
                                <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-4">
                                    <div className="flex-1 space-y-4">
                                        <input
                                            type="text"
                                            value={benefit.title}
                                            onChange={e => {
                                                const b = [...community.benefits];
                                                b[i].title = e.target.value;
                                                setCommunity({ ...community, benefits: b });
                                            }}
                                            className="w-full bg-transparent border-b border-white/10 py-1 outline-none focus:border-teal-400 transition-colors font-bold"
                                            placeholder="Benefit Title"
                                        />
                                        <textarea
                                            value={benefit.description}
                                            onChange={e => {
                                                const b = [...community.benefits];
                                                b[i].description = e.target.value;
                                                setCommunity({ ...community, benefits: b });
                                            }}
                                            className="w-full bg-transparent outline-none text-xs text-gray-400 h-16 resize-none"
                                            placeholder="Description..."
                                        />
                                    </div>
                                    <button onClick={() => removeBenefit(i)} className="text-red-400 p-2 hover:bg-red-400/10 rounded-lg transition-all">
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-8 border-t border-white/10 bg-white/[0.02] flex justify-end gap-4">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl hover:bg-white/5 text-gray-400 font-bold uppercase tracking-widest text-[10px]">Cancel</button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-8 py-3 rounded-xl bg-teal-500 text-white font-black uppercase tracking-widest text-[10px] flex items-center gap-2 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : 'Save Settings'} <Save size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CommunitySettingsModal;

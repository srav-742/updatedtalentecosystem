import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ShieldCheck,
    AudioLines,
    Play,
    Pause,
    Search,
    Calendar,
    ChevronRight,
    Clock,
    Music,
    AlertCircle,
    Loader2,
    Database,
    Lock
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../firebase';

const ManageRecordings = () => {
    const [interviews, setInterviews] = useState([]);
    const [selectedInterview, setSelectedInterview] = useState(null);
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filesLoading, setFilesLoading] = useState(false);
    const [error, setError] = useState(null);
    const [currentPlaying, setCurrentPlaying] = useState(null);
    const audioRef = React.useRef(null);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.uid || user._id || user.id;

    useEffect(() => {
        fetchInterviews();
    }, []);

    const fetchInterviews = async () => {
        if (!userId) {
            setError("Authentication required. Please log in as an administrator.");
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`${API_URL}/admin/interviews`, {
                headers: { 'x-user-id': userId }
            });
            setInterviews(res.data);
        } catch (err) {
            console.error("Fetch error:", err);
            setError(err.response?.data?.message || "Failed to load interviews. Make sure you are an admin.");
        } finally {
            setLoading(false);
        }
    };

    const fetchFiles = async (id) => {
        setFilesLoading(true);
        setSelectedInterview(id);
        setFiles([]);
        try {
            const res = await axios.get(`${API_URL}/admin/interviews/${id}`, {
                headers: { 'x-user-id': userId }
            });
            setFiles(res.data);
        } catch (err) {
            console.error("Files fetch error:", err);
        } finally {
            setFilesLoading(false);
        }
    };

    const togglePlay = (fileName) => {
        const audioUrl = `${API_URL}/admin/audio/${selectedInterview}/${fileName}`;

        if (currentPlaying === fileName) {
            audioRef.current.pause();
            setCurrentPlaying(null);
        } else {
            setCurrentPlaying(fileName);
            // We need to set the header for the audio source if we want it to be truly secure,
            // but the browser's <audio> tag doesn't support custom headers for 'src'.
            // However, our backend streamAudio route checks the x-user-id if we were using a proxy,
            // but for now, we'll use a trick: pass the userId in the URL if needed, 
            // OR use a blob URL after fetching with headers.

            playSecurely(audioUrl, fileName);
        }
    };

    const playSecurely = async (url, fileName) => {
        try {
            const response = await fetch(url, {
                headers: { 'x-user-id': userId }
            });
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            if (audioRef.current) {
                audioRef.current.src = blobUrl;
                audioRef.current.play();
                audioRef.current.onended = () => setCurrentPlaying(null);
            }
        } catch (err) {
            console.error("Playback error:", err);
            setCurrentPlaying(null);
        }
    };

    return (
        <div className="min-h-screen bg-[#06080c] text-white p-8 md:p-12 font-sans">
            {/* Header */}
            <header className="max-w-7xl mx-auto mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 text-blue-400 mb-2">
                        <ShieldCheck className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-[0.3em]">Secure Vault Gateway</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter">
                        Manage <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">Recordings</span>
                    </h1>
                </div>

                <div className="flex items-center gap-4">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400">
                            <Database className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Total Interviews</p>
                            <p className="text-lg font-bold">{interviews.length}</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchInterviews}
                        className="bg-white/10 hover:bg-white/20 transition-all p-4 rounded-2xl border border-white/10"
                    >
                        <Clock className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left Panel: Interview List */}
                <div className="lg:col-span-5 space-y-4">
                    <div className="relative mb-6">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Filter by Interview ID..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:border-blue-500/50 transition-all text-sm"
                        />
                    </div>

                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                        {loading ? (
                            <div className="py-20 text-center">
                                <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto mb-4" />
                                <p className="text-gray-500 text-sm italic">Accessing encrypted storage...</p>
                            </div>
                        ) : error ? (
                            <div className="p-8 rounded-3xl bg-red-500/10 border border-red-500/20 text-center">
                                <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
                                <p className="text-red-400 text-sm font-medium">{error}</p>
                            </div>
                        ) : interviews.map((id) => (
                            <motion.div
                                key={id}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={() => fetchFiles(id)}
                                className={`p-5 rounded-3xl border cursor-pointer transition-all flex items-center justify-between group ${selectedInterview === id
                                    ? 'bg-blue-600 border-blue-400 shadow-[0_0_30px_rgba(37,99,235,0.2)]'
                                    : 'bg-white/5 border-white/10 hover:border-white/20'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${selectedInterview === id ? 'bg-white/20' : 'bg-blue-500/10 text-blue-400'
                                        }`}>
                                        <AudioLines className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm tracking-tight">{id}</p>
                                        <p className={`text-[10px] ${selectedInterview === id ? 'text-blue-100' : 'text-gray-500'}`}>
                                            Private Session Data
                                        </p>
                                    </div>
                                </div>
                                <ChevronRight className={`w-5 h-5 transition-transform ${selectedInterview === id ? 'translate-x-1' : 'text-gray-700 group-hover:text-gray-400'
                                    }`} />
                            </motion.div>
                        ))}
                    </div>
                </div>

                {/* Right Panel: File List & Player */}
                <div className="lg:col-span-7">
                    <AnimatePresence mode="wait">
                        {selectedInterview ? (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 min-h-[600px] flex flex-col"
                            >
                                <div className="flex items-center justify-between mb-8 pb-6 border-b border-white/5">
                                    <div>
                                        <h3 className="text-xl font-bold mb-1">Session Recordings</h3>
                                        <p className="text-xs text-gray-500 italic">Interview: {selectedInterview}</p>
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20 text-[10px] font-black uppercase tracking-widest">
                                        <Lock size={10} /> Secure Stream
                                    </div>
                                </div>

                                {filesLoading ? (
                                    <div className="flex-1 flex flex-col items-center justify-center">
                                        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
                                        <p className="text-gray-500 text-sm">Parsing audio metadata...</p>
                                    </div>
                                ) : files.length === 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40">
                                        <Music className="w-16 h-16 mb-4" />
                                        <p className="text-lg font-medium">No audio files found</p>
                                        <p className="text-sm">This interview might not have processed audio yet.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {files.map((file, idx) => (
                                            <div
                                                key={file}
                                                className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between hover:bg-white/10 transition-all"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="text-xs font-mono text-gray-600 w-6">0{idx + 1}</div>
                                                    <div>
                                                        <p className="text-sm font-medium tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] md:max-w-xs">
                                                            {file}
                                                        </p>
                                                        <div className="flex items-center gap-3 mt-1">
                                                            <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                                                <Calendar size={10} /> {new Date(parseInt(file.split('-')[0]) || Date.now()).toLocaleDateString()}
                                                            </div>
                                                            <div className="flex items-center gap-1 text-[10px] text-gray-500">
                                                                <Clock size={10} /> {new Date(parseInt(file.split('-')[0]) || Date.now()).toLocaleTimeString()}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => togglePlay(file)}
                                                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${currentPlaying === file
                                                        ? 'bg-blue-500 text-white shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                                                        : 'bg-white/10 text-gray-400 hover:text-white hover:bg-white/20'
                                                        }`}
                                                >
                                                    {currentPlaying === file ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Hidden Audio Element */}
                                <audio ref={audioRef} className="hidden" />

                                {currentPlaying && (
                                    <div className="mt-auto pt-8">
                                        <div className="p-4 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center gap-4">
                                            <div className="flex gap-1 items-end h-6">
                                                {[...Array(12)].map((_, i) => (
                                                    <motion.div
                                                        key={i}
                                                        animate={{ height: ['30%', '100%', '30%'] }}
                                                        transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.05 }}
                                                        className="w-1 bg-blue-500 rounded-full"
                                                    />
                                                ))}
                                            </div>
                                            <p className="text-xs font-bold text-blue-400">Streaming: <span className="text-white ml-1 font-medium">{currentPlaying}</span></p>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        ) : (
                            <div className="h-full min-h-[600px] flex flex-col items-center justify-center text-center p-12 bg-white/[0.02] border border-dashed border-white/10 rounded-[2.5rem]">
                                <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center mb-8">
                                    <Lock className="w-10 h-10 text-gray-600" />
                                </div>
                                <h3 className="text-2xl font-black mb-4">Secure Audio Portal</h3>
                                <p className="text-gray-500 max-w-sm font-light leading-relaxed">
                                    Select an interview session from the vault to access and audit private audio recordings. All streams are ephemeral and encrypted.
                                </p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
            ` }} />
        </div>
    );
};

export default ManageRecordings;

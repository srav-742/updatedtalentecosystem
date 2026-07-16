import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    User,
    Briefcase,
    Video,
    PlayCircle,
    Home,
    AlertCircle
} from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../firebase';

const PublicInterviewDetail = () => {
    const { applicationId } = useParams();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPublicDetails = async () => {
            setLoading(true);
            setError(null);
            try {
                // Call our unauthenticated public endpoint
                const res = await axios.get(`${API_URL}/interview/public/interview-details/${applicationId}`);
                setData(res.data);
            } catch (err) {
                console.error("Failed to fetch public interview details:", err);
                setError(err.response?.data?.message || 'Failed to load public interview details');
            } finally {
                setLoading(false);
            }
        };

        if (applicationId) {
            fetchPublicDetails();
        }
    }, [applicationId]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0f1115] flex items-center justify-center p-4">
                <div className="bg-[#1a1d24] border border-white/10 rounded-3xl p-12 text-center max-w-md w-full shadow-2xl">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-500 mx-auto mb-6"></div>
                    <h3 className="text-xl font-bold text-white">Loading Interview Video</h3>
                    <p className="text-gray-400 mt-2">Retrieving shared candidate recording...</p>
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-[#0f1115] flex items-center justify-center p-4">
                <div className="bg-[#1a1d24] text-white border border-white/10 rounded-3xl p-12 text-center max-w-md w-full shadow-2xl">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-bold mb-2">Video Link Expired or Invalid</h3>
                    <p className="text-gray-400 mb-8 leading-relaxed">{error || 'This shared video is no longer accessible.'}</p>
                    <Link
                        to="/"
                        className="inline-flex w-full items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-bold px-6 py-3 rounded-xl transition-colors"
                    >
                        <Home size={16} />
                        Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    const { application, job } = data;
    const videoUrl = application.recordingPlaybackUrl || application.recordingUrl;

    return (
        <div className="min-h-screen bg-[#0f1115] py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
            <div className="max-w-4xl w-full bg-[#1a1d24] rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white p-8 sm:p-10 border-b border-white/10">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <Video className="w-8 h-8 text-purple-400" />
                                <h2 className="text-2xl font-black tracking-tight uppercase">Candidate Interview Playback</h2>
                            </div>
                            <p className="text-sm text-gray-400 font-medium">Shared candidate response recording</p>
                        </div>
                    </div>
                </div>

                {/* Candidate Info Cards */}
                <div className="p-6 sm:p-8 bg-black/25 border-b border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-4">
                        <div className="bg-purple-500/10 p-3 rounded-xl shrink-0 border border-purple-500/20 text-purple-400">
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Candidate</div>
                            <div className="font-extrabold text-white text-base mt-0.5">{application.applicantName}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-4">
                        <div className="bg-indigo-500/10 p-3 rounded-xl shrink-0 border border-indigo-500/20 text-indigo-400">
                            <Briefcase className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Position</div>
                            <div className="font-extrabold text-white text-base mt-0.5">{job.title}</div>
                        </div>
                    </div>
                </div>

                {/* Video Recording Section */}
                <div className="p-6 sm:p-8 bg-black/45">
                    {videoUrl ? (
                        <div className="relative aspect-video w-full bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 group">
                            <video
                                controls
                                autoPlay
                                className="w-full h-full object-contain"
                                src={videoUrl}
                            />
                        </div>
                    ) : (
                        <div className="aspect-video w-full bg-white/5 border border-dashed border-white/15 rounded-3xl flex flex-col items-center justify-center p-8 text-center">
                            <AlertCircle className="w-16 h-16 text-amber-500 mb-4 animate-pulse" />
                            <h4 className="text-lg font-bold text-white">No Interview Recording Found</h4>
                            <p className="text-gray-400 text-sm mt-2 max-w-sm">The candidate has not completed or uploaded their interview recording yet.</p>
                        </div>
                    )}
                    {videoUrl && (
                        <div className="mt-4 flex items-center gap-3 text-sm text-gray-400 justify-center">
                            <PlayCircle className="w-4 h-4 text-purple-400" />
                            <span className="font-medium">Use the player controls to play, pause, or adjust volume</span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-black/60 border-t border-white/10 rounded-b-[2.5rem] text-center">
                    <div className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                        Powered by hire1percent AI Recruiter Suite
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicInterviewDetail;

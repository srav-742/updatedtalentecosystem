import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ShieldCheck, Database } from 'lucide-react';

const ADMIN_EMAILS = [
    'sravyaadmin@gmail.com',
    'sravyadhadi@gmail.com',
    'admin@hire1percent.com',
    'hemangi@web3today.io'
];

const AdminQuestionBankRedirect = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const isAdmin = user.role === 'admin' || (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase().trim()));

    useEffect(() => {
        if (!isAdmin) {
            alert('Admin permissions required: Only authorized platform administrators can post or manage questions in the Admin Question Bank.');
            navigate('/recruiter/post-job', { replace: true });
            return;
        }

        // Determine destination URL
        // In local development, the admin dashboard runs on port 5174
        const userParam = encodeURIComponent(JSON.stringify(user));
        const adminUrl = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            ? `http://localhost:5174/admin?tab=question-bank&user=${userParam}`
            : (import.meta.env.VITE_ADMIN_URL || `/admin?tab=question-bank&user=${userParam}`);

        window.location.href = adminUrl;
    }, [isAdmin, navigate]);

    if (!isAdmin) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#f7f4ee] px-4 font-sans">
                <div className="bg-white p-8 rounded-3xl border border-black/10 shadow-lg text-center max-w-md">
                    <ShieldCheck size={40} className="text-red-500 mx-auto mb-3" />
                    <h2 className="text-lg font-bold text-gray-900">Access Restricted</h2>
                    <p className="text-xs text-gray-500 mt-2">
                        Admin permissions required. Only platform administrators can post questions in the Admin Question Bank.
                    </p>
                    <button
                        type="button"
                        onClick={() => navigate('/recruiter/post-job')}
                        className="mt-6 px-6 py-2.5 rounded-xl bg-black text-white text-xs font-bold cursor-pointer hover:bg-gray-800"
                    >
                        Return to Post Job
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f7f4ee] px-4 font-sans">
            <div className="bg-white p-8 rounded-3xl border border-black/10 shadow-lg text-center max-w-md space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center mx-auto shadow-md">
                    <Database size={22} />
                </div>
                <div>
                    <h2 className="text-lg font-bold text-gray-950">Navigating to Admin Dashboard</h2>
                    <p className="text-xs text-gray-500 mt-1">
                        Opening Question Bank management...
                    </p>
                </div>
                <div className="flex items-center justify-center gap-2 pt-2 text-xs font-bold text-gray-700">
                    <Loader2 size={16} className="animate-spin text-teal-600" />
                    <span>Connecting to Admin Panel...</span>
                </div>
            </div>
        </div>
    );
};

export default AdminQuestionBankRedirect;

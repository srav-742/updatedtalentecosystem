import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const NotFound = () => {
    return (
        <div className="min-h-screen bg-[#0c0f16] text-white flex flex-col">
            <Navbar />
            <main className="flex-1 flex items-center justify-center px-6">
                <div className="text-center max-w-xl">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-blue-500/10 border border-blue-500/20 mb-8">
                        <span className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">404</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
                        Page Not Found
                    </h1>
                    <p className="text-gray-400 text-lg leading-relaxed mb-10 max-w-md mx-auto">
                        The page you are looking for does not exist, has been moved, or is temporarily unavailable.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            to="/"
                            className="px-8 py-3.5 bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/20 text-sm"
                        >
                            Go to Homepage
                        </Link>
                        <Link
                            to="/contact"
                            className="px-8 py-3.5 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold rounded-2xl transition-all text-sm"
                        >
                            Contact Support
                        </Link>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default NotFound;

import React from 'react';

const Footer = () => {
    return (
        <footer className="py-12 border-t border-white/10 bg-[#0c0f16]">
            <div className="container mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-lg">H</div>
                        <span className="font-bold bg-clip-text text-transparent bg-gradient-to-r from-white/50 to-white/30 text-sm tracking-widest uppercase">hire1percent</span>
                    </div>

                    <div className="flex items-center space-x-8 text-sm text-gray-500 font-medium">
                        <a href="#elite-talent" className="hover:text-white transition-colors">Elite Talent</a>
                        <a href="#operations" className="hover:text-white transition-colors">Operations</a>
                        <a href="#safety" className="hover:text-white transition-colors">Safety</a>
                        <a href="/admin/recordings" className="hover:text-white transition-colors">Admin Portal</a>
                    </div>

                    <div className="text-gray-600 text-xs">
                        © 2025 hire1percent. All rights reserved.
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;

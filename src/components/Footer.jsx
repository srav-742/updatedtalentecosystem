import React from 'react';

const Footer = () => {
    return (
        <footer className="py-12 border-t border-white/10 bg-[#0c0f16]">
            <div className="container mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-lg">W</div>
                        <span className="font-bold text-white/50 text-sm tracking-widest uppercase">Web3 Talent Eco System</span>
                    </div>

                    <div className="flex items-center space-x-8 text-sm text-gray-500 font-medium">
                        <a href="#" className="hover:text-white transition-colors">About</a>
                        <a href="#" className="hover:text-white transition-colors">Contact</a>
                        <a href="#" className="hover:text-white transition-colors">Terms</a>
                        <a href="#" className="hover:text-white transition-colors">Privacy</a>
                    </div>

                    <div className="text-gray-600 text-xs">
                        © 2025 Web3 Talent Eco System. All rights reserved.
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;


const Footer = ({ theme = 'dark' }) => {
    const isLight = theme === 'light';
    return (
        <footer className={`py-12 ${isLight ? 'border-t border-gray-200 bg-white' : 'border-t border-white/10 bg-[#0c0f16]'}`}>
            <div className="container mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8">
                    <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-lg">H</div>
                        <span className={`font-bold bg-clip-text text-transparent text-sm tracking-widest uppercase ${isLight ? 'bg-gradient-to-r from-gray-800 to-gray-500' : 'bg-gradient-to-r from-white/50 to-white/30'}`}>hire1percent</span>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 text-sm text-gray-500 font-medium">
                        <a href="/pricing" className={isLight ? 'hover:text-gray-900 transition-colors' : 'hover:text-white transition-colors'}>Pricing</a>
                        <a href="/privacy" className={isLight ? 'hover:text-gray-900 transition-colors' : 'hover:text-white transition-colors'}>Privacy</a>
                        <a href="/terms" className={isLight ? 'hover:text-gray-900 transition-colors' : 'hover:text-white transition-colors'}>Terms</a>
                        <a href="/cookies" className={isLight ? 'hover:text-gray-900 transition-colors' : 'hover:text-white transition-colors'}>Cookies</a>
                        <a href="/contact" className={isLight ? 'hover:text-gray-900 transition-colors' : 'hover:text-white transition-colors'}>Contact</a>
                    </div>

                    <div className={`text-xs ${isLight ? 'text-gray-500' : 'text-gray-600'}`}>
                        © 2026 hire1percent. All rights reserved.
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;

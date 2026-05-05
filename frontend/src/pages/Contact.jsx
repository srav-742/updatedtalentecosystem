import React from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageSquare, Shield, Info, MapPin, Send } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Contact = () => {
  return (
    <div className="min-h-screen bg-[#0c0f16] text-white">
      <Navbar />
      
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Contact & Support</h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Have questions about your account, legal concerns, or platform feedback? Our team is here to assist.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-2 gap-12">
            {/* Left: Contact Info */}
            <div className="space-y-8">
              <div className="p-8 rounded-[3rem] bg-white/5 border border-white/10 hover:border-blue-500/30 transition-all group">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                    <Shield className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-bold">Grievance Officer</h2>
                </div>
                <p className="text-gray-400 mb-4 pl-14">
                  For legal disputes or data protection concerns (India IT Act compliance):
                </p>
                <div className="pl-14 space-y-2">
                  <p className="flex items-center gap-2 text-white"><Mail className="w-4 h-4 text-blue-400" /> grievance@hire1percent.com</p>
                  <p className="flex items-center gap-2 text-white"><MapPin className="w-4 h-4 text-blue-400" /> Tech Hub, Bengaluru, India</p>
                </div>
              </div>

              <div className="p-8 rounded-[3rem] bg-white/5 border border-white/10 hover:border-teal-500/30 transition-all group">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-2xl bg-teal-500/20 text-teal-400 group-hover:scale-110 transition-transform">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h2 className="text-2xl font-bold">General Support</h2>
                </div>
                <p className="text-gray-400 mb-4 pl-14">
                  For account issues, job listings, or technical support:
                </p>
                <div className="pl-14 space-y-2">
                  <p className="flex items-center gap-2 text-white"><Mail className="w-4 h-4 text-teal-400" /> support@hire1percent.com</p>
                  <p className="flex items-center gap-2 text-white"><Info className="w-4 h-4 text-teal-400" /> Help Center available 24/7</p>
                </div>
              </div>
            </div>

            {/* Right: Contact Form */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-10 rounded-[3rem] bg-white/5 border border-white/10"
            >
              <h3 className="text-2xl font-bold mb-6">Send us a message</h3>
              <form className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400 ml-4">Full Name</label>
                    <input type="text" className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all" placeholder="John Doe" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-400 ml-4">Email Address</label>
                    <input type="email" className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all" placeholder="john@example.com" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400 ml-4">Subject</label>
                  <select className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all appearance-none text-gray-400">
                    <option>General Inquiry</option>
                    <option>Technical Support</option>
                    <option>Legal / Privacy Concern</option>
                    <option>Recruiter Verification</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400 ml-4">Message</label>
                  <textarea rows="4" className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all" placeholder="How can we help you?"></textarea>
                </div>
                <button type="submit" className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-xl shadow-blue-500/10 flex items-center justify-center gap-2">
                  <Send className="w-4 h-4" />
                  Send Message
                </button>
              </form>
            </motion.div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;

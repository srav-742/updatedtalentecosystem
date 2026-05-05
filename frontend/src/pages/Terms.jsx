import React from 'react';
import { motion } from 'framer-motion';
import { Scale, CheckCircle, AlertTriangle, XCircle, Zap, ShieldCheck } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const Terms = () => {
  const sections = [
    {
      title: "1. Acceptance of Terms",
      icon: <Scale className="w-6 h-6 text-blue-400" />,
      content: "By accessing or using Hire1Percent, you agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree, you may not use the platform."
    },
    {
      title: "2. AI Usage & Disclaimers",
      icon: <Zap className="w-6 h-6 text-yellow-400" />,
      content: "Our platform uses AI to score, rank, and analyze candidates. These scores are for guidance only. Hire1Percent does not guarantee the accuracy of AI assessments, and final hiring decisions are the sole responsibility of the employers."
    },
    {
      title: "3. User Responsibilities",
      icon: <CheckCircle className="w-6 h-6 text-teal-400" />,
      content: "Users must provide accurate information. Recruiters must use the platform for legitimate hiring purposes only. Misrepresentation of skills or identity may lead to account termination."
    },
    {
      title: "4. Prohibited Activities",
      icon: <XCircle className="w-6 h-6 text-red-400" />,
      content: "You agree not to:\n• Scrape or extract data from the platform\n• Reverse engineer AI scoring models\n• Share account credentials\n• Post fraudulent job listings or resumes."
    },
    {
      title: "5. Limitation of Liability",
      icon: <AlertTriangle className="w-6 h-6 text-orange-400" />,
      content: "Hire1Percent is a matching platform. We are not responsible for the conduct of any candidate or employer. We are not liable for any employment disputes or damages arising from platform usage."
    },
    {
      title: "6. Governing Law",
      icon: <ShieldCheck className="w-6 h-6 text-purple-400" />,
      content: "These terms are governed by and construed in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of the courts in [City, State], India."
    }
  ];

  return (
    <div className="min-h-screen bg-[#0c0f16] text-white">
      <Navbar />
      
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm font-medium mb-6">
              <Scale className="w-4 h-4" />
              <span>Legal Agreement</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
              Terms & Conditions
            </h1>
            <p className="text-gray-400 text-lg">
              Please read these terms carefully before using our services.
            </p>
          </motion.div>

          <div className="grid gap-6">
            {sections.map((section, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-all"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-2xl bg-white/5">
                    {section.icon}
                  </div>
                  <h2 className="text-2xl font-bold">{section.title}</h2>
                </div>
                <div className="text-gray-400 leading-relaxed pl-14">
                  {section.content}
                </div>
              </motion.div>
            ))}
          </div>

          <p className="mt-12 text-center text-gray-500 text-sm italic">
            Last Updated: May 5, 2026. Hire1Percent reserves the right to modify these terms at any time.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Terms;

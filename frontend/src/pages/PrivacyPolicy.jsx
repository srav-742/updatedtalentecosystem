
const PrivacyPolicy = () => {
  const sections = [
    {
      title: "1. Introduction",
      icon: <Globe className="w-6 h-6 text-blue-400" />,
      content: "Welcome to Hire1Percent. We are committed to protecting your personal data and your right to privacy. This Privacy Policy explains how we collect, use, and share information when you use our AI-driven recruitment platform."
    },
    {
      title: "2. Information We Collect",
      icon: <FileText className="w-6 h-6 text-teal-400" />,
      content: "We collect information you provide directly to us: \n• Personal identifiers (Name, Email, Phone Number)\n• Professional information (Resume/CV, LinkedIn profile, Job history)\n• Skill assessment data and AI-generated performance scores\n• Account credentials and preferences."
    },
    {
      title: "3. How We Use Your Data",
      icon: <Eye className="w-6 h-6 text-purple-400" />,
      content: "Your data is used to:\n• Match candidates with appropriate job opportunities\n• Provide AI-driven skill scoring and ranking for recruiters\n• Facilitate communication between candidates and employers\n• Improve our AI models and platform functionality."
    },
    {
      title: "4. Data Sharing & Disclosure",
      icon: <Shield className="w-6 h-6 text-red-400" />,
      content: "We share your information with:\n• Verified recruiters and employers on the platform\n• Service providers (Firebase for storage, OpenAI for AI analysis)\n• Legal authorities if required by law."
    },
    {
      title: "5. Your Data Rights",
      icon: <Lock className="w-6 h-6 text-green-400" />,
      content: "Depending on your location (e.g., GDPR, IT Act India), you have the right to:\n• Access the personal data we hold about you\n• Request correction of inaccurate data\n• Request deletion of your data\n• Withdraw consent at any time."
    },
    {
      title: "6. Contact Us",
      icon: <Mail className="w-6 h-6 text-orange-400" />,
      content: "If you have questions about this policy or our privacy practices, please contact our Data Protection Officer at legal@hire1percent.com."
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
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
              <Shield className="w-4 h-4" />
              <span>Security & Privacy First</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
              Privacy Policy
            </h1>
            <p className="text-gray-400 text-lg">
              Last Updated: May 5, 2026 • Version 1.0
            </p>
          </motion.div>

          <div className="space-y-8">
            {sections.map((section, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="p-8 rounded-[2rem] bg-white/5 border border-white/10 hover:border-white/20 transition-all group"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-2xl bg-white/5 group-hover:scale-110 transition-transform">
                    {section.icon}
                  </div>
                  <h2 className="text-2xl font-bold">{section.title}</h2>
                </div>
                <div className="text-gray-400 leading-relaxed whitespace-pre-line pl-14">
                  {section.content}
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            className="mt-20 p-10 rounded-[3rem] bg-gradient-to-br from-blue-600/10 to-teal-600/10 border border-white/10 text-center"
          >
            <h3 className="text-2xl font-bold mb-4">Have questions about your data?</h3>
            <p className="text-gray-400 mb-8">Our legal team is here to help you understand how we protect your information.</p>
            <a 
              href="mailto:legal@hire1percent.com" 
              className="px-8 py-4 rounded-full bg-white text-black font-bold hover:bg-gray-200 transition-all inline-block"
            >
              Contact Legal Team
            </a>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;


const Cookies = () => {
  const cookieTypes = [
    {
      title: "Essential Cookies",
      icon: <ShieldCheck className="w-6 h-6 text-green-400" />,
      description: "Required for the website to function. They handle authentication, security, and basic platform features.",
      status: "Always Active"
    },
    {
      title: "Analytical Cookies",
      icon: <PieChart className="w-6 h-6 text-blue-400" />,
      description: "Help us understand how visitors interact with the site by collecting and reporting information anonymously.",
      status: "Optional"
    },
    {
      title: "Functional Cookies",
      icon: <Activity className="w-6 h-6 text-teal-400" />,
      description: "Enable the website to provide enhanced functionality and personalization (e.g., remembering your language preference).",
      status: "Optional"
    }
  ];

  return (
    <div className="min-h-screen bg-[#0c0f16] text-white">
      <Navbar />
      
      <main className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-6">
              <Cookie className="w-4 h-4" />
              <span>Cookie Transparency</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Cookie Policy</h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic.
            </p>
          </motion.div>

          <div className="space-y-12">
            <section className="p-8 rounded-[3rem] bg-white/5 border border-white/10">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-2xl bg-white/5">
                  <Info className="w-6 h-6 text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold">What are cookies?</h2>
              </div>
              <p className="text-gray-400 leading-relaxed ml-14">
                Cookies are small text files that are stored on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and provide information to the site owners.
              </p>
            </section>

            <div className="grid md:grid-cols-1 gap-6">
              <h2 className="text-2xl font-bold px-4">Types of cookies we use</h2>
              {cookieTypes.map((type, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="p-6 rounded-[2rem] bg-white/5 border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:bg-white/[0.07] transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-2xl bg-white/5">
                      {type.icon}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{type.title}</h3>
                      <p className="text-gray-400 text-sm max-w-md">{type.description}</p>
                    </div>
                  </div>
                  <div className={`px-4 py-1.5 rounded-full text-xs font-bold ${type.status === 'Always Active' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'}`}>
                    {type.status}
                  </div>
                </motion.div>
              ))}
            </div>

            <section className="p-8 rounded-[3rem] bg-white/5 border border-white/10">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-2xl bg-white/5">
                  <Settings className="w-6 h-6 text-orange-400" />
                </div>
                <h2 className="text-2xl font-bold">How to control cookies?</h2>
              </div>
              <p className="text-gray-400 leading-relaxed ml-14">
                You can manage or delete cookies as you wish. You can delete all cookies that are already on your computer and you can set most browsers to prevent them from being placed. However, if you do this, you may have to manually adjust some preferences every time you visit a site and some services and functionalities may not work.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Cookies;

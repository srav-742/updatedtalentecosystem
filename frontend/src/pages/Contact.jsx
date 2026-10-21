import React from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageSquare, Info, Send, Clock, ShieldCheck, ChevronDown } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { generateWebPageSchema, generateBreadcrumbSchema, generateFAQPageSchema } from '../utils/schemas';

const CONTACT_FAQS = [
  {
    question: "What is the fastest way to get support from Hire1Percent?",
    answer: "For technical queries, billing inquiries, or recruiter onboarding, email us at contact@hire1percent.com. Our enterprise support team responds within 2 to 4 business hours."
  },
  {
    question: "Do you offer live technical onboarding for enterprise teams?",
    answer: "Yes. Enterprise accounts receive dedicated technical onboarding, custom ATS integration engineering, and private proctoring calibration sessions."
  },
  {
    question: "Where can candidates report assessment session issues?",
    answer: "Candidates encountering hardware, webcam, or connection interruptions during assessments can reach out directly via web3hire1percent@gmail.com with their session link for instant reset or support."
  }
];

const Contact = () => {
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'Contact', url: '/contact' }
  ];

  const schemas = [
    generateWebPageSchema({
      title: 'Contact Support & Sales - Hire1Percent Technical Recruitment Platform',
      description: 'Get in touch with the Hire1Percent team for enterprise demonstrations, customer support, technical onboarding, or partnership inquiries.',
      url: '/contact',
      breadcrumbs
    }),
    generateFAQPageSchema(CONTACT_FAQS),
    generateBreadcrumbSchema(breadcrumbs)
  ];

  return (
    <div className="min-h-screen bg-[#0c0f16] text-white selection:bg-blue-500/30">
      <SEO 
        title="Contact Us - Technical Support & Enterprise Inquiries | Hire1Percent" 
        description="Get in touch with Hire1Percent for enterprise sales, platform support, and technical assessment inquiries." 
        canonicalUrl="/contact"
        schema={schemas}
      />
      <Navbar />
      
      <main id="main-content" className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          <header className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-teal-500/20 bg-teal-500/8 text-teal-400 text-xs font-black uppercase tracking-wider mb-6">
              Support &amp; Inquiries
            </div>
            <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight">
              Contact <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">Hire1Percent</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
              Have questions regarding enterprise assessments, ATS integrations, or platform support? Our engineering and customer success teams are here to assist.
            </p>
          </header>

          <div className="grid lg:grid-cols-2 gap-12 mb-24">
            {/* Left: Contact Info */}
            <section aria-labelledby="support-channels-heading" className="space-y-8">
              <h2 id="support-channels-heading" className="sr-only">Support Channels</h2>
              <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 hover:border-teal-500/30 transition-all group">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-2xl bg-teal-500/20 text-teal-400 group-hover:scale-110 transition-transform">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold">General &amp; Technical Support</h3>
                </div>
                <p className="text-gray-400 mb-6 pl-14">
                  For account access, test proctoring questions, or platform feedback:
                </p>
                <div className="pl-14 space-y-3">
                  <p className="flex items-center gap-2 text-white">
                    <Mail className="w-4 h-4 text-teal-400" /> 
                    <a href="mailto:contact@hire1percent.com" className="hover:underline">contact@hire1percent.com</a>
                  </p>
                  <p className="flex items-center gap-2 text-gray-400 text-sm">
                    <Clock className="w-4 h-4 text-teal-400" /> Typical response time: Under 4 hours
                  </p>
                </div>
              </div>

              <div className="p-8 rounded-[2.5rem] bg-white/5 border border-white/10 hover:border-blue-500/30 transition-all group">
                <div className="flex items-center gap-4 mb-4">
                  <div className="p-3 rounded-2xl bg-blue-500/20 text-blue-400 group-hover:scale-110 transition-transform">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <h3 className="text-2xl font-bold">Enterprise &amp; Compliance</h3>
                </div>
                <p className="text-gray-400 mb-6 pl-14">
                  For security questionnaires, custom master service agreements (MSAs), and data privacy:
                </p>
                <div className="pl-14 space-y-3">
                  <p className="flex items-center gap-2 text-white">
                    <Mail className="w-4 h-4 text-blue-400" /> 
                    <a href="mailto:contact@hire1percent.com" className="hover:underline">contact@hire1percent.com</a>
                  </p>
                  <p className="flex items-center gap-2 text-gray-400 text-sm">
                    <Info className="w-4 h-4 text-blue-400" /> SOC2 and GDPR compliance documentation available
                  </p>
                </div>
              </div>
            </section>

            {/* Right: Contact Form */}
            <section aria-labelledby="contact-form-heading">
              <div className="p-10 rounded-[2.5rem] bg-white/5 border border-white/10">
                <h2 id="contact-form-heading" className="text-2xl font-bold mb-6">Send Us a Direct Message</h2>
                <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="full-name" className="text-sm font-medium text-gray-400 ml-4 block">Full Name</label>
                      <input id="full-name" type="text" className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all text-white" placeholder="Jane Doe" required />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="email-address" className="text-sm font-medium text-gray-400 ml-4 block">Work Email</label>
                      <input id="email-address" type="email" className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all text-white" placeholder="jane@company.com" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="inquiry-subject" className="text-sm font-medium text-gray-400 ml-4 block">Inquiry Type</label>
                    <select id="inquiry-subject" className="w-full px-6 py-4 rounded-2xl bg-[#111622] border border-white/10 focus:border-blue-500/50 outline-none transition-all text-white">
                      <option>Schedule an Enterprise Platform Demo</option>
                      <option>Technical Assessment &amp; Proctoring Questions</option>
                      <option>ATS Integration Consultation</option>
                      <option>Billing &amp; Subscription Inquiries</option>
                      <option>General Inquiries</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="inquiry-message" className="text-sm font-medium text-gray-400 ml-4 block">Your Message</label>
                    <textarea id="inquiry-message" rows="4" className="w-full px-6 py-4 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all text-white" placeholder="Tell us about your team size, hiring requirements, and current tech stack..." required></textarea>
                  </div>
                  <button type="submit" className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-xl shadow-blue-500/10 flex items-center justify-center gap-2">
                    <Send className="w-4 h-4" />
                    Send Inquiry
                  </button>
                </form>
              </div>
            </section>
          </div>

          {/* Support FAQ Section */}
          <section aria-labelledby="contact-faq-heading" className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 id="contact-faq-heading" className="text-3xl font-extrabold tracking-tight mb-4">
                Frequently Asked Support Questions
              </h2>
              <p className="text-gray-400">
                Quick solutions to common customer and candidate inquiries.
              </p>
            </div>

            <div className="space-y-4">
              {CONTACT_FAQS.map((faq, idx) => (
                <details 
                  key={idx} 
                  open={idx === 0}
                  className="group rounded-2xl bg-white/5 border border-white/8 p-6 transition-all duration-200"
                >
                  <summary className="font-bold text-lg flex items-center justify-between gap-4 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
                    <span>{faq.question}</span>
                    <ChevronDown size={20} className="text-teal-400 transition-transform duration-200 group-open:rotate-180 shrink-0" />
                  </summary>
                  <div className="pt-4 mt-4 border-t border-white/5 text-sm text-gray-300 leading-relaxed">
                    <p>{faq.answer}</p>
                  </div>
                </details>
              ))}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, HelpCircle } from 'lucide-react';

const faqs = [
    {
        question: "How is my IP protected?",
        answer: "All IP and code belong exclusively to the startup from day one. Our contracts ensure full intellectual property ownership and data security under professional legal frameworks."
    },
    {
        question: "What about the timezone overlap?",
        answer: "Our engineers work in overlapping hours to ensure smooth communication and collaboration with your US-based team, fitting perfectly into your agile cycles."
    },
    {
        question: "How is this different from freelancing platforms?",
        answer: "Unlike gig-based platforms or freelancing sites, we provide long-term, full-time engineering team members who are deeply integrated into your company culture and product vision."
    }
];

const FAQItem = ({ question, answer }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border-b border-white/10 last:border-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full py-6 flex items-center justify-between text-left group"
            >
                <span className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                    {question}
                </span>
                <div className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center shrink-0 ml-4 group-hover:border-blue-400 group-hover:text-blue-400 transition-all">
                    {isOpen ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </div>
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <p className="pb-6 text-gray-400 leading-relaxed italic">
                            {answer}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const FounderFAQs = () => {
    return (
        <section id="faq" className="py-24 bg-[#0c0f16]">
            <div className="container mx-auto px-6">
                <div className="max-w-3xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <div className="inline-flex items-center px-4 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/10 text-blue-400 text-sm font-medium mb-6">
                            <HelpCircle className="w-4 h-4 mr-2" />
                            Objection Handling
                        </div>
                        <h2 className="text-4xl font-bold text-white mb-6">Founder FAQs</h2>
                    </motion.div>

                    <div className="p-8 rounded-[2rem] bg-white/5 border border-white/10 backdrop-blur-sm">
                        {faqs.map((faq, i) => (
                            <FAQItem key={i} {...faq} />
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default FounderFAQs;

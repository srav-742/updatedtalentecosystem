import React from "react";
import { motion } from "framer-motion";

const ContentList = ({ content, onSelect, selectedId }) => {
    return (
        <div className="space-y-4">
            {content.map((item, idx) => (
                <motion.div
                    key={item._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    onClick={() => onSelect(item)}
                    className={`p-5 rounded-2xl cursor-pointer transition-all border ${
                        selectedId === item._id 
                        ? 'bg-blue-500/10 border-blue-500/50 shadow-lg shadow-blue-500/10' 
                        : 'bg-white/5 border-white/5 hover:border-white/20 hover:bg-white/10'
                    }`}
                >
                    <div className="flex items-center justify-between mb-3">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${
                            item.source === "Hacker News" ? "bg-orange-500/20 text-orange-400" : "bg-blue-500/20 text-blue-400"
                        }`}>
                            {item.source}
                        </span>
                        <span className={`text-[8px] font-bold uppercase ${item.status === 'posted' ? 'text-teal-400' : 'text-gray-500'}`}>
                            {item.status}
                        </span>
                    </div>

                    <h4 className="text-sm font-bold leading-tight line-clamp-2 mb-2 group-hover:text-blue-400">
                        {item.topicTitle}
                    </h4>
                    
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse" />
                        <span className="text-[9px] text-gray-500 font-medium">Ready for review</span>
                    </div>
                </motion.div>
            ))}
            
            {content.length === 0 && (
                <div className="py-20 text-center opacity-40">
                    <p className="text-sm font-bold uppercase tracking-widest">Archive Empty</p>
                </div>
            )}
        </div>
    );
};

export default ContentList;
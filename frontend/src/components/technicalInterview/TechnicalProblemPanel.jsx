import React, { useState } from 'react';
import { BookOpen, Copy, Check, Terminal, Layers, AlertCircle, CheckCircle2 } from 'lucide-react';

const TechnicalProblemPanel = ({ problem }) => {
    const [copiedIndex, setCopiedIndex] = useState(null);

    if (!problem) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center text-gray-400">
                <AlertCircle size={32} className="mb-3 text-indigo-400 opacity-60 animate-pulse" />
                <p className="text-sm font-semibold">Loading technical problem statement...</p>
            </div>
        );
    }

    const handleCopy = (text, idx) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopiedIndex(idx);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const getDifficultyColor = (diff) => {
        const d = (diff || '').toLowerCase();
        if (d.includes('easy')) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
        if (d.includes('hard')) return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    };

    return (
        <div className="h-full flex flex-col bg-[#0d1117] text-gray-200 border-r border-[#30363d] overflow-y-auto custom-scrollbar select-text">
            {/* Header */}
            <div className="p-6 border-b border-[#30363d] bg-[#161b22]/70 sticky top-0 backdrop-blur z-10">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${getDifficultyColor(problem.difficulty)}`}>
                        {problem.difficulty || 'Medium'}
                    </span>
                    <span className="px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 flex items-center gap-1">
                        <Layers size={11} />
                        {problem.category || 'Technical Problem'}
                    </span>
                    {problem.primaryLanguage && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono text-gray-400 bg-[#21262d] border border-[#30363d]">
                            {problem.primaryLanguage}
                        </span>
                    )}
                </div>

                <h2 className="text-lg md:text-xl font-black text-white tracking-tight leading-snug">
                    {problem.title}
                </h2>
            </div>

            {/* Content Area */}
            <div className="p-6 space-y-6">
                {/* Statement */}
                <div className="space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
                        <BookOpen size={14} className="text-teal-400" />
                        Problem Statement
                    </h3>
                    <div className="text-sm text-gray-300 leading-relaxed font-normal whitespace-pre-wrap space-y-2">
                        {problem.statement}
                    </div>
                </div>

                {/* Input / Output Format */}
                {problem.inputOutput && (
                    <div className="p-4 rounded-xl bg-[#161b22] border border-[#30363d] space-y-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                            <Terminal size={13} /> Input & Output Format
                        </h4>
                        <p className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                            {problem.inputOutput}
                        </p>
                    </div>
                )}

                {/* Examples */}
                {problem.examples && problem.examples.length > 0 && (
                    <div className="space-y-4">
                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">
                            Examples
                        </h3>
                        {problem.examples.map((ex, idx) => (
                            <div
                                key={idx}
                                className="rounded-xl bg-[#161b22] border border-[#30363d] overflow-hidden"
                            >
                                <div className="px-4 py-2 bg-[#21262d]/60 border-b border-[#30363d] flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-gray-300">Example {idx + 1}</span>
                                    <button
                                        onClick={() => handleCopy(ex.input, idx)}
                                        className="text-[10px] font-mono text-gray-400 hover:text-white flex items-center gap-1 transition-colors px-2 py-0.5 rounded hover:bg-[#30363d]"
                                    >
                                        {copiedIndex === idx ? (
                                            <>
                                                <Check size={11} className="text-emerald-400" />
                                                <span className="text-emerald-400">Copied</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy size={11} />
                                                <span>Copy Input</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                                <div className="p-4 space-y-2 font-mono text-xs">
                                    <div>
                                        <span className="text-gray-500 block mb-0.5 font-sans text-[10px] uppercase font-bold tracking-wider">Input:</span>
                                        <div className="bg-[#05080f] p-2.5 rounded-lg border border-[#30363d]/60 text-emerald-300 whitespace-pre-wrap">
                                            {ex.input}
                                        </div>
                                    </div>
                                    <div>
                                        <span className="text-gray-500 block mb-0.5 font-sans text-[10px] uppercase font-bold tracking-wider">Output:</span>
                                        <div className="bg-[#05080f] p-2.5 rounded-lg border border-[#30363d]/60 text-teal-300 whitespace-pre-wrap">
                                            {ex.output}
                                        </div>
                                    </div>
                                    {ex.explanation && (
                                        <div className="pt-2 text-[11px] text-gray-400 font-sans leading-relaxed border-t border-[#30363d]/40">
                                            <strong className="text-gray-300">Explanation:</strong> {ex.explanation}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Constraints */}
                {problem.constraints && problem.constraints.length > 0 && (
                    <div className="p-4 rounded-xl bg-[#161b22] border border-[#30363d] space-y-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
                            Constraints & Notes
                        </h4>
                        <ul className="space-y-1.5 text-xs text-gray-300 list-disc list-inside font-mono">
                            {problem.constraints.map((c, i) => (
                                <li key={i}>{c}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TechnicalProblemPanel;

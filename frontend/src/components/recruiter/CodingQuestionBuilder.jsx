import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Save, Loader2, Plus, Trash2, Code2 } from 'lucide-react';
import axios from 'axios';
import { API_URL } from '../../firebase';

const CodingQuestionBuilder = ({ codingRoundId, question, roundLanguages, timerType, onSave, onClose }) => {
    const isEditing = !!question;

    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        inputFormat: '',
        outputFormat: '',
        constraints: '',
        expectedApproach: '',
        examples: [{ input: '', output: '', explanation: '' }],
        difficulty: 'Medium',
        marks: 10,
        allowedLanguages: [],
        timer: 0
    });

    // Populate form when editing
    useEffect(() => {
        if (question) {
            setFormData({
                title: question.title || '',
                description: question.description || '',
                inputFormat: question.inputFormat || '',
                outputFormat: question.outputFormat || '',
                constraints: question.constraints || '',
                expectedApproach: question.expectedApproach || '',
                examples: question.examples?.length > 0 ? question.examples : [{ input: '', output: '', explanation: '' }],
                difficulty: question.difficulty || 'Medium',
                marks: question.marks || 10,
                allowedLanguages: question.allowedLanguages || [],
                timer: question.timer || 0
            });
        }
    }, [question]);

    // Initialize default timer for new questions
    useEffect(() => {
        if (!question && timerType === 'individual' && formData.timer === 0) {
            setFormData(prev => ({
                ...prev,
                timer: prev.difficulty === 'Easy' ? 15 : prev.difficulty === 'Hard' ? 45 : 30
            }));
        }
    }, [question, timerType, formData.timer]);
    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleExampleChange = (idx, field, value) => {
        const updated = [...formData.examples];
        updated[idx][field] = value;
        setFormData(prev => ({ ...prev, examples: updated }));
    };

    const addExample = () => {
        setFormData(prev => ({
            ...prev,
            examples: [...prev.examples, { input: '', output: '', explanation: '' }]
        }));
    };

    const removeExample = (idx) => {
        if (formData.examples.length <= 1) return;
        setFormData(prev => ({
            ...prev,
            examples: prev.examples.filter((_, i) => i !== idx)
        }));
    };

    const toggleLanguage = (lang) => {
        setFormData(prev => ({
            ...prev,
            allowedLanguages: prev.allowedLanguages.includes(lang)
                ? prev.allowedLanguages.filter(l => l !== lang)
                : [...prev.allowedLanguages, lang]
        }));
    };

    const handleSubmit = async () => {
        if (!formData.title.trim() || !formData.description.trim()) {
            alert('Title and Problem Statement are required');
            return;
        }

        setSaving(true);
        try {
            let res;
            if (isEditing) {
                res = await axios.put(`${API_URL}/coding-assessments/questions/${question._id || question.id}`, formData);
            } else {
                res = await axios.post(`${API_URL}/coding-assessments/questions`, {
                    codingRoundId,
                    ...formData
                });
            }

            if (res.data?.success) {
                onSave(res.data.question, isEditing);
            }
        } catch (error) {
            console.error('Error saving question:', error);
            alert(error.response?.data?.message || 'Failed to save question');
        } finally {
            setSaving(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-start justify-center pt-8 pb-8 overflow-y-auto"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 30, scale: 0.97 }}
                className="w-full max-w-3xl mx-4 bg-zinc-950 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-400 border border-teal-500/20">
                            <Code2 size={20} />
                        </div>
                        <h2 className="text-xl font-bold">{isEditing ? 'Edit Question' : 'Add New Question'}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl hover:bg-white/5 transition-all"
                    >
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                    {/* Title & Difficulty */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-500 mb-2">Question Title *</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={(e) => handleChange('title', e.target.value)}
                                placeholder="e.g. Reverse Linked List"
                                className="w-full px-5 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-2">Difficulty</label>
                            <div className="flex gap-2">
                                {['Easy', 'Medium', 'Hard'].map(d => (
                                    <button
                                        key={d}
                                        type="button"
                                        onClick={() => {
                                            const prevDiff = formData.difficulty;
                                            const prevDefault = prevDiff === 'Easy' ? 15 : prevDiff === 'Hard' ? 45 : 30;
                                            handleChange('difficulty', d);
                                            // Auto-update timer if it's 0 or the previous default value
                                            if (timerType === 'individual') {
                                                if (formData.timer === 0 || formData.timer === prevDefault) {
                                                    handleChange('timer', d === 'Easy' ? 15 : d === 'Hard' ? 45 : 30);
                                                }
                                            }
                                        }}
                                        className={`flex-1 px-3 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${
                                            formData.difficulty === d
                                                ? d === 'Easy' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                                    : d === 'Medium' ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                                    : 'bg-red-500/10 border-red-500/30 text-red-400'
                                                : 'bg-white/5 border-white/10 text-gray-500 hover:bg-white/10'
                                        }`}
                                    >
                                        {d}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Problem Statement */}
                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-2">Problem Statement *</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => handleChange('description', e.target.value)}
                            rows="5"
                            placeholder="Write a function that reverses a singly linked list..."
                            className="w-full px-5 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all resize-none text-sm"
                        />
                    </div>

                    {/* Input / Output Format */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-2">Input Format</label>
                            <textarea
                                value={formData.inputFormat}
                                onChange={(e) => handleChange('inputFormat', e.target.value)}
                                rows="3"
                                placeholder="Describe the input format..."
                                className="w-full px-5 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all resize-none text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-2">Output Format</label>
                            <textarea
                                value={formData.outputFormat}
                                onChange={(e) => handleChange('outputFormat', e.target.value)}
                                rows="3"
                                placeholder="Describe the expected output format..."
                                className="w-full px-5 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all resize-none text-sm"
                            />
                        </div>
                    </div>

                    {/* Constraints */}
                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-2">Constraints</label>
                        <textarea
                            value={formData.constraints}
                            onChange={(e) => handleChange('constraints', e.target.value)}
                            rows="2"
                            placeholder="e.g. 1 ≤ n ≤ 10^5, nodes contain integer values"
                            className="w-full px-5 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all resize-none text-sm"
                        />
                    </div>

                    {/* Examples */}
                    <div>
                        <div className="flex items-center justify-between mb-3">
                            <label className="block text-sm font-medium text-gray-500">Examples</label>
                            <button
                                type="button"
                                onClick={addExample}
                                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-xs font-bold transition-colors"
                            >
                                <Plus size={14} /> Add Example
                            </button>
                        </div>
                        <div className="space-y-4">
                            {formData.examples.map((ex, idx) => (
                                <div key={idx} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 relative">
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Example {idx + 1}</span>
                                        {formData.examples.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => removeExample(idx)}
                                                className="p-1 rounded-lg hover:bg-red-500/10 transition-all"
                                            >
                                                <Trash2 size={14} className="text-gray-500 hover:text-red-400" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">Input</label>
                                            <textarea
                                                value={ex.input}
                                                onChange={(e) => handleExampleChange(idx, 'input', e.target.value)}
                                                rows="2"
                                                placeholder="[1, 2, 3, 4, 5]"
                                                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all resize-none text-xs font-mono"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">Output</label>
                                            <textarea
                                                value={ex.output}
                                                onChange={(e) => handleExampleChange(idx, 'output', e.target.value)}
                                                rows="2"
                                                placeholder="[5, 4, 3, 2, 1]"
                                                className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all resize-none text-xs font-mono"
                                            />
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-1">Explanation (optional)</label>
                                        <input
                                            type="text"
                                            value={ex.explanation}
                                            onChange={(e) => handleExampleChange(idx, 'explanation', e.target.value)}
                                            placeholder="Reverse the pointers of each node..."
                                            className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all text-xs"
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Expected Approach */}
                    <div>
                        <label className="block text-sm font-medium text-gray-500 mb-2">Expected Approach (for AI evaluation)</label>
                        <textarea
                            value={formData.expectedApproach}
                            onChange={(e) => handleChange('expectedApproach', e.target.value)}
                            rows="3"
                            placeholder="Iterative pointer reversal with O(n) time and O(1) space complexity..."
                            className="w-full px-5 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all resize-none text-sm"
                        />
                        <p className="mt-1.5 text-[10px] text-gray-600 italic">This is only visible to AI for evaluation, not shown to candidates.</p>
                    </div>

                    {/* Marks & Timer */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-2">Marks</label>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                value={formData.marks}
                                onChange={(e) => handleChange('marks', Number(e.target.value))}
                                className="w-full px-5 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all text-sm"
                            />
                        </div>
                        {timerType === 'individual' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-500 mb-2">Time Limit (minutes)</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="180"
                                    value={formData.timer}
                                    onChange={(e) => handleChange('timer', Number(e.target.value))}
                                    className="w-full px-5 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-blue-500/50 outline-none transition-all text-sm"
                                />
                            </div>
                        )}
                    </div>

                    {/* Allowed Languages (subset of round languages) */}
                    {roundLanguages?.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-2">
                                Allowed Languages <span className="text-gray-600">(leave empty for all)</span>
                            </label>
                            <div className="flex flex-wrap gap-2">
                                {roundLanguages.map(lang => (
                                    <button
                                        key={lang}
                                        type="button"
                                        onClick={() => toggleLanguage(lang)}
                                        className={`px-3 py-1.5 rounded-xl border text-[10px] font-bold uppercase tracking-widest transition-all ${
                                            formData.allowedLanguages.includes(lang)
                                                ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                                                : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300'
                                        }`}
                                    >
                                        {lang}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-white/5">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 font-bold text-sm transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="px-8 py-3 bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white rounded-2xl font-bold flex items-center gap-2 transition-all active:scale-95 shadow-lg shadow-teal-500/20 text-sm"
                    >
                        {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {isEditing ? 'Update Question' : 'Save Question'}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
};

export default CodingQuestionBuilder;

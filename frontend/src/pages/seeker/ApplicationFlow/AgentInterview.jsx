// frontend/src/pages/seeker/ApplicationFlow/AgentInterview.jsx

import { useState, useRef, useEffect } from "react";
import { Mic, StopCircle, Volume2, Sparkles, Cpu, Send, Loader2, ChevronLeft, User, MessageCircle, Target } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import AgentSelector from "../../../components/AgentSelector";

// --- Radar Chart Component ---
function RadarChart({ categories }) {
  const size = 500;
  const center = size / 2;
  const radius = size * 0.28; // Increased graph size
  const angleStep = (Math.PI * 2) / categories.length;

  const getPoint = (score, index, scale = 1) => {
    // scale is current radius as % of max (10)
    const r = (score / 10) * radius * scale;
    const angle = index * angleStep - Math.PI / 2; // Start from top
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle)
    };
  };

  // Paths for background polygons
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1];
  const gridPaths = gridLevels.map(level => (
    categories.map((_, i) => {
      const p = getPoint(10, i, level);
      return `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`;
    }).join(' ') + ' Z'
  ));

  // Path for the data area
  const dataPath = categories.map((cat, i) => {
    const p = getPoint(Math.max(1, cat.score), i);
    return `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`;
  }).join(' ') + ' Z';

  return (
    <div className="relative w-full aspect-square flex items-center justify-center select-none overflow-visible px-4">
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {/* Background Grids */}
        {gridPaths.map((path, i) => (
          <path 
            key={i} 
            d={path} 
            fill="none" 
            stroke={i === 4 ? "#e2e8f0" : "#f1f5f9"} 
            strokeWidth="1" 
          />
        ))}
        
        {/* Axis Lines */}
        {categories.map((_, i) => {
          const p = getPoint(10, i);
          return (
            <line 
              key={i} 
              x1={center} y1={center} 
              x2={p.x} y2={p.y} 
              stroke="#f1f5f9" 
              strokeWidth="1" 
            />
          );
        })}

        {/* Data Area */}
        <motion.path 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          d={dataPath}
          fill="rgba(124, 58, 237, 0.15)"
          stroke="#7c3aed"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        
        {/* Points */}
        {categories.map((cat, i) => {
          const p = getPoint(cat.score, i);
          return (
            <motion.circle 
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              cx={p.x} cy={p.y} r="4" 
              fill="#7c3aed"
              className="drop-shadow-sm"
            />
          );
        })}

        {/* Labels with adaptive positioning */}
        {categories.map((cat, i) => {
          const p = getPoint(14.5, i); // Generous offset from the graph axes
          let textAnchor = "middle";
          if (p.x < center - 20) textAnchor = "end";
          if (p.x > center + 20) textAnchor = "start";

          return (
            <text 
              key={i}
              x={p.x} y={p.y}
              fontSize="12" // Slightly larger for clarity
              fontWeight="800"
              fill="#334155"
              textAnchor={textAnchor}
              dominantBaseline="middle"
              className="uppercase tracking-tight"
            >
              {/* Simple word wrap: split by space or ampersand if label is long */}
              {cat.label.length > 15 && cat.label.includes(' ') ? (
                cat.label.split(' ').map((word, idx) => (
                  <tspan x={p.x} dy={idx === 0 ? -6 : 12} key={idx}>{word}</tspan>
                ))
              ) : (
                cat.label
              )}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export default function AgentInterview() {
  const [phase, setPhase] = useState("select");   // select | interview | complete
  const [sessionId, setSessionId] = useState(null);
  const [roleName, setRoleName] = useState("");
  const [messages, setMessages] = useState([]);   // { role: "agent"|"user", text }
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [displayText, setDisplayText] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");

  const bottomRef = useRef(null);
  const audioPlayerRef = useRef(new Audio());
  const typewriterIntervalRef = useRef(null);
  const recognitionRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, displayText]);

  useEffect(() => {
    return () => {
      if (typewriterIntervalRef.current) clearInterval(typewriterIntervalRef.current);
      audioPlayerRef.current.pause();
    };
  }, []);

  const typeText = (text, onFinish) => {
    if (!text) return;
    let i = 0;
    setDisplayText("");
    if (typewriterIntervalRef.current) clearInterval(typewriterIntervalRef.current);

    typewriterIntervalRef.current = setInterval(() => {
      i++;
      if (i <= text.length) {
        setDisplayText(text.substring(0, i));
      } else {
        clearInterval(typewriterIntervalRef.current);
        if (onFinish) onFinish();
      }
    }, 25);
  };

  const playAudioAndType = (audioBase64, text) => {
    setIsSpeaking(true);
    setDisplayText("");

    const speakInBrowser = () => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => {
        setIsSpeaking(false);
        setMessages(prev => [...prev, { role: "agent", text }]);
        setDisplayText("");
      };
      // For browser TTS, reveal text while speaking
      let charIdx = 0;
      const interval = setInterval(() => {
        charIdx++;
        setDisplayText(text.substring(0, charIdx));
        if (charIdx >= text.length) clearInterval(interval);
      }, 30);
      window.speechSynthesis.speak(utterance);
    };

    const startTyping = () => {
      typeText(text, () => {
        setIsSpeaking(false);
        setMessages(prev => [...prev, { role: "agent", text }]);
        setDisplayText("");
      });
    };

    if (!audioBase64 || audioBase64.length < 100) {
      speakInBrowser();
      return;
    }

    try {
      const audioBlob = new Blob(
        [Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0))],
        { type: "audio/mpeg" }
      );
      const url = URL.createObjectURL(audioBlob);
      audioPlayerRef.current.src = url;
      audioPlayerRef.current.onplay = () => {
        // Only start typing when audio actually plays
        startTyping();
      };
      audioPlayerRef.current.onended = () => {
        // Ensure state clears even if typing finished earlier
        setIsSpeaking(false);
      };
      audioPlayerRef.current.onerror = (e) => {
        console.error("Audio playback error:", e);
        speakInBrowser();
      };
      audioPlayerRef.current.play().catch(err => {
        console.warn("Audio play blocked:", err);
        speakInBrowser();
      });
    } catch (e) {
      speakInBrowser();
    }
  };


  async function handleSelectRole(roleKey) {
    setLoading(true);
    try {
      const res = await axios.post("/api/agent/start", { agentRole: roleKey });
      setSessionId(res.data.sessionId);
      setRoleName(res.data.roleName);
      setPhase("interview");
      playAudioAndType(res.data.audio, res.data.message);
    } catch (e) {
      alert("Failed to start session. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(manualText = "") {
    const userText = (manualText || input || transcript).trim();
    if (!userText || loading || isSpeaking) return;

    setInput("");
    setTranscript("");
    setMessages(prev => [...prev, { role: "user", text: userText }]);
    setLoading(true);

    try {
      const res = await axios.post("/api/agent/respond", { sessionId, userMessage: userText });
      
      if (res.data.isComplete) {
        const evalRes = await axios.post("/api/agent/evaluate", { sessionId });
        setEvaluation(evalRes.data);
        setPhase("complete");
      } else {
        playAudioAndType(res.data.audio, res.data.message);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: "agent", text: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  const toggleRecording = () => {
    if (recording) {
      recognitionRef.current?.stop();
      setRecording(false);
      return;
    }

    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("Voice recognition not supported in this browser.");
      return;
    }

    const rec = new SpeechRec();
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (e) => {
      let full = "";
      for (let i = 0; i < e.results.length; i++) full += e.results[i][0].transcript;
      setTranscript(full);
    };
    rec.onend = () => setRecording(false);
    
    recognitionRef.current = rec;
    rec.start();
    setRecording(true);
  };

  if (phase === "select") {
    return <AgentSelector onSelectRole={handleSelectRole} />;
  }

  if (phase === "complete") {
    let parsedEval = null;
    try {
      // Handle potential markdown code blocks
      const cleanJson = evaluation?.evaluation?.replace(/```json|```/g, "").trim();
      parsedEval = JSON.parse(cleanJson);
    } catch (e) {
      console.error("Failed to parse evaluation JSON:", e);
    }

    // Fallback if parsing fails or structure is old
    if (!parsedEval || !parsedEval.categories) {
      return (
        <div className="max-w-3xl mx-auto px-6 py-12">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden"
          >
            <div className="bg-violet-600 px-8 py-10 text-white">
              <h2 className="text-3xl font-bold mb-2">Interview Conclusion</h2>
              <p className="opacity-90">{roleName} · Generated Evaluation</p>
            </div>
            <div className="p-8">
              <div className="bg-violet-50 rounded-2xl p-6 mb-8 text-gray-800 leading-relaxed italic border-l-4 border-violet-400">
                "{evaluation?.evaluation}"
              </div>
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-gray-50 rounded-xl text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Duration</p>
                  <p className="font-semibold text-gray-800">{evaluation?.duration}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Status</p>
                  <p className="font-semibold text-green-600">Completed</p>
                </div>
              </div>
              <button
                onClick={() => { setPhase("select"); setMessages([]); setEvaluation(null); }}
                className="w-full py-4 bg-violet-600 text-white rounded-2xl font-semibold hover:bg-violet-700 transition-all shadow-lg shadow-violet-200"
              >
                Start Another Session
              </button>
            </div>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Content Column */}
          <div className="lg:col-span-8 space-y-8">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[40px] shadow-2xl shadow-violet-100 overflow-hidden border border-gray-50"
            >
              {/* Header */}
              <div className="bg-gradient-to-br from-violet-600 to-indigo-700 p-10 text-white">
                <div className="flex justify-between items-center mb-6">
                  <span className="px-4 py-1.5 bg-white/10 rounded-full text-xs font-bold tracking-widest uppercase border border-white/20">
                    Candidate Report
                  </span>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                    <span className="text-xs font-bold text-violet-200">VERIFIED BY AI</span>
                  </div>
                </div>
                <h2 className="text-4xl font-black mb-2 leading-tight">{roleName} Interview</h2>
                <p className="text-violet-100/80 font-medium">Detailed competency assessment for the role.</p>
              </div>

              <div className="p-10">
                {/* Summary */}
                <div className="mb-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
                      <MessageCircle size={18} />
                    </div>
                    <h3 className="font-bold text-gray-800 text-lg">Executive Summary</h3>
                  </div>
                  <p className="text-lg text-gray-600 leading-relaxed italic border-l-4 border-violet-200 pl-6">
                    "{parsedEval.summary}"
                  </p>
                </div>

                {/* Score Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {parsedEval.categories.map((cat, idx) => (
                    <motion.div 
                      key={idx}
                      whileHover={{ scale: 1.02 }}
                      className="p-6 rounded-[24px] bg-gray-50 border border-transparent hover:border-violet-100 hover:bg-white hover:shadow-xl hover:shadow-violet-100/40 transition-all flex gap-5"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-violet-600 font-black text-xl">
                        {cat.score}
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800 mb-1">{cat.label}</h4>
                        <p className="text-xs text-gray-400 leading-relaxed font-medium mb-2">{cat.feedback}</p>
                        <div className="h-1 bg-gray-200 rounded-full overflow-hidden w-24">
                          <div className="h-full bg-violet-600" style={{ width: `${cat.score * 10}%` }}></div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Bottom Grid for Strengths/Improvements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-white rounded-[32px] p-8 shadow-xl shadow-gray-100 border border-gray-50"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><Sparkles size={20} /></div>
                  <h4 className="font-bold text-gray-800 text-lg">Peak Competencies</h4>
                </div>
                <div className="space-y-3">
                  {parsedEval.strengths.map((s, i) => (
                    <div key={i} className="flex gap-3 text-sm font-medium text-gray-600 p-3 bg-emerald-50/20 rounded-2xl border border-emerald-50/50">
                      <span className="text-emerald-500 font-bold">✓</span>
                      {s}
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-white rounded-[32px] p-8 shadow-xl shadow-gray-100 border border-gray-50"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl"><Target size={20} /></div>
                  <h4 className="font-bold text-gray-800 text-lg">Growth Areas</h4>
                </div>
                <div className="space-y-3">
                  {parsedEval.improvements.map((s, i) => (
                    <div key={i} className="flex gap-3 text-sm font-medium text-gray-600 p-3 bg-amber-50/20 rounded-2xl border border-amber-50/50">
                      <span className="text-amber-500 font-bold">!</span>
                      {s}
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          </div>

          {/* Sidebar Area - Visualization */}
          <div className="lg:col-span-4 space-y-8">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white rounded-[40px] p-8 shadow-2xl shadow-violet-100 border border-gray-50 sticky top-8"
            >
              <div className="text-center mb-8">
                <p className="text-[10px] uppercase font-black tracking-widest text-violet-400 mb-2">Technical Persona</p>
                <h3 className="font-black text-2xl text-gray-800">Skill Graph</h3>
              </div>
              
              <RadarChart categories={parsedEval.categories} />

              <div className="mt-8 pt-8 border-t border-gray-50">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">Benchmarked Score</span>
                  <span className="px-3 py-1 bg-violet-600 text-white rounded-full text-sm font-black italic shadow-lg shadow-violet-200">
                    TOP {Math.round(100 - parsedEval.overallScore * 8)}%
                  </span>
                </div>
                
                <div className="flex items-center gap-4 p-4 bg-violet-50 rounded-[28px] border border-violet-100">
                   <div className="w-16 h-16 rounded-2xl bg-white flex flex-col items-center justify-center shadow-inner">
                      <span className="text-2xl font-black text-violet-600 leading-none">{parsedEval.overallScore}</span>
                      <span className="text-[10px] font-bold text-gray-300">/10</span>
                   </div>
                   <div>
                      <h5 className="font-bold text-gray-800 text-sm">Overall Rank</h5>
                      <p className="text-[11px] text-gray-500 font-medium">Exceeds domain averages</p>
                   </div>
                </div>

                <button
                  onClick={() => { setPhase("select"); setMessages([]); setEvaluation(null); }}
                  className="w-full mt-8 py-5 bg-gray-900 text-white rounded-[28px] font-bold hover:bg-black transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 group"
                >
                  <Sparkles size={18} className="text-violet-400 group-hover:animate-spin" />
                  Try New Session
                </button>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] max-w-4xl mx-auto px-4 bg-[#fcfcff]">
      {/* Header */}
      <div className="py-6 flex items-center justify-between border-b border-gray-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-violet-100 rounded-2xl flex items-center justify-center text-violet-600">
            <Cpu size={24} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">{roleName}</h2>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isSpeaking ? 'bg-blue-400 animate-pulse' : loading ? 'bg-amber-400' : 'bg-green-400'}`}></span>
              <span className="text-[10px] text-gray-400 uppercase tracking-widest font-medium">
                {isSpeaking ? 'Agent Speaking' : loading ? 'Agent Thinking' : 'Live Session'}
              </span>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setPhase("select")}
          className="text-gray-400 hover:text-gray-600 transition p-2"
        >
          <ChevronLeft size={20} />
        </button>
      </div>

      {/* Chat Display */}
      <div className="flex-1 overflow-y-auto py-8 space-y-6 px-2 custom-scrollbar">
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: msg.role === "user" ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center
                  ${msg.role === "user" ? "bg-violet-600 text-white" : "bg-gray-200 text-gray-500"}`}>
                  {msg.role === "user" ? <User size={14} /> : <Cpu size={14} />}
                </div>
                <div className={`px-5 py-4 rounded-3xl text-sm leading-relaxed whitespace-pre-wrap shadow-sm
                  ${msg.role === "user"
                    ? "bg-violet-600 text-white rounded-tr-sm"
                    : "bg-white text-gray-800 border border-gray-100 rounded-tl-sm"}`}>
                  {msg.text}
                </div>
              </div>
            </motion.div>
          ))}
          
          {(displayText || isSpeaking) && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex justify-start"
            >
              <div className="flex gap-3 max-w-[85%]">
                <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center bg-violet-100 text-violet-600 animate-pulse">
                  <Cpu size={14} />
                </div>
                <div className="px-5 py-4 rounded-3xl rounded-tl-sm text-sm leading-relaxed whitespace-pre-wrap bg-white border border-violet-100 text-gray-800 shadow-md shadow-violet-50">
                  {displayText || "..."}
                  {isSpeaking && <span className="inline-block w-1.5 h-4 bg-violet-400 ml-1 animate-pulse" />}
                </div>
              </div>
            </motion.div>
          )}

          {loading && !isSpeaking && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="flex justify-start pl-11"
            >
              <div className="flex gap-1.5 py-4">
                <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce"></span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input Area */}
      <div className="py-8 border-t border-gray-100 bg-white">
        {transcript && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 bg-violet-50 rounded-2xl text-sm text-violet-700 italic border border-violet-100"
          >
            "{transcript}"
          </motion.div>
        )}
        <div className="flex items-end gap-3 bg-gray-50 p-2 rounded-3xl border border-gray-200 focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-400/5 transition-all">
          <button 
            onClick={toggleRecording}
            className={`p-3 rounded-2xl transition-all ${recording ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-gray-400 hover:text-violet-600 shadow-sm'}`}
          >
            {recording ? <StopCircle size={20} /> : <Mic size={20} />}
          </button>
          
          <textarea
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-3 px-2 resize-none max-h-32"
            placeholder={recording ? "Listening..." : "Type your answer..."}
            rows={1}
            value={input || transcript}
            onChange={e => setInput(e.target.value)}
            disabled={loading || isSpeaking}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          />

          <button
            onClick={() => handleSend()}
            disabled={loading || isSpeaking || (!input.trim() && !transcript.trim())}
            className="p-3 bg-violet-600 text-white rounded-2xl hover:bg-violet-700 disabled:opacity-30 disabled:hover:bg-violet-600 shadow-lg shadow-violet-200 transition-all font-medium"
          >
            {loading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </div>
        <p className="text-[10px] text-gray-400 mt-3 text-center uppercase tracking-widest font-medium">
          Powered by TalentEco AI • Voice Optimized
        </p>
      </div>
    </div>
  );
}


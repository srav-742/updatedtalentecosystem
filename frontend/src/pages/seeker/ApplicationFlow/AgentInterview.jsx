// frontend/src/pages/seeker/ApplicationFlow/AgentInterview.jsx

import { useState, useRef, useEffect } from "react";
import { Mic, StopCircle, Volume2, Sparkles, Cpu, Send, Loader2, ChevronLeft, User, MessageCircle, Target, AlertTriangle, VideoOff, Printer, FileText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import AgentSelector from "../../../components/AgentSelector";
import { API_URL } from "../../../firebase";

// --- Radar Chart Component ---
function RadarChart({ categories }) {
  const size = 500;
  const center = size / 2;
  const radius = size * 0.28; 
  const angleStep = (Math.PI * 2) / (categories?.length || 4);

  const getPoint = (score, index, scale = 1) => {
    const r = (score / 10) * radius * scale;
    const angle = index * angleStep - Math.PI / 2;
    return {
      x: center + r * Math.cos(angle),
      y: center + r * Math.sin(angle)
    };
  };

  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1];
  const gridPaths = gridLevels.map(level => (
    (categories || []).map((_, i) => {
      const p = getPoint(10, i, level);
      return `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`;
    }).join(' ') + ' Z'
  ));

  const dataPath = (categories || []).map((cat, i) => {
    const p = getPoint(Math.max(1, cat.score || 0), i);
    return `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`;
  }).join(' ') + ' Z';

  return (
    <div className="relative w-full aspect-square flex items-center justify-center select-none overflow-visible px-4">
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {gridPaths.map((path, i) => (
          <path key={i} d={path} fill="none" stroke={i === 4 ? "#e2e8f0" : "#f1f5f9"} strokeWidth="1" />
        ))}
        {(categories || []).map((_, i) => {
          const p = getPoint(10, i);
          return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="#f1f5f9" strokeWidth="1" />;
        })}
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
        {(categories || []).map((cat, i) => {
          const p = getPoint(cat.score || 0, i);
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
        {(categories || []).map((cat, i) => {
          const p = getPoint(14.5, i);
          let textAnchor = "middle";
          if (p.x < center - 20) textAnchor = "end";
          if (p.x > center + 20) textAnchor = "start";
          return (
            <text key={i} x={p.x} y={p.y} fontSize="12" fontWeight="800" fill="#334155" textAnchor={textAnchor} dominantBaseline="middle" className="uppercase tracking-tight">
              {cat.label && cat.label.length > 15 && cat.label.includes(' ') ? (
                cat.label.split(' ').map((word, idx) => (
                  <tspan x={p.x} dy={idx === 0 ? -6 : 12} key={idx}>{word}</tspan>
                ))
              ) : (
                cat.label || 'Metric'
              )}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export default function AgentInterview() {
  const [user] = useState(() => JSON.parse(localStorage.getItem("user") || "{}"));
  const [phase, setPhase] = useState("select");   
  const [sessionId, setSessionId] = useState(null);
  const [roleKey, setRoleKey] = useState("");
  const [roleName, setRoleName] = useState("");
  const [messages, setMessages] = useState([]);   
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [evaluation, setEvaluation] = useState(null);
  const [displayText, setDisplayText] = useState("");
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [resumeFile, setResumeFile] = useState(null);

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
    }, 10);
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
      let charIdx = 0;
      const interval = setInterval(() => {
        charIdx++;
        setDisplayText(text.substring(0, charIdx));
        if (charIdx >= text.length) clearInterval(interval);
      }, 12);
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
      audioPlayerRef.current.onplay = () => startTyping();
      audioPlayerRef.current.onended = () => setIsSpeaking(false);
      audioPlayerRef.current.onerror = () => speakInBrowser();
      audioPlayerRef.current.play().catch(() => speakInBrowser());
    } catch (e) {
      speakInBrowser();
    }
  };

  async function handleSelectRole(selectedKey) {
    setRoleKey(selectedKey);
    setPhase("resume");
  }

  async function handleStartSession() {
    setLoading(true);
    if (resumeFile) {
      const reader = new FileReader();
      reader.onloadend = async () => startApiCall(reader.result, resumeText);
      reader.readAsDataURL(resumeFile);
    } else {
      await startApiCall(null, resumeText);
    }
  }

  async function startApiCall(base64, text) {
    try {
      const res = await axios.post(`${API_URL}/agent/start`, {
        agentRole: roleKey,
        resumeBase64: base64,
        resumeText: text
      });
      setSessionId(res.data.sessionId);
      setRoleName(res.data.roleName);
      setPhase("interview");
      playAudioAndType(res.data.audio, res.data.message);
    } catch (e) {
      alert("Failed to start session.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(manualText = "") {
    const userText = (manualText || input || transcript).trim();
    if (!userText || loading) return;

    setInput("");
    setTranscript("");
    setMessages(prev => [...prev, { role: "user", text: userText }]);
    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/agent/respond`, { sessionId, userMessage: userText });
      if (res.data.isComplete) {
        const evalRes = await axios.post(`${API_URL}/agent/evaluate`, { sessionId });
        setEvaluation(evalRes.data);
        setPhase("complete");
      } else {
        playAudioAndType(res.data.audio, res.data.message);
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: "agent", text: "Error. Try again." }]);
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
    if (!SpeechRec) return alert("Not supported.");
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

  if (phase === "select") return <AgentSelector onSelectRole={handleSelectRole} />;
  if (phase === "resume") {
    return (
      <div className="max-w-2xl mx-auto px-6 py-20 text-center">
        <div className="w-16 h-16 bg-[#f4efe6] text-gray-700 rounded-3xl mx-auto flex items-center justify-center mb-6 border border-black/10"><User size={32} /></div>
        <h2 className="text-3xl font-black text-gray-800 mb-4">Provide Your Resume</h2>
        <div className="bg-white rounded-[32px] shadow-xl p-8 mb-8 text-left border border-black/10">
          <input type="file" accept=".pdf" onChange={(e) => setResumeFile(e.target.files[0])} className="w-full text-sm text-gray-500 mb-6" />
          <textarea value={resumeText} onChange={(e) => setResumeText(e.target.value)} placeholder="Or paste your resume text here..." className="w-full h-40 p-4 bg-gray-50 rounded-2xl border border-gray-100 text-sm" />
          <button onClick={handleStartSession} disabled={loading} className="w-full mt-6 py-4 bg-gray-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all">
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />} Start Interview
          </button>
        </div>
      </div>
    );
  }

  if (phase === "complete") {
    const rawJson = evaluation?.evaluation || "{}";
    let parsedEval = {};
    try {
      parsedEval = JSON.parse(rawJson);
    } catch (e) {
      console.error("Parse error:", e);
    }

    if (!parsedEval || !parsedEval.categories) {
       return (
         <div className="max-w-4xl mx-auto p-10 text-center">
           <h2 className="text-2xl font-bold mb-4">Interview Complete</h2>
           <p className="text-gray-600 mb-8">We are processing your final evaluation. Please refresh if it doesn't appear.</p>
           <pre className="text-left bg-gray-100 p-4 rounded-xl text-xs overflow-auto max-h-96">{rawJson}</pre>
           <button onClick={() => window.location.reload()} className="mt-8 px-8 py-3 bg-violet-600 text-white rounded-xl font-bold">Refresh Results</button>
         </div>
       );
    }

    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <style>{`
          @media print {
            .no-print { display: none !important; }
            body { background: white !important; color: black !important; }
            .bg-gradient-to-br { background: #7c3aed !important; color: white !important; }
            .shadow-2xl, .shadow-xl { box-shadow: none !important; }
            .rounded-[40px] { border-radius: 12px !important; }
          }
          @page { size: A4; margin: 10mm; }
        `}</style>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white rounded-[40px] shadow-2xl overflow-hidden border border-gray-50">
              <div className="bg-gradient-to-br from-violet-600 to-indigo-700 p-10 text-white relative">
                <div className="flex justify-between items-center mb-6">
                  <span className="px-4 py-1.5 bg-white/10 rounded-full text-xs font-bold tracking-widest uppercase border border-white/20">Report</span>
                  <div className="flex items-center gap-3 no-print">
                    <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 border border-white/10 font-bold text-xs"><Printer size={14}/> PDF</button>
                  </div>
                </div>
                <h2 className="text-4xl font-black mb-2">{roleName} Interview</h2>
              </div>
              <div className="p-10">
                <div className="mb-10">
                  <h3 className="font-bold text-gray-800 text-lg mb-4">Executive Summary</h3>
                  <p className="text-lg text-gray-600 italic border-l-4 border-violet-200 pl-6">
                    "{typeof parsedEval?.summary === 'string' ? parsedEval.summary : 'Summary unavailable.'}"
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(parsedEval?.categories || []).map((cat, idx) => (
                    <div key={idx} className="p-6 rounded-[24px] bg-gray-50 border border-transparent flex gap-5">
                      <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-violet-600 font-black text-xl">{cat.score || 0}</div>
                      <div>
                        <h4 className="font-bold text-gray-800 mb-1">{cat.label || 'Metric'}</h4>
                        <p className="text-xs text-gray-400 mb-2">{cat.feedback || 'N/A'}</p>
                        <div className="h-1 bg-gray-200 rounded-full w-24 overflow-hidden"><div className="h-full bg-violet-600" style={{width:`${(cat.score||0)*10}%`}}></div></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div>
                     <h4 className="font-bold text-gray-800 mb-4">Strengths</h4>
                     {(parsedEval?.strengths || []).map((s,i)=>(<div key={i} className="text-sm text-gray-600 mb-2">✓ {typeof s === 'string' ? s : JSON.stringify(s)}</div>))}
                   </div>
                   <div>
                     <h4 className="font-bold text-gray-800 mb-4">Improvements</h4>
                     {(parsedEval?.improvements || []).map((s,i)=>(<div key={i} className="text-sm text-gray-600 mb-2">! {typeof s === 'string' ? s : JSON.stringify(s)}</div>))}
                   </div>
                </div>
              </div>
            </div>

            {evaluation?.transcript && (
              <div className="bg-white rounded-[32px] p-8 shadow-xl border border-gray-50">
                <h4 className="font-bold text-gray-800 text-lg mb-8 flex items-center gap-2"><FileText size={20}/> Detailed Transcript</h4>
                <div className="space-y-8">
                  {evaluation.transcript.filter(m=>m.role==='assistant').map((msg,i)=>{
                    const evalItem = evaluation.perQuestionEval?.[i];
                    return (
                      <div key={i} className="pl-6 border-l-2 border-gray-100">
                        <p className="text-sm font-bold text-gray-800 mb-2">Q: {msg.content}</p>
                        {evalItem && <p className="text-xs text-violet-600 font-bold mb-2">AI Feedback (Score: {evalItem.score}/10): {evalItem.feedback}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 no-print">
            <div className="bg-white rounded-[40px] p-8 shadow-2xl border border-gray-50 sticky top-8">
              <h3 className="font-black text-2xl text-gray-800 text-center mb-8">Skill Graph</h3>
              <RadarChart categories={parsedEval.categories} />
              <div className="mt-8 pt-8 border-t border-gray-50">
                 <div className="flex items-center gap-4 p-4 bg-violet-50 rounded-[28px]">
                    <div className="w-16 h-16 rounded-2xl bg-white flex flex-col items-center justify-center shadow-inner">
                      <span className="text-2xl font-black text-violet-600">{parsedEval.overallScore}</span>
                      <span className="text-[10px] font-bold text-gray-300">/10</span>
                    </div>
                    <div><h5 className="font-bold text-gray-800 text-sm">Overall Score</h5></div>
                 </div>
                 <button onClick={()=>window.location.reload()} className="w-full mt-8 py-5 bg-gray-900 text-white rounded-[28px] font-bold hover:bg-black transition-all">Try New Session</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto px-4 bg-white">
      <div className="py-6 flex items-center justify-between border-b border-gray-100">
        <h2 className="text-xl font-black text-gray-800">{roleName || "Mock Interview"}</h2>
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-violet-100 text-violet-600 rounded-full text-xs font-bold tracking-tighter uppercase">Question {messages.filter(m=>m.role==='assistant').length + 1}/10</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[80%] p-4 rounded-2xl ${m.role === "user" ? "bg-violet-600 text-white shadow-lg" : "bg-gray-100 text-gray-800 shadow-sm"}`}>
              <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{m.text}</p>
            </div>
          </div>
        ))}
        {displayText && (
          <div className="flex justify-start">
            <div className="max-w-[80%] p-4 rounded-2xl bg-gray-50 border border-violet-100 text-gray-800 shadow-sm">
              <p className="text-sm font-medium leading-relaxed whitespace-pre-wrap">{displayText}</p>
            </div>
          </div>
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <Loader2 className="w-4 h-4 text-violet-600 animate-spin" />
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">AI Agent is thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      <div className="p-6 border-t border-gray-100">
        <div className="flex items-center gap-4 bg-gray-50 p-2 rounded-[32px] border border-gray-200">
          <button onClick={toggleRecording} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${recording ? "bg-red-500 text-white animate-pulse" : "bg-white text-gray-700 shadow-sm"}`}><Mic size={24} /></button>
          <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder={recording ? "Listening..." : "Type your answer..."} className="flex-1 bg-transparent border-none outline-none text-sm font-medium px-2" />
          <button onClick={() => handleSend()} disabled={loading || isSpeaking} className="w-14 h-14 bg-violet-600 text-white rounded-full flex items-center justify-center hover:bg-violet-700 transition-all shadow-lg shadow-violet-200 disabled:opacity-50"><Send size={24} /></button>
        </div>
      </div>
      <audio ref={audioPlayerRef} className="hidden" />
    </div>
  );
}

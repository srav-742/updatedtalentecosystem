// frontend/src/pages/seeker/ApplicationFlow/AgentInterview.jsx

import React, { useState, useRef, useEffect } from "react";
import {
  Mic,
  StopCircle,
  Volume2,
  Sparkles,
  Cpu,
  Send,
  Loader2,
  ChevronLeft,
  User,
  MessageCircle,
  Target,
  AlertTriangle,
  VideoOff,
  Printer,
  FileText,
  Bot,
  ArrowRight,
  CheckCircle2,
  Award,
  Upload,
  Layers,
  Zap,
  ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import AgentSelector from "../../../components/AgentSelector";
import { API_URL } from "../../../firebase";

// --- Radar Chart Component ---
function RadarChart({ categories }) {
  const size = 480;
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
  const gridPaths = gridLevels.map((level) =>
    (categories || [])
      .map((_, i) => {
        const p = getPoint(10, i, level);
        return `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`;
      })
      .join(" ") + " Z"
  );

  const dataPath =
    (categories || [])
      .map((cat, i) => {
        const p = getPoint(Math.max(1, cat.score || 0), i);
        return `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`;
      })
      .join(" ") + " Z";

  return (
    <div className="relative w-full aspect-square flex items-center justify-center select-none overflow-visible px-2">
      <svg width="100%" height="100%" viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {gridPaths.map((path, i) => (
          <path key={i} d={path} fill="none" stroke={i === 4 ? "#cbd5e1" : "#f1f5f9"} strokeWidth="1" />
        ))}
        {(categories || []).map((_, i) => {
          const p = getPoint(10, i);
          return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="#f1f5f9" strokeWidth="1" />;
        })}
        <motion.path
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          d={dataPath}
          fill="rgba(124, 58, 237, 0.18)"
          stroke="#7c3aed"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        {(categories || []).map((cat, i) => {
          const p = getPoint(cat.score || 0, i);
          return (
            <motion.circle
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.08 }}
              cx={p.x}
              cy={p.y}
              r="4.5"
              fill="#7c3aed"
              className="drop-shadow-xs"
            />
          );
        })}
        {(categories || []).map((cat, i) => {
          const p = getPoint(14, i);
          let textAnchor = "middle";
          if (p.x < center - 20) textAnchor = "end";
          if (p.x > center + 20) textAnchor = "start";
          return (
            <text
              key={i}
              x={p.x}
              y={p.y}
              fontSize="11"
              fontWeight="700"
              fill="#475569"
              textAnchor={textAnchor}
              dominantBaseline="middle"
              className="uppercase tracking-tight"
            >
              {cat.label && cat.label.length > 15 && cat.label.includes(" ") ? (
                cat.label.split(" ").map((word, idx) => (
                  <tspan x={p.x} dy={idx === 0 ? -5 : 11} key={idx}>
                    {word}
                  </tspan>
                ))
              ) : (
                cat.label || "Metric"
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
      console.warn("[TTS-FALLBACK] ElevenLabs audio unavailable; using browser SpeechSynthesis.");
      window.speechSynthesis.cancel();
      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "en-US";
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(
          (v) => v.lang.startsWith("en") && (v.name.includes("Google") || v.name.includes("Natural"))
        );
        if (preferredVoice) utterance.voice = preferredVoice;

        utterance.onend = () => {
          setIsSpeaking(false);
          setMessages((prev) => [...prev, { role: "agent", text }]);
          setDisplayText("");
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          setMessages((prev) => [...prev, { role: "agent", text }]);
          setDisplayText("");
        };

        typeText(text);
        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.error("[TTS-BROWSER-FALLBACK] Browser TTS fallback failed:", err);
        typeText(text, () => {
          setIsSpeaking(false);
          setMessages((prev) => [...prev, { role: "agent", text }]);
          setDisplayText("");
        });
      }
    };

    const startTyping = () => {
      typeText(text, () => {
        setIsSpeaking(false);
        setMessages((prev) => [...prev, { role: "agent", text }]);
        setDisplayText("");
      });
    };

    if (!audioBase64 || audioBase64.length < 100) {
      console.warn("[TTS] No ElevenLabs audio received from backend; using speech fallback.");
      speakInBrowser();
      return;
    }

    try {
      const mimeType = audioBase64.startsWith("UklGR") ? "audio/wav" : "audio/mpeg";
      const audioBlob = new Blob([Uint8Array.from(atob(audioBase64), (c) => c.charCodeAt(0))], {
        type: mimeType
      });
      const url = URL.createObjectURL(audioBlob);
      const player = audioPlayerRef.current;
      player.src = url;
      player.onplay = () => {
        console.log("[TTS] ✓ ElevenLabs audio playing");
        startTyping();
      };
      player.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(url);
      };
      player.onerror = (e) => {
        console.error("[TTS] Audio element error:", e);
        startTyping();
        setTimeout(() => setIsSpeaking(false), text.length * 12 + 500);
      };
      player.play().catch((playErr) => {
        console.warn("[TTS] Autoplay blocked, typing directly:", playErr.message);
        startTyping();
        setTimeout(() => setIsSpeaking(false), text.length * 12 + 500);
      });
    } catch (e) {
      console.error("[TTS] Audio decode error:", e);
      startTyping();
      setTimeout(() => setIsSpeaking(false), text.length * 12 + 500);
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
      alert("Failed to start session. Please verify backend connection.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSend(manualText = "") {
    const userText = (manualText || input || transcript).trim();
    if (!userText || loading) return;

    setInput("");
    setTranscript("");
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
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
      setMessages((prev) => [...prev, { role: "agent", text: "Encountered a communication issue. Please try again." }]);
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
    if (!SpeechRec) return alert("Speech recognition is not supported in this browser. Please use text mode.");
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

  // --- Phase 2: Resume Context Onboarding ---
  if (phase === "resume") {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <button
          onClick={() => setPhase("select")}
          className="mb-5 inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-[#faf7f1]"
        >
          <ArrowLeft size={13} />
          <span>Change Role Track</span>
        </button>

        <div className="rounded-3xl border border-black/10 bg-white p-6 md:p-8 shadow-[0_20px_60px_rgba(15,23,42,0.05)]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-50 text-purple-700 border border-purple-100">
              <Sparkles size={20} />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 bg-purple-100/60 px-2 py-0.5 rounded-full">
                Step 2 of 3
              </span>
              <h2 className="text-xl font-bold tracking-tight text-gray-900 mt-1">Provide Resume Context</h2>
            </div>
          </div>
          <p className="mt-2 text-xs md:text-sm text-gray-500">
            Upload your resume or paste its text so the AI interviewer asks questions tailored specifically to your experience and skills.
          </p>

          <div className="mt-6 space-y-4">
            {/* File Upload Box */}
            <div className="rounded-2xl border-2 border-dashed border-black/15 bg-[#faf7f1] p-5 text-center transition hover:border-black/30">
              <Upload className="mx-auto text-gray-400 mb-2" size={24} />
              <p className="text-xs font-bold text-gray-800">
                {resumeFile ? resumeFile.name : "Upload your resume (PDF, max 5MB)"}
              </p>
              <p className="text-[11px] text-gray-500 mt-0.5">Optional: Helps ground the conversation</p>
              <input
                type="file"
                id="interview-resume-file"
                accept=".pdf"
                onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => document.getElementById("interview-resume-file")?.click()}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 transition hover:bg-gray-50 shadow-2xs"
              >
                {resumeFile ? "Change PDF" : "Choose PDF"}
              </button>
            </div>

            <div className="relative flex items-center justify-center">
              <div className="w-full border-t border-black/[0.06]" />
              <span className="absolute bg-white px-3 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Or paste text
              </span>
            </div>

            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste key projects, stack keywords, or summary..."
              rows={3}
              className="w-full rounded-2xl border border-black/10 bg-[#faf7f1] p-3.5 text-xs leading-relaxed text-gray-800 outline-none transition focus:border-black/30 focus:bg-white"
            />

            <button
              onClick={handleStartSession}
              disabled={loading}
              className="w-full mt-4 flex items-center justify-center gap-2 rounded-2xl bg-black py-3.5 text-xs md:text-sm font-semibold text-white transition hover:bg-gray-800 disabled:bg-gray-400 shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={16} />
                  <span>Configuring AI Persona...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} className="text-purple-400" />
                  <span>Start AI Interview Session</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Phase 4: Performance Evaluation Report ---
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
        <div className="max-w-3xl mx-auto px-4 py-12 text-center">
          <div className="rounded-3xl border border-black/10 bg-white p-8 shadow-xs">
            <CheckCircle2 className="mx-auto text-emerald-600 mb-2" size={32} />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Interview Completed</h2>
            <p className="text-xs text-gray-600 mb-6">Processing your performance assessment report...</p>
            <pre className="text-left bg-gray-50 p-4 rounded-2xl text-xs overflow-auto max-h-72 border border-black/5">
              {rawJson}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-gray-800"
            >
              Refresh Results
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        <style>{`
          @media print {
            .no-print { display: none !important; }
            body { background: white !important; color: black !important; }
            .shadow-2xl, .shadow-xl { box-shadow: none !important; }
          }
          @page { size: A4; margin: 10mm; }
        `}</style>

        {/* Top Action Bar */}
        <div className="flex items-center justify-between no-print">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 transition hover:bg-[#faf7f1]"
          >
            <ChevronLeft size={14} />
            <span>Practice Another Role</span>
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-black px-4 py-2 text-xs font-semibold text-white transition hover:bg-gray-800 shadow-xs"
          >
            <Printer size={13} />
            <span>Save Report (PDF)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Report Details */}
          <div className="lg:col-span-8 space-y-6">
            <div className="rounded-3xl border border-black/10 bg-white overflow-hidden shadow-xs">
              {/* Banner Header */}
              <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 p-6 md:p-8 text-white">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-purple-200 border border-white/10">
                    Evaluation Matrix
                  </span>
                  <span className="text-xs text-gray-300">{new Date().toLocaleDateString()}</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mt-3">
                  {roleName || "AI Mock"} Interview Scorecard
                </h2>
                <p className="mt-1 text-xs text-gray-300">
                  Comprehensive rubric scoring across technical, domain, and communication competence.
                </p>
              </div>

              <div className="p-6 md:p-8 space-y-6">
                {/* Executive Summary */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Executive Summary</h3>
                  <div className="rounded-2xl border border-purple-200/80 bg-purple-50/40 p-4 text-xs md:text-sm leading-relaxed text-gray-700 italic border-l-4 border-l-purple-600">
                    &ldquo;{typeof parsedEval?.summary === "string" ? parsedEval.summary : "Summary unavailable."}&rdquo;
                  </div>
                </div>

                {/* Score Breakdown Grid */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Category Breakdown</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(parsedEval?.categories || []).map((cat, idx) => (
                      <div key={idx} className="rounded-2xl border border-black/[0.06] bg-[#faf7f1] p-4 flex gap-3.5">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white shadow-2xs text-purple-700 font-bold text-base border border-black/5">
                          {cat.score || 0}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-gray-900 truncate">{cat.label || "Metric"}</h4>
                          <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2">{cat.feedback || "N/A"}</p>
                          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/5">
                            <div className="h-full rounded-full bg-purple-600" style={{ width: `${(cat.score || 0) * 10}%` }} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Strengths & Improvements */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-black/[0.06]">
                  <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/30 p-4">
                    <h4 className="text-xs font-bold text-emerald-900 mb-2.5 flex items-center gap-1.5">
                      <CheckCircle2 size={14} className="text-emerald-600" />
                      <span>Key Strengths</span>
                    </h4>
                    <div className="space-y-1.5">
                      {(parsedEval?.strengths || []).map((s, i) => (
                        <p key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                          <span className="text-emerald-600 font-bold">•</span>
                          <span>{typeof s === "string" ? s : JSON.stringify(s)}</span>
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-amber-200/80 bg-amber-50/30 p-4">
                    <h4 className="text-xs font-bold text-amber-900 mb-2.5 flex items-center gap-1.5">
                      <Zap size={14} className="text-amber-600" />
                      <span>Actionable Improvements</span>
                    </h4>
                    <div className="space-y-1.5">
                      {(parsedEval?.improvements || []).map((s, i) => (
                        <p key={i} className="text-xs text-gray-700 flex items-start gap-1.5">
                          <span className="text-amber-600 font-bold">•</span>
                          <span>{typeof s === "string" ? s : JSON.stringify(s)}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Transcript Breakdown */}
            {evaluation?.transcript && (
              <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-xs space-y-4">
                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <FileText size={16} />
                  <span>Detailed Interview Transcript</span>
                </h4>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
                  {evaluation.transcript
                    .filter((m) => m.role === "assistant")
                    .map((msg, i) => {
                      const evalItem = evaluation.perQuestionEval?.[i];
                      return (
                        <div key={i} className="rounded-2xl border border-black/[0.06] bg-[#faf7f1] p-4">
                          <p className="text-xs font-bold text-gray-900 mb-1.5">Q{i + 1}: {msg.content}</p>
                          {evalItem && (
                            <p className="text-[11px] text-purple-700 font-medium">
                              Feedback (Score {evalItem.score}/10): {evalItem.feedback}
                            </p>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Radar & Overall Score */}
          <div className="lg:col-span-4 no-print space-y-4">
            <div className="rounded-3xl border border-black/10 bg-white p-6 shadow-xs text-center sticky top-6">
              <h3 className="text-sm font-bold text-gray-900 mb-4">Competency Skill Graph</h3>
              <RadarChart categories={parsedEval.categories} />

              <div className="mt-6 pt-5 border-t border-black/[0.06]">
                <div className="flex items-center justify-between rounded-2xl bg-purple-50/80 border border-purple-200/80 p-4">
                  <div className="text-left">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-purple-800">Overall Benchmark</p>
                    <p className="text-sm font-bold text-gray-900">Final Score</p>
                  </div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-3xl font-black text-purple-700">{parsedEval.overallScore || 0}</span>
                    <span className="text-xs font-bold text-gray-400">/10</span>
                  </div>
                </div>

                <button
                  onClick={() => window.location.reload()}
                  className="w-full mt-4 flex items-center justify-center gap-2 rounded-2xl bg-black py-3 text-xs font-semibold text-white transition hover:bg-gray-800 shadow-xs"
                >
                  <Sparkles size={14} className="text-purple-400" />
                  <span>Start New Session</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- Phase 3: Live Interview Studio Room ---
  const assistantCount = messages.filter((m) => m.role === "assistant").length;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-4xl mx-auto rounded-3xl border border-black/10 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.04)] overflow-hidden">
      {/* Studio Header Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] bg-[#faf7f1]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black text-white shadow-xs">
              <Bot size={20} />
            </div>
            {isSpeaking && (
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-purple-600" />
              </span>
            )}
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900">{roleName || "AI Mock Interview"}</h2>
            <div className="flex items-center gap-2 text-[11px] text-gray-500">
              <span className="flex items-center gap-1 text-purple-700 font-semibold">
                <Volume2 size={12} className={isSpeaking ? "animate-pulse text-purple-600" : "text-gray-400"} />
                {isSpeaking ? "Speaking..." : "Active"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-700 border border-black/5 shadow-2xs">
            Question {Math.min(assistantCount + 1, 10)} of 10
          </span>
        </div>
      </div>

      {/* Messages Canvas */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gradient-to-b from-[#faf7f1]/30 to-white">
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div className={`flex items-start gap-2.5 max-w-[85%] ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-xs font-bold ${
                  m.role === "user" ? "bg-black text-white" : "bg-purple-100 text-purple-800"
                }`}
              >
                {m.role === "user" ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div
                className={`p-4 rounded-2xl text-xs md:text-sm leading-relaxed whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-black text-white shadow-xs rounded-tr-xs"
                    : "bg-white border border-black/[0.08] text-gray-800 shadow-2xs rounded-tl-xs"
                }`}
              >
                {m.text}
              </div>
            </div>
          </motion.div>
        ))}

        {displayText && (
          <div className="flex justify-start">
            <div className="flex items-start gap-2.5 max-w-[85%]">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-purple-100 text-purple-800 text-xs font-bold">
                <Bot size={14} />
              </div>
              <div className="p-4 rounded-2xl rounded-tl-xs bg-white border border-purple-200/80 text-gray-800 shadow-2xs text-xs md:text-sm leading-relaxed whitespace-pre-wrap">
                {displayText}
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-black/[0.06] text-xs text-gray-500 shadow-2xs">
              <Loader2 className="animate-spin text-purple-600" size={14} />
              <span className="font-semibold text-gray-600">Interviewer is formulating response...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input Console Toolbar */}
      <div className="p-4 border-t border-black/[0.06] bg-white">
        <div className="flex items-center gap-2 rounded-2xl border border-black/10 bg-[#faf7f1] p-1.5 transition-all focus-within:border-black/30 focus-within:bg-white">
          <button
            type="button"
            onClick={toggleRecording}
            title={recording ? "Stop Voice Recording" : "Speak Your Answer"}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all ${
              recording
                ? "bg-red-500 text-white animate-pulse shadow-xs"
                : "bg-white text-gray-700 hover:bg-gray-100 border border-black/5 shadow-2xs"
            }`}
          >
            <Mic size={18} />
          </button>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={recording ? "Listening to your voice..." : "Type your answer or use microphone..."}
            className="flex-1 bg-transparent px-2 text-xs md:text-sm text-gray-800 outline-none placeholder:text-gray-400"
          />

          <button
            type="button"
            onClick={() => handleSend()}
            disabled={loading || isSpeaking || (!input.trim() && !transcript.trim())}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black text-white transition hover:bg-gray-800 disabled:opacity-40 shadow-xs"
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      <audio ref={audioPlayerRef} className="hidden" />
    </div>
  );
}

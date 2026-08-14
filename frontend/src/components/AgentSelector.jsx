import { useEffect, useState } from "react";
import { ArrowRight, BriefcaseBusiness, RefreshCw, Sparkles } from "lucide-react";
import axios from "axios";
import { API_URL } from "../firebase";

const ROLE_META = {
  ai_engineer: { emoji: "🤖", color: "from-violet-500/15 to-fuchsia-500/10 border-violet-200 text-violet-900" },
  business_development: { emoji: "🤝", color: "from-blue-500/15 to-sky-500/10 border-blue-200 text-blue-900" },
  product_manager: { emoji: "📋", color: "from-green-500/15 to-emerald-500/10 border-green-200 text-green-900" },
  data_scientist: { emoji: "📊", color: "from-amber-500/15 to-yellow-500/10 border-amber-200 text-amber-900" },
  sales_executive: { emoji: "💼", color: "from-rose-500/15 to-pink-500/10 border-rose-200 text-rose-900" },
  frontend_engineer: { emoji: "🖥️", color: "from-cyan-500/15 to-teal-500/10 border-cyan-200 text-cyan-900" },
  backend_engineer: { emoji: "⚙️", color: "from-orange-500/15 to-amber-500/10 border-orange-200 text-orange-900" },
  devops_engineer: { emoji: "🚀", color: "from-indigo-500/15 to-blue-500/10 border-indigo-200 text-indigo-900" },
  ux_designer: { emoji: "🎨", color: "from-pink-500/15 to-rose-500/10 border-pink-200 text-pink-900" },
  marketing_manager: { emoji: "📣", color: "from-yellow-500/15 to-orange-500/10 border-yellow-200 text-yellow-900" },
  hr_manager: { emoji: "👥", color: "from-teal-500/15 to-emerald-500/10 border-teal-200 text-teal-900" },
  finance_analyst: { emoji: "💹", color: "from-emerald-500/15 to-green-500/10 border-emerald-200 text-emerald-900" },
  cybersecurity_analyst: { emoji: "🔐", color: "from-red-500/15 to-rose-500/10 border-red-200 text-red-900" },
  machine_learning_engineer: { emoji: "🧠", color: "from-purple-500/15 to-violet-500/10 border-purple-200 text-purple-900" },
};

export default function AgentSelector({ onSelectRole }) {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRoles = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await axios.get(`${API_URL}/agent/roles`);
      const data = res.data;

      if (Array.isArray(data)) {
        setRoles(data);
      } else if (data && Array.isArray(data.roles)) {
        setRoles(data.roles);
      } else {
        setRoles([]);
        setError("Unexpected response format from interview service.");
      }
    } catch (err) {
      console.error("Failed to fetch roles:", err);
      setError("Failed to load interview roles. Please check that the backend is running on port 5000.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="rounded-[2rem] border border-black/10 bg-white px-8 py-10 text-center shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f4efe6] text-gray-700">
            <RefreshCw className="animate-spin" size={22} />
          </div>
          <p className="mt-5 text-sm font-semibold text-gray-900">Loading interview tracks</p>
          <p className="mt-2 text-sm text-gray-500">Preparing role-specific interview agents for you.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-[2rem] border border-red-200 bg-red-50 px-6 py-7 text-center shadow-sm">
          <p className="text-base font-semibold text-red-700">{error}</p>
          <button
            onClick={fetchRoles}
            className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (roles.length === 0) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-gray-400">
        No interview roles are available right now.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <div className="overflow-hidden rounded-[2.5rem] border border-black/10 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(244,239,230,0.9)_55%,_rgba(231,224,211,0.88))] p-8 shadow-[0_28px_90px_rgba(15,23,42,0.08)] md:p-10">
        <div className="grid gap-8 xl:grid-cols-[0.95fr_1.05fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/80 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-gray-500">
              <Sparkles size={14} />
              Mock Interview Studio
            </div>
            <h2 className="mt-5 max-w-xl text-4xl font-semibold tracking-tight text-gray-900">
              Choose the role you want to practice with confidence.
            </h2>
            <p className="mt-4 max-w-lg text-base leading-8 text-gray-600">
              Every track uses a different interviewer persona, question strategy, and evaluation rubric so the experience feels specific to the role you are targeting.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                "Role-specific questions and scoring",
                "Resume-aware interview flow",
                "Voice and text response support",
                "Final performance report with strengths and gaps",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white/70 px-4 py-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-black text-white">
                    <BriefcaseBusiness size={18} />
                  </div>
                  <p className="text-sm font-medium text-gray-700">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {roles.map(({ key, role }) => {
              const meta = ROLE_META[key] || {
                emoji: "🎯",
                color: "from-gray-100 to-gray-50 border-gray-200 text-gray-800",
              };

              return (
                <button
                  key={key}
                  onClick={() => onSelectRole(key)}
                  className={`group flex min-h-[150px] flex-col justify-between rounded-[2rem] border bg-gradient-to-br p-6 text-left transition duration-200 hover:-translate-y-1 hover:shadow-[0_24px_70px_rgba(15,23,42,0.1)] ${meta.color}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-3xl">{meta.emoji}</span>
                    <span className="rounded-full border border-current/10 bg-white/70 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-gray-500">
                      AI interview
                    </span>
                  </div>

                  <div className="mt-8">
                    <p className="text-lg font-semibold">{role}</p>
                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      Practice realistic questions, get instant scoring, and review a structured final report.
                    </p>
                  </div>

                  <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-900">
                    Start session
                    <ArrowRight size={16} className="transition group-hover:translate-x-1" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

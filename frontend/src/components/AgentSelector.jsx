import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, Bot, BriefcaseBusiness, Code2, Cpu, FileText, Mic, RefreshCw, Search, Sparkles, Zap, ShieldCheck } from "lucide-react";
import axios from "axios";
import { API_URL } from "../firebase";

const ROLE_META = {
  ai_engineer: { emoji: "🤖", category: "engineering", color: "from-violet-500/10 to-indigo-500/5 border-violet-200/80 text-violet-900" },
  business_development: { emoji: "🤝", category: "business", color: "from-blue-500/10 to-sky-500/5 border-blue-200/80 text-blue-900" },
  product_manager: { emoji: "📋", category: "product", color: "from-emerald-500/10 to-teal-500/5 border-emerald-200/80 text-emerald-900" },
  data_scientist: { emoji: "📊", category: "product", color: "from-amber-500/10 to-yellow-500/5 border-amber-200/80 text-amber-900" },
  sales_executive: { emoji: "💼", category: "business", color: "from-rose-500/10 to-pink-500/5 border-rose-200/80 text-rose-900" },
  frontend_engineer: { emoji: "🖥️", category: "engineering", color: "from-cyan-500/10 to-blue-500/5 border-cyan-200/80 text-cyan-900" },
  backend_engineer: { emoji: "⚙️", category: "engineering", color: "from-orange-500/10 to-amber-500/5 border-orange-200/80 text-orange-900" },
  devops_engineer: { emoji: "🚀", category: "engineering", color: "from-indigo-500/10 to-purple-500/5 border-indigo-200/80 text-indigo-900" },
  ux_designer: { emoji: "🎨", category: "product", color: "from-pink-500/10 to-rose-500/5 border-pink-200/80 text-pink-900" },
  marketing_manager: { emoji: "📣", category: "business", color: "from-yellow-500/10 to-orange-500/5 border-yellow-200/80 text-yellow-900" },
  hr_manager: { emoji: "👥", category: "business", color: "from-teal-500/10 to-emerald-500/5 border-teal-200/80 text-teal-900" },
  finance_analyst: { emoji: "💹", category: "business", color: "from-emerald-500/10 to-green-500/5 border-emerald-200/80 text-emerald-900" },
  cybersecurity_analyst: { emoji: "🔐", category: "engineering", color: "from-red-500/10 to-rose-500/5 border-red-200/80 text-red-900" },
  machine_learning_engineer: { emoji: "🧠", category: "engineering", color: "from-purple-500/10 to-violet-500/5 border-purple-200/80 text-purple-900" },
  business_development_executive: { emoji: "🤝", category: "business", color: "from-blue-500/10 to-sky-500/5 border-blue-200/80 text-blue-900" },
};

const DEFAULT_ROLES = [
  { key: "ai_engineer", role: "AI Engineer" },
  { key: "frontend_engineer", role: "Frontend Engineer" },
  { key: "backend_engineer", role: "Backend Engineer" },
  { key: "product_manager", role: "Product Manager" },
  { key: "data_scientist", role: "Data Scientist" },
  { key: "devops_engineer", role: "DevOps Engineer" },
  { key: "machine_learning_engineer", role: "Machine Learning Engineer" },
  { key: "ux_designer", role: "UX Designer" },
  { key: "cybersecurity_analyst", role: "Cybersecurity Analyst" },
  { key: "business_development", role: "Business Development Manager" },
  { key: "sales_executive", role: "Sales Executive" },
  { key: "marketing_manager", role: "Marketing Manager" },
  { key: "hr_manager", role: "HR Manager" },
  { key: "finance_analyst", role: "Financial Analyst" },
  { key: "business_development_executive", role: "Business Development Executive" },
];

export default function AgentSelector({ onSelectRole }) {
  const [roles, setRoles] = useState(DEFAULT_ROLES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const fetchRoles = async () => {
    try {
      const res = await axios.get(`${API_URL}/agent/roles`);
      const data = res.data;

      if (Array.isArray(data) && data.length > 0) {
        setRoles(data);
      } else if (data && Array.isArray(data.roles) && data.roles.length > 0) {
        setRoles(data.roles);
      }
    } catch (err) {
      console.warn("Background roles sync failed, using default tracks:", err.message);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const filteredRoles = useMemo(() => {
    return roles.filter(({ key, role }) => {
      const meta = ROLE_META[key] || { category: "engineering" };
      const matchesCategory = activeCategory === "all" || meta.category === activeCategory;
      const matchesSearch = !search.trim() || role.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [roles, activeCategory, search]);

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <div className="rounded-3xl border border-black/10 bg-white p-8 text-center shadow-xs">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#faf7f1] text-gray-700">
            <RefreshCw className="animate-spin" size={20} />
          </div>
          <p className="mt-4 text-sm font-bold text-gray-900">Loading interview studio</p>
          <p className="mt-1 text-xs text-gray-500">Preparing AI interview personas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center shadow-xs">
          <p className="text-sm font-bold text-red-800">{error}</p>
          <button
            onClick={fetchRoles}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700"
          >
            <RefreshCw size={14} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Studio Header Banner */}
      <header className="overflow-hidden rounded-3xl border border-black/10 bg-gradient-to-br from-white via-[#fcfaf6] to-[#f4eee4] px-7 py-7 shadow-[0_16px_50px_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-black/5 bg-[#f4efe6] px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-gray-600">
              <span className="h-2 w-2 rounded-full bg-purple-600 animate-pulse" />
              AI Mock Interview Studio
            </div>
            <h1 className="mt-2.5 text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
              Practice real-time technical & behavioral rounds
            </h1>
            <p className="mt-1 max-w-2xl text-xs md:text-sm text-gray-500">
              Select your target track. Each persona uses tailored question strategies, voice evaluation, and structured scoring.
            </p>
          </div>

          <div className="relative min-w-full lg:min-w-[300px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search interview track..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-[#faf7f1] py-2.5 pl-10 pr-4 text-xs md:text-sm text-gray-800 outline-none transition focus:border-black/30 focus:bg-white"
            />
          </div>
        </div>
      </header>

      {/* Feature Badges Strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-700 border border-purple-100">
            <Mic size={18} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900">Voice & Speech Mode</p>
            <p className="text-[11px] text-gray-500">Respond via speech or live text input</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
            <Cpu size={18} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900">Resume-Aware Agents</p>
            <p className="text-[11px] text-gray-500">Tailored to your past experience & stack</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-4 shadow-xs">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100">
            <ShieldCheck size={18} />
          </div>
          <div>
            <p className="text-xs font-bold text-gray-900">Instant Performance Report</p>
            <p className="text-[11px] text-gray-500">Get 10-metric radar evaluation chart</p>
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-black/10 bg-white p-2 shadow-xs">
        {[
          { id: "all", label: "All Tracks", count: roles.length },
          { id: "engineering", label: "Engineering & AI", count: roles.filter(r => (ROLE_META[r.key]?.category || "engineering") === "engineering").length },
          { id: "product", label: "Product & Data", count: roles.filter(r => ROLE_META[r.key]?.category === "product").length },
          { id: "business", label: "Business & Management", count: roles.filter(r => ROLE_META[r.key]?.category === "business").length }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveCategory(tab.id)}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
              activeCategory === tab.id
                ? "bg-black text-white shadow-xs"
                : "text-gray-600 hover:bg-[#faf7f1] hover:text-gray-900"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`rounded-full px-2 py-0.2 text-[10px] font-bold ${
                activeCategory === tab.id ? "bg-white/20 text-white" : "bg-black/5 text-gray-500"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Tracks Grid */}
      {filteredRoles.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredRoles.map(({ key, role }) => {
            const meta = ROLE_META[key] || {
              emoji: "🎯",
              color: "from-gray-100 to-gray-50 border-gray-200 text-gray-800",
            };

            return (
              <div
                key={key}
                className={`group flex flex-col justify-between rounded-3xl border bg-gradient-to-br p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${meta.color}`}
              >
                <div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-2xl">{meta.emoji}</span>
                    <span className="rounded-full border border-black/5 bg-white/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-gray-600 shadow-2xs">
                      10 Questions
                    </span>
                  </div>

                  <div className="mt-4">
                    <h3 className="text-base font-bold text-gray-900 leading-snug">{role}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-gray-600">
                      Practice role-specific technical questions, receive real-time audio replies, and get scored.
                    </p>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-black/[0.06] flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-gray-500">AI Evaluated</span>
                  <button
                    type="button"
                    onClick={() => onSelectRole(key)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-black px-3.5 py-2 text-xs font-semibold text-white transition-all hover:bg-gray-800 shadow-xs group-hover:bg-purple-700"
                  >
                    <span>Start Studio</span>
                    <ArrowRight size={13} className="transition group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-black/10 bg-white p-12 text-center shadow-xs">
          <Bot className="mx-auto text-gray-400 mb-2" size={32} />
          <h3 className="text-sm font-bold text-gray-800">No matching tracks found</h3>
          <p className="text-xs text-gray-500 mt-1">Try clearing your search keyword.</p>
        </div>
      )}
    </div>
  );
}

// frontend/src/components/AgentSelector.jsx

import { useState, useEffect } from "react";
import axios from "axios";

const ROLE_META = {
  ai_engineer: { emoji: "🤖", color: "bg-violet-100 border-violet-400 text-violet-800" },
  business_development: { emoji: "🤝", color: "bg-blue-100 border-blue-400 text-blue-800" },
  product_manager: { emoji: "📋", color: "bg-green-100 border-green-400 text-green-800" },
  data_scientist: { emoji: "📊", color: "bg-amber-100 border-amber-400 text-amber-800" },
  sales_executive: { emoji: "💼", color: "bg-rose-100 border-rose-400 text-rose-800" },
  frontend_engineer: { emoji: "🖥️", color: "bg-cyan-100 border-cyan-400 text-cyan-800" },
  backend_engineer: { emoji: "⚙️", color: "bg-orange-100 border-orange-400 text-orange-800" },
  devops_engineer: { emoji: "🚀", color: "bg-indigo-100 border-indigo-400 text-indigo-800" },
  ux_designer: { emoji: "🎨", color: "bg-pink-100 border-pink-400 text-pink-800" },
  marketing_manager: { emoji: "📣", color: "bg-yellow-100 border-yellow-400 text-yellow-800" },
  hr_manager: { emoji: "👥", color: "bg-teal-100 border-teal-400 text-teal-800" },
  finance_analyst: { emoji: "💹", color: "bg-emerald-100 border-emerald-400 text-emerald-800" },
  cybersecurity_analyst: { emoji: "🔐", color: "bg-red-100 border-red-400 text-red-800" },
  machine_learning_engineer: { emoji: "🧠", color: "bg-purple-100 border-purple-400 text-purple-800" },
};

export default function AgentSelector({ onSelectRole }) {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios.get("/api/agent/roles")
      .then(res => {
        console.log("API response:", res.data); // debug log
        // handle both {roles:[...]} and direct array
        const data = res.data;
        if (Array.isArray(data)) {
          setRoles(data);
        } else if (data && Array.isArray(data.roles)) {
          setRoles(data.roles);
        } else {
          setRoles([]);
          setError("Unexpected response format");
        }
      })
      .catch(err => {
        console.error("Failed to fetch roles:", err);
        setError("Failed to load interview roles. Is the backend running?");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        Loading agents...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20 text-red-500">
        {error}
      </div>
    );
  }

  if (roles.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-gray-400">
        No roles available.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h2 className="text-2xl font-semibold text-gray-800 mb-2">
        Choose your interview role
      </h2>
      <p className="text-gray-500 mb-8">
        Each agent is customized with role-specific questions and evaluation criteria.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {roles.map(({ key, role }) => {
          const meta = ROLE_META[key] || {
            emoji: "🎯",
            color: "bg-gray-100 border-gray-300 text-gray-700"
          };
          return (
            <button
              key={key}
              onClick={() => onSelectRole(key)}
              className={`flex items-center gap-4 p-5 rounded-xl border-2 text-left 
                transition-all hover:shadow-md hover:-translate-y-0.5 ${meta.color}`}
            >
              <span className="text-3xl">{meta.emoji}</span>
              <div>
                <p className="font-semibold text-base">{role}</p>
                <p className="text-xs opacity-70 mt-0.5">Mock interview · AI-powered</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
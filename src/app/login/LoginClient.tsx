"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GraduationCap, Lock, Mail, Loader2, UserCheck, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";

export default function LoginClient() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedRole, setSelectedRole] = useState<"candidate" | "admin" | null>(null);

  const handleSelectRole = (role: "candidate" | "admin") => {
    setError("");
    setSelectedRole(role);
    if (role === "candidate") {
      setEmail("candidate@exam.com");
      setPassword("candidate123");
    } else {
      setEmail("admin@exam.com");
      setPassword("admin123");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      // Redirect based on role
      if (data.user.role === "ADMIN") {
        router.push("/admin/dashboard");
      } else {
        router.push("/candidate/dashboard");
      }
      router.refresh();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-800/80 backdrop-blur-md rounded-2xl shadow-xl border border-slate-700/50 overflow-hidden">
        {/* Header */}
        <div className="p-8 pb-4 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-600/20 rounded-2xl border border-indigo-500/30 text-indigo-400 mb-4">
            <GraduationCap size={32} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">MockExam Portal</h1>
          <p className="text-slate-400 text-sm mt-1">Sign in to start your examination session</p>
        </div>

        {/* Quick Demo Credential Options */}
        <div className="px-8 pt-2 pb-1">
          <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-400 animate-pulse" /> Auto-fill Demo Credentials
              </span>
              {selectedRole && (
                <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 size={10} /> Auto-filled
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {/* Candidate Button */}
              <button
                type="button"
                onClick={() => handleSelectRole("candidate")}
                className={`relative flex flex-col items-start p-2.5 rounded-lg border text-left transition-all cursor-pointer group ${
                  selectedRole === "candidate"
                    ? "bg-indigo-600/20 border-indigo-500/80 shadow-md shadow-indigo-500/10"
                    : "bg-slate-800/60 border-slate-700/70 hover:bg-slate-800 hover:border-slate-600"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-medium text-slate-200 flex items-center gap-1.5 group-hover:text-white">
                    <UserCheck size={14} className="text-indigo-400" /> Candidate
                  </span>
                  {selectedRole === "candidate" && (
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                  )}
                </div>
                <span className="text-[11px] text-slate-400 truncate w-full font-mono">
                  candidate@exam.com
                </span>
              </button>

              {/* Admin Button */}
              <button
                type="button"
                onClick={() => handleSelectRole("admin")}
                className={`relative flex flex-col items-start p-2.5 rounded-lg border text-left transition-all cursor-pointer group ${
                  selectedRole === "admin"
                    ? "bg-purple-600/20 border-purple-500/80 shadow-md shadow-purple-500/10"
                    : "bg-slate-800/60 border-slate-700/70 hover:bg-slate-800 hover:border-slate-600"
                }`}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span className="text-xs font-medium text-slate-200 flex items-center gap-1.5 group-hover:text-white">
                    <ShieldCheck size={14} className="text-purple-400" /> Admin
                  </span>
                  {selectedRole === "admin" && (
                    <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                  )}
                </div>
                <span className="text-[11px] text-slate-400 truncate w-full font-mono">
                  admin@exam.com
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 pt-4 space-y-5">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-3 text-rose-400 text-sm">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Mail size={18} />
              </span>
              <input
                type="email"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm transition-all"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSelectedRole(null);
                }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                <Lock size={18} />
              </span>
              <input
                type="password"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 pl-10 pr-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setSelectedRole(null);
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 hover:shadow-indigo-600/30 transition-all cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="bg-slate-850 p-6 text-center border-t border-slate-700/50">
          <p className="text-slate-400 text-sm">
            Don't have an account?{" "}
            <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
              Create an account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}


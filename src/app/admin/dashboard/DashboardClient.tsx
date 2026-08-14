"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, HelpCircle, BookOpen, Users, History, Award, CheckCircle, Edit3, Loader2 } from "lucide-react";

interface Stats {
  totalExams: number;
  publishedExams: number;
  draftExams: number;
  totalQuestions: number;
  totalSubjects: number;
  totalCandidates: number;
  totalAttempts: number;
  averageScore: number;
}

export default function DashboardClient() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/dashboard");
      if (!res.ok) throw new Error("Failed to load dashboard metrics");
      const data = await res.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
        <p>Loading administration console...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="p-8 text-center text-rose-400 bg-slate-800/40 border border-slate-800 rounded-2xl">
        {error || "Failed to load metrics."}
      </div>
    );
  }

  const statCards = [
    { name: "Total Exams", value: stats.totalExams, icon: FileText, color: "text-indigo-400", bg: "bg-indigo-500/10" },
    { name: "Published Exams", value: stats.publishedExams, icon: CheckCircle, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { name: "Draft Exams", value: stats.draftExams, icon: Edit3, color: "text-amber-400", bg: "bg-amber-500/10" },
    { name: "Question Bank", value: stats.totalQuestions, icon: HelpCircle, color: "text-sky-400", bg: "bg-sky-500/10" },
    { name: "Total Subjects", value: stats.totalSubjects, icon: BookOpen, color: "text-pink-400", bg: "bg-pink-500/10" },
    { name: "Candidates", value: stats.totalCandidates, icon: Users, color: "text-violet-400", bg: "bg-violet-500/10" },
    { name: "Attempts Logged", value: stats.totalAttempts, icon: History, color: "text-teal-400", bg: "bg-teal-500/10" },
    { name: "Average Score", value: stats.averageScore, icon: Award, color: "text-rose-455", bg: "bg-rose-500/10" },
  ];

  return (
    <div className="space-y-8">
      {/* Banner */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Admin Console</h1>
        <p className="text-slate-400 text-sm mt-1">Real-time statistics and controls for the examination system</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div 
              key={idx} 
              className="bg-slate-800/40 border border-slate-800 rounded-2xl p-5 flex items-center gap-4 hover:border-slate-750 transition-colors"
            >
              <div className={`w-12 h-12 ${card.bg} rounded-xl border border-slate-700/30 flex items-center justify-center ${card.color} shrink-0`}>
                <Icon size={22} />
              </div>
              <div>
                <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{card.name}</div>
                <div className="text-2xl font-black text-white mt-0.5">{card.value}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Quick Action Panel */}
      <div className="bg-slate-800/30 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white tracking-wide">Quick Controls</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            onClick={() => router.push("/admin/exams")}
            className="flex flex-col items-center justify-center p-6 bg-slate-900/40 border border-slate-800 rounded-xl hover:border-indigo-500/50 hover:bg-slate-900/60 transition-all text-center gap-2 cursor-pointer group"
          >
            <div className="w-10 h-10 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <PlusIcon className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-white">Create Mock Exam</span>
            <span className="text-xs text-slate-500 leading-relaxed">Configure dynamic subject lists and timers</span>
          </button>

          <button
            onClick={() => router.push("/admin/questions")}
            className="flex flex-col items-center justify-center p-6 bg-slate-900/40 border border-slate-800 rounded-xl hover:border-indigo-500/50 hover:bg-slate-900/60 transition-all text-center gap-2 cursor-pointer group"
          >
            <div className="w-10 h-10 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <PlusIcon className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-white">Add Question to Bank</span>
            <span className="text-xs text-slate-500 leading-relaxed">Create single-correct MCQ questions</span>
          </button>

          <button
            onClick={() => router.push("/admin/subjects")}
            className="flex flex-col items-center justify-center p-6 bg-slate-900/40 border border-slate-800 rounded-xl hover:border-indigo-500/50 hover:bg-slate-900/60 transition-all text-center gap-2 cursor-pointer group"
          >
            <div className="w-10 h-10 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
              <PlusIcon className="w-5 h-5" />
            </div>
            <span className="text-sm font-semibold text-white">Manage Subjects</span>
            <span className="text-xs text-slate-500 leading-relaxed">Create dynamic subject topics and sections</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function PlusIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

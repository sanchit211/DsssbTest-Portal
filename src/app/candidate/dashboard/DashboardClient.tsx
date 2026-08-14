"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Clock, FileText, CheckCircle, Target, Loader2, ArrowRight, BookOpen } from "lucide-react";

interface SubjectInfo {
  name: string;
  questionCount: number;
  duration: number;
}

interface Exam {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  timerMode: string;
  questionsCount: number;
  subjects: SubjectInfo[];
}

interface Stats {
  totalAttempts: number;
  avgScore: number;
  bestScore: number;
  avgAccuracy: number;
}

export default function DashboardClient() {
  const router = useRouter();
  const [userName, setUserName] = useState("Candidate");
  const [exams, setExams] = useState<Exam[]>([]);
  const [stats, setStats] = useState<Stats>({ totalAttempts: 0, avgScore: 0, bestScore: 0, avgAccuracy: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/candidate/dashboard");
        if (!res.ok) throw new Error("Failed to load dashboard data");
        const data = await res.json();
        setUserName(data.userName || "Candidate");
        setExams(data.exams || []);
        setStats(data.stats || { totalAttempts: 0, avgScore: 0, bestScore: 0, avgAccuracy: 0 });
      } catch (err: any) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-indigo-900/60 to-slate-800/40 border border-indigo-500/20 rounded-3xl p-6 md:p-8 backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Welcome back, {userName}!</h1>
          <p className="text-slate-350 text-sm mt-1">Ready to test your knowledge? Select one of the practice mocks below to begin.</p>
        </div>
        <button
          onClick={() => router.push("/candidate/attempts")}
          className="inline-flex items-center gap-1.5 self-start md:self-auto text-sm text-indigo-400 hover:text-indigo-300 font-semibold transition-colors cursor-pointer"
        >
          View Attempt History
          <ArrowRight size={16} />
        </button>
      </div>

      {/* Performance Statistics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600/10 rounded-xl border border-indigo-500/15 flex items-center justify-center text-indigo-400 shrink-0">
            <FileText size={22} />
          </div>
          <div>
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Tests Attempted</div>
            <div className="text-2xl font-bold text-white mt-0.5">{stats.totalAttempts}</div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-600/10 rounded-xl border border-emerald-500/15 flex items-center justify-center text-emerald-400 shrink-0">
            <Award size={22} />
          </div>
          <div>
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Average Score</div>
            <div className="text-2xl font-bold text-white mt-0.5">{stats.avgScore}</div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-600/10 rounded-xl border border-amber-500/15 flex items-center justify-center text-amber-400 shrink-0">
            <Target size={22} />
          </div>
          <div>
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Best Score</div>
            <div className="text-2xl font-bold text-white mt-0.5">{stats.bestScore}</div>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-sky-600/10 rounded-xl border border-sky-500/15 flex items-center justify-center text-sky-400 shrink-0">
            <CheckCircle size={22} />
          </div>
          <div>
            <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Avg Accuracy</div>
            <div className="text-2xl font-bold text-white mt-0.5">{stats.avgAccuracy}%</div>
          </div>
        </div>
      </div>

      {/* Available Tests Section */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-white tracking-wide">Available Mock Tests</h2>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 bg-slate-800/20 border border-slate-800 rounded-2xl">
            <Loader2 className="animate-spin text-indigo-500" size={32} />
            <p>Fetching active mock tests...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 bg-slate-800/20 border border-slate-800 rounded-2xl">{error}</div>
        ) : exams.length === 0 ? (
          <div className="py-20 text-center text-slate-500 bg-slate-800/20 border border-slate-800 rounded-2xl">
            No mock tests are currently available. Check back soon!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {exams.map((exam) => (
              <div 
                key={exam.id} 
                className="bg-slate-800/30 border border-slate-800 rounded-2xl p-6 hover:border-slate-700/80 transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Header info */}
                  <div>
                    <h3 className="text-lg font-bold text-white leading-snug">{exam.name}</h3>
                    {exam.description && (
                      <p className="text-slate-400 text-xs mt-1 leading-relaxed">{exam.description}</p>
                    )}
                  </div>

                  {/* Dynamically Controlled Subjects list */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Exam Structure</span>
                    <div className="flex flex-col gap-1.5 bg-slate-900/40 p-3 rounded-xl border border-slate-850">
                      {exam.subjects.map((sub, idx) => (
                        <div key={idx} className="flex justify-between text-xs font-medium">
                          <span className="text-slate-350 flex items-center gap-1.5">
                            <BookOpen size={12} className="text-indigo-400" />
                            {sub.name}
                          </span>
                          <span className="text-slate-500">
                            {sub.questionCount} Questions {exam.timerMode === "SUBJECT_WISE" && `| ${sub.duration}m`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Exam Totals Info */}
                  <div className="flex items-center gap-4 text-xs font-medium text-slate-400 border-t border-slate-800/60 pt-3">
                    <span className="inline-flex items-center gap-1.5">
                      <FileText size={14} className="text-indigo-400" />
                      {exam.questionsCount} Questions
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={14} className="text-indigo-400" />
                      {exam.duration} Minutes
                    </span>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="mt-6 border-t border-slate-850 pt-4 flex justify-end">
                  <button
                    onClick={() => router.push(`/candidate/exams/${exam.id}/instructions`)}
                    className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-xs font-semibold py-2 px-4 rounded-lg shadow-md transition-all cursor-pointer"
                  >
                    Start Test
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

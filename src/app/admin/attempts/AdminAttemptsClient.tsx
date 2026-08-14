"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, Award, Clock, ArrowRight, Loader2 } from "lucide-react";

interface Attempt {
  id: string;
  candidateName: string;
  candidateEmail: string;
  examName: string;
  startTime: string;
  submittedAt: string | null;
  status: string;
  score: number | null;
  accuracy: number | null;
  timeTaken: string;
}

export default function AdminAttemptsClient() {
  const router = useRouter();
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchAttempts = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/admin/attempts");
        if (!res.ok) throw new Error("Failed to load candidates attempts");
        const data = await res.json();
        setAttempts(data);
      } catch (err: any) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchAttempts();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filtered = attempts.filter((a) =>
    a.candidateName.toLowerCase().includes(search.toLowerCase()) ||
    a.candidateEmail.toLowerCase().includes(search.toLowerCase()) ||
    a.examName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Users className="text-indigo-400" />
          Attempts & Results Monitor
        </h1>
        <p className="text-slate-400 text-sm mt-1">Monitor candidate mock test sessions, scores, and completions in real-time</p>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-800/50 border border-slate-800 rounded-2xl p-4">
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
            <Search size={18} />
          </span>
          <input
            type="text"
            className="w-full bg-slate-950 border border-slate-700/60 rounded-xl py-2 pl-10 pr-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm transition-all"
            placeholder="Search by candidate or exam..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="text-slate-400 text-sm font-medium">
          Total Sessions logged: {attempts.length}
        </div>
      </div>

      {/* Table listing */}
      <div className="bg-slate-800/40 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="animate-spin text-indigo-500" size={32} />
            <p>Loading candidate sessions...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-500">
            No candidate attempts found in the system.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-850/50">
                  <th className="py-4 px-6">Candidate</th>
                  <th className="py-4 px-6">Mock Exam Name</th>
                  <th className="py-4 px-6 text-center">Attempt Date</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-center">Score</th>
                  <th className="py-4 px-6 text-center">Accuracy</th>
                  <th className="py-4 px-6 text-center">Time Taken</th>
                  <th className="py-4 px-6 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-350 text-sm font-medium">
                {filtered.map((att) => (
                  <tr key={att.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-4 px-6">
                      <div className="text-white font-bold">{att.candidateName}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{att.candidateEmail}</div>
                    </td>
                    <td className="py-4 px-6 font-semibold text-slate-200">
                      {att.examName}
                    </td>
                    <td className="py-4 px-6 text-center text-slate-400 font-medium">
                      {formatDate(att.startTime)}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        att.status === "SUBMITTED" || att.status === "AUTO_SUBMITTED"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/15"
                          : att.status === "EXPIRED"
                          ? "bg-rose-500/10 text-rose-450 border-rose-500/15"
                          : "bg-indigo-500/10 text-indigo-400 border-indigo-500/15"
                      }`}>
                        {att.status === "IN_PROGRESS" ? "In Progress" : att.status === "EXPIRED" ? "Timed Out" : "Submitted"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center text-white font-semibold">
                      {att.score !== null ? (
                        <span className="inline-flex items-center gap-1.5 justify-center">
                          <Award size={14} className="text-indigo-400" />
                          {att.score}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic text-xs">N/A</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center text-slate-400 font-medium">
                      {att.accuracy !== null ? `${att.accuracy}%` : <span className="text-slate-500 italic text-xs">N/A</span>}
                    </td>
                    <td className="py-4 px-6 text-center text-slate-400 font-medium">
                      <span className="inline-flex items-center gap-1.5 justify-center">
                        <Clock size={14} className="text-slate-500" />
                        {att.timeTaken}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {att.status !== "IN_PROGRESS" && (
                        <button
                          onClick={() => router.push(`/candidate/attempts/${att.id}/result`)}
                          className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-semibold cursor-pointer"
                        >
                          Analysis
                          <ArrowRight size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

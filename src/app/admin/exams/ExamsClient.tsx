"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Edit2, Trash2, CheckCircle, HelpCircle, Clock, Eye, AlertCircle, Loader2 } from "lucide-react";

interface Exam {
  id: string;
  name: string;
  description: string | null;
  duration: number;
  timerMode: string;
  status: string;
  createdAt: string;
  subjects: string[];
  questionsCount: number;
  attemptsCount: number;
}

export default function ExamsClient() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchExams = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/exams");
      if (!res.ok) throw new Error("Failed to load exams");
      const data = await res.json();
      setExams(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, []);

  const handleCreateDraft = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Untitled Practice Test",
          description: "",
          instructions: "",
          duration: 60,
          timerMode: "OVERALL",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create exam");

      // Redirect to the edit/builder page immediately
      router.push(`/admin/exams/${data.id}/edit`);
    } catch (err: any) {
      alert(err.message || "Failed to create draft");
    } finally {
      setCreating(false);
    }
  };

  const handleTogglePublish = async (exam: Exam) => {
    const newStatus = exam.status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    try {
      const res = await fetch(`/api/admin/exams/${exam.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update exam");
      }

      fetchExams();
    } catch (err: any) {
      alert(err.message || "Failed to update status");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this exam? All candidate attempts for this exam will also be deleted.")) return;

    try {
      const res = await fetch(`/api/admin/exams/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete exam");
      }
      fetchExams();
    } catch (err: any) {
      alert(err.message || "Failed to delete exam");
    }
  };

  const filteredExams = exams.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    (e.description && e.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Exam Management</h1>
          <p className="text-slate-400 text-sm mt-1">Build and configure multi-subject mock tests dynamically</p>
        </div>
        <button
          onClick={handleCreateDraft}
          disabled={creating}
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium px-4 py-2.5 rounded-xl text-sm shadow-lg shadow-indigo-600/10 cursor-pointer"
        >
          {creating ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Plus size={18} />
          )}
          Create Exam Builder
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-800/50 border border-slate-800 rounded-2xl p-4">
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
            <Search size={18} />
          </span>
          <input
            type="text"
            className="w-full bg-slate-950 border border-slate-700/60 rounded-xl py-2 pl-10 pr-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm transition-all"
            placeholder="Search exams..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="text-slate-400 text-sm font-medium">
          Total Exams: {exams.length}
        </div>
      </div>

      {/* Listing Content */}
      <div className="bg-slate-800/40 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="animate-spin text-indigo-500" size={32} />
            <p>Loading exams...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400">{error}</div>
        ) : filteredExams.length === 0 ? (
          <div className="py-20 text-center text-slate-500">
            No exams created yet. Click "Create Exam Builder" to begin.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-850/50">
                  <th className="py-4 px-6">Exam Name</th>
                  <th className="py-4 px-6">Subjects</th>
                  <th className="py-4 px-6 text-center">Duration</th>
                  <th className="py-4 px-6 text-center">Timer Mode</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-center">Questions</th>
                  <th className="py-4 px-6 text-center">Attempts</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 text-sm">
                {filteredExams.map((exam) => (
                  <tr key={exam.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-white">{exam.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{exam.description}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex flex-wrap gap-1">
                        {exam.subjects.length > 0 ? (
                          exam.subjects.map((sub, idx) => (
                            <span 
                              key={idx} 
                              className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-md text-xs font-medium border border-indigo-500/15"
                            >
                              {sub}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-500 italic text-xs">No subjects</span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center text-white font-medium">
                      <span className="inline-flex items-center gap-1.5 justify-center">
                        <Clock size={14} className="text-slate-400" />
                        {exam.duration}m
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        exam.timerMode === "SUBJECT_WISE"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/15"
                          : "bg-slate-750 text-slate-400 border border-slate-700"
                      }`}>
                        {exam.timerMode === "SUBJECT_WISE" ? "Section-wise" : "Overall"}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleTogglePublish(exam)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors cursor-pointer border ${
                          exam.status === "PUBLISHED"
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20"
                        }`}
                        title="Click to toggle Draft / Published"
                      >
                        {exam.status === "PUBLISHED" ? (
                          <>
                            <CheckCircle size={12} />
                            Published
                          </>
                        ) : (
                          <>
                            <AlertCircle size={12} />
                            Draft
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-4 px-6 text-center text-slate-400 font-medium">
                      {exam.questionsCount}
                    </td>
                    <td className="py-4 px-6 text-center text-slate-400 font-medium">
                      {exam.attemptsCount}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2 shrink-0">
                      {/* Preview Button */}
                      <button
                        onClick={() => router.push(`/candidate/exams/${exam.id}/instructions?preview=true`)}
                        className="p-2 hover:bg-slate-700/50 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title="Preview Exam"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        onClick={() => router.push(`/admin/exams/${exam.id}/edit`)}
                        className="p-2 hover:bg-slate-700/50 rounded-lg text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                        title="Configure / Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(exam.id)}
                        className="p-2 hover:bg-rose-500/10 rounded-lg text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                        title="Delete Exam"
                      >
                        <Trash2 size={16} />
                      </button>
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

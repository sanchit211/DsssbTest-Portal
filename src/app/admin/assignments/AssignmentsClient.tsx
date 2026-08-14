"use client";

import { useEffect, useState } from "react";
import { UserCheck, Trash, Plus, Search, Loader2 } from "lucide-react";

interface Candidate {
  id: string;
  name: string;
  email: string;
}

interface Exam {
  id: string;
  name: string;
  duration: number;
}

interface Assignment {
  id: string;
  examId: string;
  userId: string;
  examName: string;
  candidateName: string;
  candidateEmail: string;
  assignedAt: string;
}

export default function AssignmentsClient() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Form State
  const [selectedExamId, setSelectedExamId] = useState("");
  const [selectedCandidateIds, setSelectedCandidateIds] = useState<string[]>([]);
  
  // Filters
  const [search, setSearch] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/assignments");
      if (!res.ok) throw new Error("Failed to load assignments data");
      const data = await res.json();
      setCandidates(data.candidates || []);
      setExams(data.exams || []);
      setAssignments(data.assignments || []);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleToggleCandidate = (candidateId: string) => {
    if (selectedCandidateIds.includes(candidateId)) {
      setSelectedCandidateIds(selectedCandidateIds.filter(id => id !== candidateId));
    } else {
      setSelectedCandidateIds([...selectedCandidateIds, candidateId]);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedExamId) {
      setError("Please select a Mock Exam to assign.");
      return;
    }
    if (selectedCandidateIds.length === 0) {
      setError("Please select at least one Candidate.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/admin/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examId: selectedExamId,
          userIds: selectedCandidateIds,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create assignments");

      setSuccess(data.message || "Exam assigned successfully!");
      setSelectedCandidateIds([]);
      fetchData(); // Reload list
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this assignment? The candidate will lose access to this exam.")) {
      return;
    }

    setError("");
    setSuccess("");
    try {
      const res = await fetch(`/api/admin/assignments?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete assignment");
      }

      setSuccess("Assignment removed successfully!");
      fetchData(); // Reload list
    } catch (err: any) {
      setError(err.message || "An error occurred");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const filteredAssignments = assignments.filter(
    (a) =>
      a.candidateName.toLowerCase().includes(search.toLowerCase()) ||
      a.candidateEmail.toLowerCase().includes(search.toLowerCase()) ||
      a.examName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <UserCheck className="text-indigo-400" />
          Exam Assignments
        </h1>
        <p className="text-slate-400 text-sm mt-1">Assign mock tests to registered candidates and monitor active accesses</p>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-455 p-4 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-sm font-medium">
          {success}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
          <Loader2 className="animate-spin text-indigo-500" size={32} />
          <p>Loading assignments workspace...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left panel: Creator Form */}
          <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 h-fit space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-1.5 pb-2 border-b border-slate-800">
              <Plus size={18} className="text-indigo-400" />
              Assign New Test
            </h2>

            <form onSubmit={handleAssign} className="space-y-6">
              {/* Select Exam */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-350 uppercase tracking-wider block">
                  Select Mock Exam
                </label>
                <select
                  required
                  className="w-full bg-slate-950 border border-slate-750 rounded-xl py-2.5 px-4 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm cursor-pointer"
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                >
                  <option value="">-- Choose Exam --</option>
                  {exams.map((ex) => (
                    <option key={ex.id} value={ex.id}>
                      {ex.name} ({ex.duration} Min)
                    </option>
                  ))}
                </select>
              </div>

              {/* Candidates Checklist */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-355 uppercase tracking-wider block">
                  Select Candidates
                </label>
                {candidates.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">No candidates registered in system.</p>
                ) : (
                  <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-3 max-h-[220px] overflow-y-auto space-y-2.5">
                    {candidates.map((cand) => {
                      const isChecked = selectedCandidateIds.includes(cand.id);
                      return (
                        <button
                          type="button"
                          key={cand.id}
                          onClick={() => handleToggleCandidate(cand.id)}
                          className="w-full flex items-center gap-2 text-left text-xs text-slate-300 hover:text-white cursor-pointer select-none"
                        >
                          <span className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            isChecked ? "bg-indigo-600 border-indigo-500 text-white" : "border-slate-700 bg-slate-900"
                          }`}>
                            {isChecked && (
                              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                            )}
                          </span>
                          <div>
                            <span className="font-bold block leading-tight">{cand.name}</span>
                            <span className="text-[10px] text-slate-500">{cand.email}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={saving || !selectedExamId || selectedCandidateIds.length === 0}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl text-sm shadow-md transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                Assign Test
              </button>
            </form>
          </div>

          {/* Right panel: Active Monitor List */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search filter bar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-800/40 border border-slate-800 rounded-2xl p-4">
              <div className="relative w-full sm:max-w-xs">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  className="w-full bg-slate-950 border border-slate-750 rounded-xl py-2 pl-9 pr-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs transition-all"
                  placeholder="Search assignments..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="text-slate-400 text-xs font-semibold">
                Total Assignments: {assignments.length}
              </div>
            </div>

            {/* List panel */}
            <div className="bg-slate-800/40 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
              {filteredAssignments.length === 0 ? (
                <div className="py-20 text-center text-slate-500 text-sm">
                  No active assignments found. Assign a mock test using the left control panel.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider bg-slate-850/50 font-semibold">
                        <th className="py-3 px-4">Candidate</th>
                        <th className="py-3 px-4">Assigned Exam</th>
                        <th className="py-3 px-4 text-center">Assigned Date</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-350 font-medium">
                      {filteredAssignments.map((a) => (
                        <tr key={a.id} className="hover:bg-slate-800/10 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="text-white font-bold">{a.candidateName}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{a.candidateEmail}</div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-200 font-semibold">
                            {a.examName}
                          </td>
                          <td className="py-3.5 px-4 text-center text-slate-400">
                            {formatDate(a.assignedAt)}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleDelete(a.id)}
                              className="text-rose-500 hover:text-rose-400 p-1.5 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                            >
                              <Trash size={14} />
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
        </div>
      )}
    </div>
  );
}

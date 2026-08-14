"use client";

import { useEffect, useState } from "react";
import { Plus, Search, Edit2, Trash2, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface Subject {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  _count?: {
    questions: number;
  };
}

export default function SubjectsClient() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"ADD" | "EDIT">("ADD");
  const [selectedSubjectId, setSelectedSubjectId] = useState("");
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchSubjects = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/subjects");
      if (!res.ok) throw new Error("Failed to load subjects");
      const data = await res.json();
      setSubjects(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubjects();
  }, []);

  const handleOpenAdd = () => {
    setModalMode("ADD");
    setSelectedSubjectId("");
    setFormName("");
    setFormDesc("");
    setFormActive(true);
    setShowModal(true);
  };

  const handleOpenEdit = (subject: Subject) => {
    setModalMode("EDIT");
    setSelectedSubjectId(subject.id);
    setFormName(subject.name);
    setFormDesc(subject.description || "");
    setFormActive(subject.isActive);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const url = modalMode === "ADD" 
        ? "/api/admin/subjects" 
        : `/api/admin/subjects/${selectedSubjectId}`;
      
      const method = modalMode === "ADD" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          description: formDesc,
          isActive: formActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save subject");

      setShowModal(false);
      fetchSubjects();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subject? All questions associated with this subject will be deleted.")) return;

    try {
      const res = await fetch(`/api/admin/subjects/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete subject");
      }

      fetchSubjects();
    } catch (err: any) {
      alert(err.message || "Failed to delete");
    }
  };

  const filteredSubjects = subjects.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    (s.description && s.description.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Subject Management</h1>
          <p className="text-slate-400 text-sm mt-1">Configure subjects that will be used for exams and questions</p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2.5 rounded-xl text-sm shadow-lg shadow-indigo-600/10 cursor-pointer"
        >
          <Plus size={18} />
          Add Subject
        </button>
      </div>

      {/* Stats/Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-800/50 border border-slate-800 rounded-2xl p-4">
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
            <Search size={18} />
          </span>
          <input
            type="text"
            className="w-full bg-slate-950 border border-slate-700/60 rounded-xl py-2 pl-10 pr-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm transition-all"
            placeholder="Search subjects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="text-slate-400 text-sm font-medium">
          Total Subjects: {subjects.length}
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-slate-800/40 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
            <Loader2 className="animate-spin text-indigo-500" size={32} />
            <p>Loading subjects...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400">{error}</div>
        ) : filteredSubjects.length === 0 ? (
          <div className="py-20 text-center text-slate-500">
            No subjects found. Add a subject to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider bg-slate-850/50">
                  <th className="py-4 px-6">Subject Name</th>
                  <th className="py-4 px-6">Description</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-center">Questions</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300 text-sm">
                {filteredSubjects.map((subject) => (
                  <tr key={subject.id} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-4 px-6 font-semibold text-white">{subject.name}</td>
                    <td className="py-4 px-6 text-slate-400 max-w-xs truncate">
                      {subject.description || <span className="italic text-slate-600">No description</span>}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        subject.isActive 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}>
                        {subject.isActive ? (
                          <>
                            <CheckCircle2 size={12} />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle size={12} />
                            Inactive
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center text-slate-400 font-medium">
                      {subject._count?.questions || 0}
                    </td>
                    <td className="py-4 px-6 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(subject)}
                        className="p-2 hover:bg-slate-700/50 rounded-lg text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                        title="Edit Subject"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(subject.id)}
                        className="p-2 hover:bg-rose-500/10 rounded-lg text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                        title="Delete Subject"
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

      {/* Modal Dialog */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">
                {modalMode === "ADD" ? "Add New Subject" : "Edit Subject"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg p-3 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Subject Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. English"
                  className="w-full bg-slate-950 border border-slate-750 rounded-lg py-2 px-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm transition-all"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Description
                </label>
                <textarea
                  placeholder="Brief description of the subject..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-750 rounded-lg py-2 px-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm transition-all"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-3 py-2">
                <input
                  type="checkbox"
                  id="isActive"
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-700 bg-slate-950 cursor-pointer"
                  checked={formActive}
                  onChange={(e) => setFormActive(e.target.checked)}
                />
                <label htmlFor="isActive" className="text-sm font-medium text-slate-300 cursor-pointer">
                  Activate Subject (Visible when building exams)
                </label>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-sm transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg font-medium text-sm flex items-center gap-2 shadow-lg shadow-indigo-600/10 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Subject"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

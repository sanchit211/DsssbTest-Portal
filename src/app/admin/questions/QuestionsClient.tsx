"use client";

import { useEffect, useState, useRef } from "react";
import { Plus, Search, Edit2, Trash2, Loader2, Download, Upload, HelpCircle, FileText } from "lucide-react";

interface Subject {
  id: string;
  name: string;
}

interface QuestionOption {
  id: string;
  optionCode: string;
  optionText: string;
}

interface Question {
  id: string;
  questionText: string;
  difficulty: string;
  correctAnswer: string;
  explanation: string | null;
  defaultMarks: number;
  defaultNegativeMarks: number;
  subjectId: string;
  subject: {
    name: string;
  };
  options: QuestionOption[];
}

export default function QuestionsClient() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [difficultyFilter, setDifficultyFilter] = useState("all");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"ADD" | "EDIT">("ADD");
  const [selectedQuestionId, setSelectedQuestionId] = useState("");

  // Form State
  const [formText, setFormText] = useState("");
  const [formSubjectId, setFormSubjectId] = useState("");
  const [formDifficulty, setFormDifficulty] = useState("MEDIUM");
  const [formMarks, setFormMarks] = useState("2.0");
  const [formNegMarks, setFormNegMarks] = useState("0.5");
  const [optA, setOptA] = useState("");
  const [optB, setOptB] = useState("");
  const [optC, setOptC] = useState("");
  const [optD, setOptD] = useState("");
  const [formCorrect, setFormCorrect] = useState("A");
  const [formExplanation, setFormExplanation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // CSV Import State
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      // Fetch subjects for select menus
      const subRes = await fetch("/api/admin/subjects");
      if (!subRes.ok) throw new Error("Failed to load subjects");
      const subData = await subRes.json();
      setSubjects(subData);

      // Fetch questions
      const qRes = await fetch("/api/admin/questions");
      if (!qRes.ok) throw new Error("Failed to load questions");
      const qData = await qRes.json();
      setQuestions(qData);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const handleOpenAdd = () => {
    setModalMode("ADD");
    setSelectedQuestionId("");
    setFormText("");
    setFormSubjectId(subjects[0]?.id || "");
    setFormDifficulty("MEDIUM");
    setFormMarks("2.0");
    setFormNegMarks("0.5");
    setOptA("");
    setOptB("");
    setOptC("");
    setOptD("");
    setFormCorrect("A");
    setFormExplanation("");
    setShowModal(true);
  };

  const handleOpenEdit = (q: Question) => {
    setModalMode("EDIT");
    setSelectedQuestionId(q.id);
    setFormText(q.questionText);
    setFormSubjectId(q.subjectId);
    setFormDifficulty(q.difficulty);
    setFormMarks(q.defaultMarks.toString());
    setFormNegMarks(q.defaultNegativeMarks.toString());
    
    // Map options
    const oA = q.options.find(o => o.optionCode === "A")?.optionText || "";
    const oB = q.options.find(o => o.optionCode === "B")?.optionText || "";
    const oC = q.options.find(o => o.optionCode === "C")?.optionText || "";
    const oD = q.options.find(o => o.optionCode === "D")?.optionText || "";
    
    setOptA(oA);
    setOptB(oB);
    setOptC(oC);
    setOptD(oD);
    setFormCorrect(q.correctAnswer);
    setFormExplanation(q.explanation || "");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const options = [
      { optionCode: "A", optionText: optA },
      { optionCode: "B", optionText: optB },
      { optionCode: "C", optionText: optC },
      { optionCode: "D", optionText: optD },
    ].filter(o => o.optionText.trim() !== "");

    if (options.length < 2) {
      setError("Please provide at least 2 options.");
      setSubmitting(false);
      return;
    }

    try {
      const url = modalMode === "ADD" 
        ? "/api/admin/questions" 
        : `/api/admin/questions/${selectedQuestionId}`;
      
      const method = modalMode === "ADD" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionText: formText,
          options,
          correctAnswer: formCorrect,
          explanation: formExplanation,
          difficulty: formDifficulty,
          subjectId: formSubjectId,
          defaultMarks: parseFloat(formMarks),
          defaultNegativeMarks: parseFloat(formNegMarks),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save question");

      setShowModal(false);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this question? It will be removed from all exams containing it.")) return;

    try {
      const res = await fetch(`/api/admin/questions/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete question");
      }

      fetchInitialData();
    } catch (err: any) {
      alert(err.message || "Failed to delete question");
    }
  };

  // CSV Template Download
  const downloadCSVTemplate = () => {
    const headers = [
      "Question",
      "Option A",
      "Option B",
      "Option C",
      "Option D",
      "Correct Answer",
      "Explanation",
      "Subject",
      "Difficulty",
      "Marks",
      "Negative Marks"
    ];
    const sampleRow = [
      "Select the synonym of 'Abundant'.",
      "Rare",
      "Scarce",
      "Plentiful",
      "Limited",
      "C",
      "Plentiful means existing in large quantities.",
      "English",
      "EASY",
      "2.0",
      "0.5"
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), sampleRow.join(",")].join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "questions_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Import File Handler
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/questions/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to import questions");

      alert(`Successfully imported ${data.count} questions!`);
      fetchInitialData();
    } catch (err: any) {
      setError(err.message || "Failed to parse and import CSV file");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Filtered Questions
  const filteredQuestions = questions.filter((q) => {
    const matchesSearch = q.questionText.toLowerCase().includes(search.toLowerCase());
    const matchesSubject = subjectFilter === "all" || q.subjectId === subjectFilter;
    const matchesDifficulty = difficultyFilter === "all" || q.difficulty === difficultyFilter;
    return matchesSearch && matchesSubject && matchesDifficulty;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Question Bank</h1>
          <p className="text-slate-400 text-sm mt-1">Manage and organize exam questions across subjects</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={downloadCSVTemplate}
            className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-4 py-2.5 rounded-xl text-sm border border-slate-700 transition-colors cursor-pointer"
            title="Download CSV Import Template"
          >
            <Download size={18} />
            Template
          </button>
          
          <input
            type="file"
            accept=".csv"
            ref={fileInputRef}
            onChange={handleCSVUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-medium px-4 py-2.5 rounded-xl text-sm border border-slate-700 transition-colors cursor-pointer"
            title="Import Questions from CSV"
          >
            {importing ? (
              <Loader2 size={18} className="animate-spin text-indigo-400" />
            ) : (
              <Upload size={18} />
            )}
            Import CSV
          </button>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2.5 rounded-xl text-sm shadow-lg shadow-indigo-600/10 cursor-pointer"
          >
            <Plus size={18} />
            Add Question
          </button>
        </div>
      </div>

      {/* Filters Box */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center justify-between bg-slate-800/50 border border-slate-800 rounded-2xl p-4">
        {/* Search */}
        <div className="relative col-span-1 md:col-span-2">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
            <Search size={18} />
          </span>
          <input
            type="text"
            className="w-full bg-slate-950 border border-slate-700/60 rounded-xl py-2 pl-10 pr-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm transition-all"
            placeholder="Search questions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Subject Filter */}
        <div>
          <select
            className="w-full bg-slate-950 border border-slate-700/60 rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm cursor-pointer"
            value={subjectFilter}
            onChange={(e) => setSubjectFilter(e.target.value)}
          >
            <option value="all">All Subjects</option>
            {subjects.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        {/* Difficulty Filter */}
        <div>
          <select
            className="w-full bg-slate-950 border border-slate-700/60 rounded-xl py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm cursor-pointer"
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
          >
            <option value="all">All Difficulties</option>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </div>
      </div>

      {/* Main Listing */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 bg-slate-800/40 border border-slate-800 rounded-2xl">
            <Loader2 className="animate-spin text-indigo-500" size={32} />
            <p>Loading questions...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 bg-slate-800/40 border border-slate-800 rounded-2xl">{error}</div>
        ) : filteredQuestions.length === 0 ? (
          <div className="py-20 text-center text-slate-500 bg-slate-800/40 border border-slate-800 rounded-2xl">
            No questions found. Click "Add Question" to create one.
          </div>
        ) : (
          filteredQuestions.map((q) => (
            <div 
              key={q.id} 
              className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 hover:border-slate-750 transition-all flex flex-col md:flex-row justify-between gap-6"
            >
              {/* Left Column: Question Details */}
              <div className="space-y-4 flex-1">
                {/* Meta Badges */}
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="bg-indigo-500/10 text-indigo-400 px-2.5 py-0.5 rounded-full border border-indigo-500/20 font-medium">
                    {q.subject.name}
                  </span>
                  <span className={`px-2.5 py-0.5 rounded-full border font-medium ${
                    q.difficulty === "EASY" 
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : q.difficulty === "MEDIUM"
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                      : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  }`}>
                    {q.difficulty}
                  </span>
                  <span className="bg-slate-750 text-slate-400 px-2.5 py-0.5 rounded-full border border-slate-700">
                    Marks: +{q.defaultMarks} / -{q.defaultNegativeMarks}
                  </span>
                </div>

                {/* Question Text */}
                <h3 className="text-white font-medium text-base leading-relaxed">
                  {q.questionText}
                </h3>

                {/* Options Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {q.options.map((opt) => (
                    <div 
                      key={opt.id} 
                      className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm ${
                        opt.optionCode === q.correctAnswer
                          ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-400"
                          : "bg-slate-900/40 border-slate-800 text-slate-400"
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        opt.optionCode === q.correctAnswer
                          ? "bg-emerald-500 text-slate-950"
                          : "bg-slate-800 text-slate-500"
                      }`}>
                        {opt.optionCode}
                      </span>
                      <span>{opt.optionText}</span>
                    </div>
                  ))}
                </div>

                {/* Explanation */}
                {q.explanation && (
                  <div className="bg-slate-900/30 border border-slate-800/80 rounded-xl p-4 text-sm text-slate-400">
                    <span className="font-semibold text-slate-300 block mb-1">Explanation:</span>
                    {q.explanation}
                  </div>
                )}
              </div>

              {/* Right Column: Actions */}
              <div className="flex md:flex-col justify-end gap-2 shrink-0">
                <button
                  onClick={() => handleOpenEdit(q)}
                  className="p-2.5 hover:bg-slate-700/50 rounded-xl text-indigo-400 hover:text-indigo-300 transition-colors border border-slate-700/60 cursor-pointer"
                  title="Edit Question"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(q.id)}
                  className="p-2.5 hover:bg-rose-500/10 rounded-xl text-rose-400 hover:text-rose-300 transition-colors border border-slate-700/60 cursor-pointer"
                  title="Delete Question"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Modal Dialog */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-slate-800 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden my-8">
            {/* Header */}
            <div className="p-6 border-b border-slate-700 flex justify-between items-center bg-slate-850">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <HelpCircle className="text-indigo-400" />
                {modalMode === "ADD" ? "Create Question" : "Edit Question"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-sm font-medium"
              >
                Close
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {error && (
                <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg p-3 text-sm">
                  {error}
                </div>
              )}

              {/* Subject & Difficulty row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    Subject
                  </label>
                  <select
                    className="w-full bg-slate-950 border border-slate-750 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm cursor-pointer"
                    value={formSubjectId}
                    onChange={(e) => setFormSubjectId(e.target.value)}
                  >
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    Difficulty Level
                  </label>
                  <select
                    className="w-full bg-slate-950 border border-slate-750 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm cursor-pointer"
                    value={formDifficulty}
                    onChange={(e) => setFormDifficulty(e.target.value)}
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
              </div>

              {/* Marks & Negative Marks row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    Correct Marks
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    className="w-full bg-slate-950 border border-slate-750 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm"
                    value={formMarks}
                    onChange={(e) => setFormMarks(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    Negative Marks (Positive value)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    className="w-full bg-slate-950 border border-slate-750 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm"
                    value={formNegMarks}
                    onChange={(e) => setFormNegMarks(e.target.value)}
                  />
                </div>
              </div>

              {/* Question Text */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Question Text
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Enter the MCQ question..."
                  className="w-full bg-slate-950 border border-slate-750 rounded-lg py-2.5 px-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm transition-all"
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                />
              </div>

              {/* Options */}
              <div className="space-y-3 bg-slate-900/40 p-4 border border-slate-750 rounded-2xl">
                <h3 className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-2">Options</h3>
                
                {/* A */}
                <div className="flex gap-3 items-center">
                  <span className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-sm shrink-0">A</span>
                  <input
                    type="text"
                    required
                    placeholder="Option A content..."
                    className="flex-1 bg-slate-950 border border-slate-750 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm"
                    value={optA}
                    onChange={(e) => setOptA(e.target.value)}
                  />
                </div>

                {/* B */}
                <div className="flex gap-3 items-center">
                  <span className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-sm shrink-0">B</span>
                  <input
                    type="text"
                    required
                    placeholder="Option B content..."
                    className="flex-1 bg-slate-950 border border-slate-750 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm"
                    value={optB}
                    onChange={(e) => setOptB(e.target.value)}
                  />
                </div>

                {/* C */}
                <div className="flex gap-3 items-center">
                  <span className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-sm shrink-0">C</span>
                  <input
                    type="text"
                    placeholder="Option C content (Optional)..."
                    className="flex-1 bg-slate-950 border border-slate-750 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm"
                    value={optC}
                    onChange={(e) => setOptC(e.target.value)}
                  />
                </div>

                {/* D */}
                <div className="flex gap-3 items-center">
                  <span className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-sm shrink-0">D</span>
                  <input
                    type="text"
                    placeholder="Option D content (Optional)..."
                    className="flex-1 bg-slate-950 border border-slate-750 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm"
                    value={optD}
                    onChange={(e) => setOptD(e.target.value)}
                  />
                </div>
              </div>

              {/* Correct Answer */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Correct Option Code
                </label>
                <select
                  className="w-full bg-slate-950 border border-slate-750 rounded-lg py-2 px-3 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm cursor-pointer"
                  value={formCorrect}
                  onChange={(e) => setFormCorrect(e.target.value)}
                >
                  <option value="A">Option A</option>
                  <option value="B">Option B</option>
                  {optC.trim() !== "" && <option value="C">Option C</option>}
                  {optD.trim() !== "" && <option value="D">Option D</option>}
                </select>
              </div>

              {/* Explanation */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Explanation / Solution Details
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain why the chosen option is correct..."
                  className="w-full bg-slate-950 border border-slate-750 rounded-lg py-2 px-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-sm transition-all"
                  value={formExplanation}
                  onChange={(e) => setFormExplanation(e.target.value)}
                />
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
                    "Save Question"
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

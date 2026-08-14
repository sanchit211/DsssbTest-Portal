"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Settings, 
  BookOpen, 
  HelpCircle, 
  Loader2, 
  Check, 
  ChevronRight,
  ChevronLeft,
  X,
  Shuffle,
  Plus,
  Search
} from "lucide-react";

interface Subject {
  id: string;
  name: string;
}

interface Question {
  id: string;
  questionText: string;
  difficulty: string;
  subjectId: string;
  options: { optionCode: string; optionText: string }[];
}

interface ExamSubjectConfig {
  subjectId: string;
  questionCount: number;
  duration: number;
  marks: number;
  negativeMarks: number;
  questionSelection: string;
}

export default function EditExamClient({ examId }: { examId: string }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Step 1: Basic Config State
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [instructions, setInstructions] = useState("");
  const [duration, setDuration] = useState(60);
  const [timerMode, setTimerMode] = useState("OVERALL");
  const [status, setStatus] = useState("DRAFT");

  // Step 2: Subject Selection State
  const [selectedSubjects, setSelectedSubjects] = useState<ExamSubjectConfig[]>([]);

  // Step 3: Question Selector State
  const [examQuestions, setExamQuestions] = useState<any[]>([]); // current linked questions
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [activeSelectSubjectId, setActiveSelectSubjectId] = useState("");
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]); // questions from bank
  const [bankSearch, setBankSearch] = useState("");
  const [tempSelectedQIds, setTempSelectedQIds] = useState<string[]>([]);
  
  // Random Generation distribution states
  const [randomDist, setRandomDist] = useState<Record<string, { easy: number; medium: number; hard: number }>>({});

  const fetchExamData = async () => {
    try {
      setLoading(true);
      setError("");

      // Fetch active subjects
      const subRes = await fetch("/api/admin/subjects");
      if (!subRes.ok) throw new Error("Failed to load subjects");
      const subData = await subRes.json();
      setAllSubjects(subData.filter((s: any) => s.isActive));

      // Fetch exam config
      const examRes = await fetch(`/api/admin/exams/${examId}`);
      if (!examRes.ok) throw new Error("Failed to load exam details");
      const examData = await examRes.json();

      setName(examData.name);
      setDescription(examData.description || "");
      setInstructions(examData.instructions || "");
      setDuration(examData.duration);
      setTimerMode(examData.timerMode);
      setStatus(examData.status);

      // Load subjects configs
      if (examData.subjects && examData.subjects.length > 0) {
        setSelectedSubjects(examData.subjects.map((es: any) => ({
          subjectId: es.subjectId,
          questionCount: es.questionCount,
          duration: es.duration,
          marks: es.marks,
          negativeMarks: es.negativeMarks,
          questionSelection: es.questionSelection,
        })));
      }

      // Load current linked questions
      setExamQuestions(examData.questions || []);

    } catch (err: any) {
      setError(err.message || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExamData();
  }, [examId]);

  // Handle Basic details Save
  const handleSaveStep1 = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError("");
    setMessage("");

    try {
      const res = await fetch(`/api/admin/exams/${examId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          instructions,
          duration,
          timerMode,
          status,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save details");
      }

      setMessage("Basic settings saved successfully.");
      setStep(2);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    }
  };

  // Toggle Subject selection
  const handleToggleSubject = (subjectId: string) => {
    const exists = selectedSubjects.find(s => s.subjectId === subjectId);
    if (exists) {
      setSelectedSubjects(selectedSubjects.filter(s => s.subjectId !== subjectId));
    } else {
      setSelectedSubjects([
        ...selectedSubjects,
        {
          subjectId,
          questionCount: 10,
          duration: 10,
          marks: 2.0,
          negativeMarks: 0.5,
          questionSelection: "MANUAL",
        }
      ]);
    }
  };

  // Update configuration parameters for a subject
  const handleUpdateSubConfig = (subjectId: string, fields: Partial<ExamSubjectConfig>) => {
    setSelectedSubjects(selectedSubjects.map((sub) => {
      if (sub.subjectId === subjectId) {
        return { ...sub, ...fields };
      }
      return sub;
    }));
  };

  // Handle Subjects config Save
  const handleSaveStep2 = async () => {
    setError("");
    setMessage("");

    if (selectedSubjects.length === 0) {
      setError("Please select at least one subject for the exam.");
      return;
    }

    // Verify times sum up if subject-wise
    if (timerMode === "SUBJECT_WISE") {
      const totalSubjectTime = selectedSubjects.reduce((sum, s) => sum + s.duration, 0);
      setDuration(totalSubjectTime);
    }

    try {
      const res = await fetch(`/api/admin/exams/${examId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          duration: timerMode === "SUBJECT_WISE" 
            ? selectedSubjects.reduce((sum, s) => sum + s.duration, 0)
            : duration,
          subjects: selectedSubjects,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save subjects configuration");
      }

      // Refresh linked questions list after configuration updates
      const updatedRes = await fetch(`/api/admin/exams/${examId}`);
      const updatedData = await updatedRes.json();
      setExamQuestions(updatedData.questions || []);

      setMessage("Subject configuration saved successfully.");
      setStep(3);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    }
  };

  // Handle Question selector open
  const handleOpenQuestionSelector = async (subjectId: string) => {
    setActiveSelectSubjectId(subjectId);
    setBankSearch("");
    setShowQuestionModal(true);

    try {
      // Fetch questions belonging to this subject
      const res = await fetch(`/api/admin/questions?subjectId=${subjectId}`);
      if (!res.ok) throw new Error("Failed to fetch questions");
      const data = await res.json();
      setBankQuestions(data);

      // Extract current selected question IDs for this subject
      const currentSelected = examQuestions
        .filter((eq: any) => eq.question.subjectId === subjectId)
        .map((eq: any) => eq.questionId);
      
      setTempSelectedQIds(currentSelected);
    } catch (err) {
      console.error(err);
    }
  };

  // Save manual question selections
  const handleSaveManualQuestions = async () => {
    setError("");
    try {
      // Gather other subjects' questions (which we should keep unchanged)
      const otherQuestions = examQuestions
        .filter((eq: any) => eq.question.subjectId !== activeSelectSubjectId)
        .map((eq: any) => eq.questionId);

      const combinedQIds = [...otherQuestions, ...tempSelectedQIds];

      const res = await fetch(`/api/admin/exams/${examId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionIds: combinedQIds,
        }),
      });

      if (!res.ok) throw new Error("Failed to update exam questions");

      // Reload config
      const reloadRes = await fetch(`/api/admin/exams/${examId}`);
      const reloadData = await reloadRes.json();
      setExamQuestions(reloadData.questions || []);

      setShowQuestionModal(false);
    } catch (err: any) {
      alert(err.message || "Failed to save questions");
    }
  };

  // Handle Random question generation
  const handleGenerateRandom = async (subConfig: ExamSubjectConfig) => {
    setError("");
    setMessage("");

    const dist = randomDist[subConfig.subjectId] || { easy: 0, medium: 0, hard: 0 };
    const hasDist = dist.easy > 0 || dist.medium > 0 || dist.hard > 0;
    
    const payload: any = {
      subjectId: subConfig.subjectId,
      count: subConfig.questionCount,
    };

    if (hasDist) {
      if (dist.easy + dist.medium + dist.hard !== subConfig.questionCount) {
        setError(`Random distribution sum (${dist.easy + dist.medium + dist.hard}) must match question count (${subConfig.questionCount})`);
        return;
      }
      payload.easyCount = dist.easy;
      payload.mediumCount = dist.medium;
      payload.hardCount = dist.hard;
    }

    try {
      const res = await fetch(`/api/admin/exams/${examId}/generate-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate random questions");

      // Reload exam detailed config
      const reloadRes = await fetch(`/api/admin/exams/${examId}`);
      const reloadData = await reloadRes.json();
      setExamQuestions(reloadData.questions || []);

      alert(`Successfully generated ${data.count} random questions for subject!`);
    } catch (err: any) {
      setError(err.message || "Failed to generate");
    }
  };

  const handleFinish = async () => {
    // Make sure status is set correctly, save finally, and redirect
    try {
      await fetch(`/api/admin/exams/${examId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.push("/admin/exams");
    } catch (err) {
      router.push("/admin/exams");
    }
  };

  // Render Steps UI
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Back Link */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/admin/exams")}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">Exam Builder</h1>
          <p className="text-slate-400 text-xs mt-0.5">Configure exam settings, subjects, and questions</p>
        </div>
      </div>

      {/* Stepper Wizard Indicator */}
      <div className="flex justify-between items-center bg-slate-800/40 border border-slate-850 p-4 rounded-2xl">
        <div className="flex items-center gap-2">
          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
            step >= 1 ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-400"
          }`}>
            {step > 1 ? <Check size={16} /> : "1"}
          </span>
          <span className="text-sm font-semibold text-slate-200">Basic Settings</span>
        </div>
        <div className="h-0.5 bg-slate-800 flex-1 mx-4 max-w-[80px]" />
        <div className="flex items-center gap-2">
          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
            step >= 2 ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-400"
          }`}>
            {step > 2 ? <Check size={16} /> : "2"}
          </span>
          <span className="text-sm font-semibold text-slate-200">Subjects config</span>
        </div>
        <div className="h-0.5 bg-slate-800 flex-1 mx-4 max-w-[80px]" />
        <div className="flex items-center gap-2">
          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
            step >= 3 ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-400"
          }`}>
            "3"
          </span>
          <span className="text-sm font-semibold text-slate-200">Question Bank Mapping</span>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-sm font-medium">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400 bg-slate-800/40 border border-slate-800 rounded-2xl">
          <Loader2 className="animate-spin text-indigo-500" size={32} />
          <p>Loading configuration details...</p>
        </div>
      ) : (
        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-6 backdrop-blur-sm">
          {/* STEP 1: Basic Config Form */}
          {step === 1 && (
            <form onSubmit={handleSaveStep1} className="space-y-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
                <Settings className="text-indigo-400" size={20} />
                Step 1: Exam General Details
              </h2>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Exam Title / Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. SSC CGL Full Mock Test 01"
                  className="w-full bg-slate-950 border border-slate-750 rounded-xl py-2.5 px-4 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm transition-all"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Timer Mode */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    Timer Allocation Mode
                  </label>
                  <select
                    className="w-full bg-slate-950 border border-slate-750 rounded-xl py-2.5 px-4 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm cursor-pointer"
                    value={timerMode}
                    onChange={(e) => setTimerMode(e.target.value)}
                  >
                    <option value="OVERALL">Overall continuous Exam Timer</option>
                    <option value="SUBJECT_WISE">Subject-wise individual Timers</option>
                  </select>
                </div>

                {/* Duration (Only editable if overall timer mode) */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    Total Duration (Minutes)
                  </label>
                  <input
                    type="number"
                    required
                    disabled={timerMode === "SUBJECT_WISE"}
                    className="w-full bg-slate-950 border border-slate-750 rounded-xl py-2.5 px-4 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm disabled:opacity-50"
                    placeholder="e.g. 60"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                  />
                  {timerMode === "SUBJECT_WISE" && (
                    <span className="text-xs text-slate-500 italic block mt-1">
                      Calculated automatically as the sum of subject timers in Step 2.
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Max Attempts */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    Maximum Allowed Attempts
                  </label>
                  <select
                    className="w-full bg-slate-950 border border-slate-750 rounded-xl py-2.5 px-4 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm cursor-pointer"
                    value="-1"
                    disabled
                  >
                    <option value="-1">Unlimited Attempts</option>
                  </select>
                </div>

                {/* Status */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    Exam Status
                  </label>
                  <select
                    className="w-full bg-slate-950 border border-slate-750 rounded-xl py-2.5 px-4 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm cursor-pointer"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="DRAFT">Draft (Hidden from Candidates)</option>
                    <option value="PUBLISHED">Published (Available for Candidates)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Description / Short Intro
                </label>
                <textarea
                  rows={2}
                  placeholder="Summary of the exam structure..."
                  className="w-full bg-slate-950 border border-slate-750 rounded-xl py-2.5 px-4 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm transition-all"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Candidate Instructions
                </label>
                <textarea
                  rows={4}
                  placeholder="Enter details candidates see before clicking 'Start Exam'..."
                  className="w-full bg-slate-950 border border-slate-750 rounded-xl py-2.5 px-4 text-slate-200 focus:outline-none focus:border-indigo-500 text-sm transition-all"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                />
              </div>

              {/* Step 1 Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-xl text-sm shadow-lg shadow-indigo-600/10 cursor-pointer"
                >
                  Save & Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Subject Selection & Config */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
                <BookOpen className="text-indigo-400" size={20} />
                Step 2: Subject Configuration
              </h2>

              {/* Subject Choice Checkboxes */}
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Select Subjects to Include
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {allSubjects.map((sub) => {
                    const isSelected = !!selectedSubjects.find(s => s.subjectId === sub.id);
                    return (
                      <button
                        key={sub.id}
                        onClick={() => handleToggleSubject(sub.id)}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border text-sm font-medium transition-all text-left cursor-pointer ${
                          isSelected
                            ? "bg-indigo-600/15 border-indigo-600 text-white"
                            : "bg-slate-900/40 border-slate-855 text-slate-400 hover:bg-slate-900/60"
                        }`}
                      >
                        <span className={`w-4 h-4 rounded border flex items-center justify-center ${
                          isSelected ? "bg-indigo-600 border-indigo-500 text-white" : "border-slate-600 bg-slate-950"
                        }`}>
                          {isSelected && <Check size={12} />}
                        </span>
                        {sub.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Config fields for selected subjects */}
              {selectedSubjects.length > 0 && (
                <div className="space-y-4 pt-4">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    Configure Individual Subjects
                  </label>

                  <div className="space-y-4">
                    {selectedSubjects.map((subConfig) => {
                      const subjectName = allSubjects.find(s => s.id === subConfig.subjectId)?.name || "Subject";
                      return (
                        <div 
                          key={subConfig.subjectId} 
                          className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-white">{subjectName}</span>
                            <span className="text-xs text-slate-400">subject ID: {subConfig.subjectId.slice(0, 8)}...</span>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {/* Question Count */}
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-slate-400 block">Questions Count</label>
                              <input
                                type="number"
                                className="w-full bg-slate-950 border border-slate-750 rounded-lg py-1.5 px-3 text-slate-200 text-sm focus:outline-none"
                                value={subConfig.questionCount}
                                onChange={(e) => handleUpdateSubConfig(subConfig.subjectId, { questionCount: Number(e.target.value) })}
                              />
                            </div>

                            {/* Section Timer (Only enabled if subject wise timer mode) */}
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-slate-400 block">
                                Duration (Min)
                              </label>
                              <input
                                type="number"
                                disabled={timerMode !== "SUBJECT_WISE"}
                                className="w-full bg-slate-950 border border-slate-750 rounded-lg py-1.5 px-3 text-slate-200 text-sm focus:outline-none disabled:opacity-40"
                                value={timerMode === "SUBJECT_WISE" ? subConfig.duration : 0}
                                onChange={(e) => handleUpdateSubConfig(subConfig.subjectId, { duration: Number(e.target.value) })}
                              />
                            </div>

                            {/* Marks per Correct */}
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-slate-400 block">Correct Marks</label>
                              <input
                                type="number"
                                step="0.1"
                                className="w-full bg-slate-950 border border-slate-750 rounded-lg py-1.5 px-3 text-slate-200 text-sm focus:outline-none"
                                value={subConfig.marks}
                                onChange={(e) => handleUpdateSubConfig(subConfig.subjectId, { marks: parseFloat(e.target.value) })}
                              />
                            </div>

                            {/* Negative Marks */}
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-slate-400 block">Negative Marks</label>
                              <input
                                type="number"
                                step="0.1"
                                className="w-full bg-slate-950 border border-slate-750 rounded-lg py-1.5 px-3 text-slate-200 text-sm focus:outline-none"
                                value={subConfig.negativeMarks}
                                onChange={(e) => handleUpdateSubConfig(subConfig.subjectId, { negativeMarks: parseFloat(e.target.value) })}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 2 Actions */}
              <div className="flex justify-between gap-3 pt-4 border-t border-slate-800">
                <button
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-350 font-medium px-4 py-2 rounded-xl text-sm transition-colors cursor-pointer"
                >
                  <ChevronLeft size={16} />
                  Back
                </button>
                <button
                  onClick={handleSaveStep2}
                  className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-5 py-2.5 rounded-xl text-sm shadow-lg shadow-indigo-600/10 cursor-pointer"
                >
                  Save & Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Question Selection */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4 pb-2 border-b border-slate-800">
                <HelpCircle className="text-indigo-400" size={20} />
                Step 3: Question Bank Mapping
              </h2>

              <div className="space-y-6">
                {selectedSubjects.map((subConfig) => {
                  const subjectName = allSubjects.find(s => s.id === subConfig.subjectId)?.name || "Subject";
                  const subjectQuestions = examQuestions.filter((eq: any) => eq.question.subjectId === subConfig.subjectId);
                  
                  return (
                    <div 
                      key={subConfig.subjectId} 
                      className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 space-y-4"
                    >
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                          <h3 className="font-bold text-white text-base">{subjectName}</h3>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Target Count: <span className="font-semibold text-indigo-400">{subConfig.questionCount}</span> | Current Selected: <span className="font-semibold text-indigo-400">{subjectQuestions.length}</span>
                          </p>
                        </div>
                        {/* Selector Choice Toggle */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleUpdateSubConfig(subConfig.subjectId, { questionSelection: "MANUAL" })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              subConfig.questionSelection === "MANUAL"
                                ? "bg-indigo-600/10 border-indigo-600 text-white"
                                : "bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-400"
                            }`}
                          >
                            Manual Select
                          </button>
                          <button
                            onClick={() => handleUpdateSubConfig(subConfig.subjectId, { questionSelection: "RANDOM" })}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                              subConfig.questionSelection === "RANDOM"
                                ? "bg-indigo-600/10 border-indigo-600 text-white"
                                : "bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-400"
                            }`}
                          >
                            Random Select
                          </button>
                        </div>
                      </div>

                      {/* Display based on selection mode */}
                      {subConfig.questionSelection === "MANUAL" ? (
                        <div className="space-y-3">
                          <button
                            onClick={() => handleOpenQuestionSelector(subConfig.subjectId)}
                            className="inline-flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 font-semibold border border-indigo-500/25 px-3 py-1.5 rounded-lg bg-indigo-500/5 transition-colors cursor-pointer"
                          >
                            <Plus size={14} />
                            Select Specific Questions ({subjectQuestions.length})
                          </button>

                          {subjectQuestions.length > 0 && (
                            <div className="bg-slate-950/65 border border-slate-850 rounded-xl p-3 divide-y divide-slate-850 max-h-[180px] overflow-y-auto">
                              {subjectQuestions.map((eq: any, idx: number) => (
                                <div key={eq.id} className="py-2 text-xs text-slate-300 flex items-center justify-between">
                                  <span className="truncate max-w-[500px]">
                                    {idx + 1}. {eq.question.questionText}
                                  </span>
                                  <span className="bg-slate-800 px-2 py-0.5 rounded text-[10px] uppercase text-slate-500">
                                    {eq.question.difficulty}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-4 bg-slate-950/50 p-4 border border-slate-850 rounded-xl">
                          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <span className="text-xs text-slate-400 font-medium">
                              Optional Difficulty distribution (Easy / Medium / Hard)
                            </span>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                placeholder="Easy"
                                className="w-16 bg-slate-950 border border-slate-750 rounded py-1 px-2 text-xs text-center focus:outline-none"
                                value={randomDist[subConfig.subjectId]?.easy ?? 0}
                                onChange={(e) => setRandomDist({
                                  ...randomDist,
                                  [subConfig.subjectId]: {
                                    ...(randomDist[subConfig.subjectId] || { easy: 0, medium: 0, hard: 0 }),
                                    easy: Number(e.target.value),
                                  }
                                })}
                              />
                              <input
                                type="number"
                                placeholder="Med"
                                className="w-16 bg-slate-950 border border-slate-750 rounded py-1 px-2 text-xs text-center focus:outline-none"
                                value={randomDist[subConfig.subjectId]?.medium ?? 0}
                                onChange={(e) => setRandomDist({
                                  ...randomDist,
                                  [subConfig.subjectId]: {
                                    ...(randomDist[subConfig.subjectId] || { easy: 0, medium: 0, hard: 0 }),
                                    medium: Number(e.target.value),
                                  }
                                })}
                              />
                              <input
                                type="number"
                                placeholder="Hard"
                                className="w-16 bg-slate-950 border border-slate-750 rounded py-1 px-2 text-xs text-center focus:outline-none"
                                value={randomDist[subConfig.subjectId]?.hard ?? 0}
                                onChange={(e) => setRandomDist({
                                  ...randomDist,
                                  [subConfig.subjectId]: {
                                    ...(randomDist[subConfig.subjectId] || { easy: 0, medium: 0, hard: 0 }),
                                    hard: Number(e.target.value),
                                  }
                                })}
                              />
                            </div>
                          </div>

                          <button
                            onClick={() => handleGenerateRandom(subConfig)}
                            className="w-full inline-flex items-center justify-center gap-2 text-xs text-indigo-400 hover:text-indigo-300 font-semibold border border-indigo-500/25 py-2 rounded-lg bg-indigo-500/5 transition-colors cursor-pointer"
                          >
                            <Shuffle size={14} />
                            Generate Random Selection ({subConfig.questionCount} Questions)
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Step 3 Actions */}
              <div className="flex justify-between gap-3 pt-4 border-t border-slate-800">
                <button
                  onClick={() => setStep(2)}
                  className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-350 font-medium px-4 py-2 rounded-xl text-sm transition-colors cursor-pointer"
                >
                  <ChevronLeft size={16} />
                  Back
                </button>
                <button
                  onClick={handleFinish}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium px-5 py-2.5 rounded-xl text-sm shadow-lg shadow-emerald-600/10 cursor-pointer"
                >
                  Finish & Save
                  <Check size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Selection Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-850 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-750 flex justify-between items-center bg-slate-900/50">
              <h3 className="text-lg font-bold text-white">Select Subject Questions</h3>
              <button 
                onClick={() => setShowQuestionModal(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content & List */}
            <div className="p-5 space-y-4">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-500">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  className="w-full bg-slate-950 border border-slate-750 rounded-xl py-2 pl-9 pr-4 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs transition-all"
                  placeholder="Search question text..."
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                />
              </div>

              {/* Questions List */}
              <div className="space-y-2 max-h-[300px] overflow-y-auto divide-y divide-slate-800/50 bg-slate-950/50 border border-slate-750 p-2.5 rounded-xl">
                {bankQuestions
                  .filter(q => q.questionText.toLowerCase().includes(bankSearch.toLowerCase()))
                  .map((q) => {
                    const isChecked = tempSelectedQIds.includes(q.id);
                    return (
                      <button
                        key={q.id}
                        onClick={() => {
                          if (isChecked) {
                            setTempSelectedQIds(tempSelectedQIds.filter(id => id !== q.id));
                          } else {
                            setTempSelectedQIds([...tempSelectedQIds, q.id]);
                          }
                        }}
                        className="w-full flex items-start gap-3 py-2.5 text-left text-xs hover:bg-slate-900/30 px-2 rounded-lg cursor-pointer"
                      >
                        <span className={`w-4 h-4 rounded border shrink-0 mt-0.5 flex items-center justify-center ${
                          isChecked ? "bg-indigo-600 border-indigo-500 text-white" : "border-slate-700 bg-slate-900"
                        }`}>
                          {isChecked && <Check size={12} />}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-slate-250 leading-relaxed font-medium truncate">{q.questionText}</p>
                          <span className="text-[10px] text-slate-500 uppercase mt-0.5 block">{q.difficulty}</span>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Actions */}
            <div className="p-5 border-t border-slate-750 flex justify-end gap-3 bg-slate-900/50">
              <button
                onClick={() => setShowQuestionModal(false)}
                className="px-4 py-2 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveManualQuestions}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-xs shadow-lg cursor-pointer"
              >
                Apply Selection ({tempSelectedQIds.length})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

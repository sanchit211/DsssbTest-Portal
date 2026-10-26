"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Clock, AlertTriangle, ChevronLeft, ChevronRight, HelpCircle, Check, Loader2, X } from "lucide-react";

interface Subject {
  subjectId: string;
  name: string;
  questionCount: number;
  duration: number;
  marks: number;
  negativeMarks: number;
}

interface Question {
  id: string;
  questionText: string;
  subjectId: string;
  subjectName: string;
  difficulty: string;
  options: { optionCode: string; optionText: string }[];
}

interface SavedAnswer {
  questionId: string;
  selectedOption: string | null;
  isMarkedForReview: boolean;
  timeSpent: number;
}

export default function ActiveExamClient({ examId }: { examId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const attemptId = searchParams.get("attemptId");
  const isPreview = searchParams.get("preview") === "true";

  // Data States
  const [examName, setExamName] = useState("Mock Exam");
  const [timerMode, setTimerMode] = useState("OVERALL");
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<SavedAnswer[]>([]);
  
  // Question Timer States
  const [timeSpentMap, setTimeSpentMap] = useState<Record<string, number>>({});
  const prevQIdRef = useRef<string | null>(null);
  
  const [activeSubId, setActiveSubId] = useState("");
  const [activeQIndex, setActiveQIndex] = useState(0); // Index within the active subject's questions
  const [visitedQIds, setVisitedQIds] = useState<string[]>([]); // Track which question IDs have been visited

  // Timer States
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [remainingTime, setRemainingTime] = useState(0); // in seconds
  const [timerWarning, setTimerWarning] = useState<"none" | "warn" | "strong" | "critical">("none");

  // UI States
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch Attempt State or Load Preview Mock Data
  const loadExamState = async () => {
    try {
      setLoading(true);
      setError("");

      if (isPreview) {
        // Build mock preview data based on exam configuration
        const res = await fetch(`/api/exams/${examId}`);
        if (!res.ok) throw new Error("Failed to load preview details");
        const examData = await res.json();

        setExamName(examData.name);
        setTimerMode(examData.timerMode);
        
        const subjectsList = examData.subjects.map((s: any) => ({
          subjectId: s.subjectId,
          name: s.subject.name,
          questionCount: s.questionCount,
          duration: s.duration,
          marks: s.marks,
          negativeMarks: s.negativeMarks,
        }));
        setSubjects(subjectsList);

        // Fetch questions belonging to these subjects to simulate real test
        const qRes = await fetch(`/api/admin/questions`);
        const qData = await qRes.json();

        // Filter and allocate questions to match subject configs
        let allocatedQuestions: Question[] = [];
        for (const sub of subjectsList) {
          const subQs = qData
            .filter((q: any) => q.subjectId === sub.subjectId)
            .slice(0, sub.questionCount)
            .map((q: any) => ({
              id: q.id,
              questionText: q.questionText,
              subjectId: q.subjectId,
              subjectName: sub.name,
              difficulty: q.difficulty,
              options: q.options,
            }));
          allocatedQuestions = [...allocatedQuestions, ...subQs];
        }

        setQuestions(allocatedQuestions);
        setAnswers(allocatedQuestions.map(q => ({ questionId: q.id, selectedOption: null, isMarkedForReview: false, timeSpent: 0 })));
        
        const initialTimeMap: Record<string, number> = {};
        allocatedQuestions.forEach(q => { initialTimeMap[q.id] = 0; });
        setTimeSpentMap(initialTimeMap);
        
        setActiveSubId(subjectsList[0]?.subjectId || "");
        
        // Mock End Time
        const durationMin = examData.timerMode === "SUBJECT_WISE" ? subjectsList[0]?.duration : examData.duration;
        const mockEnd = new Date(Date.now() + durationMin * 60 * 1000);
        setEndTime(mockEnd);

      } else {
        // Load Real Attempt State from database
        const res = await fetch(`/api/attempts/${attemptId}`);
        if (!res.ok) throw new Error("Failed to load active test attempt");
        const data = await res.json();

        if (data.isFinished) {
          router.push(`/candidate/attempts/${attemptId}/result`);
          return;
        }

        setExamName(data.examName);
        setTimerMode(data.timerMode);
        setSubjects(data.subjects);
        setQuestions(data.questions);
        
        const initialTimeMap: Record<string, number> = {};
        const answersList = data.questions.map((q: any) => {
          const saved = data.answers.find((a: any) => a.questionId === q.id);
          const timeSpentVal = saved ? (saved.timeSpent || 0) : 0;
          initialTimeMap[q.id] = timeSpentVal;
          return {
            questionId: q.id,
            selectedOption: saved ? saved.selectedOption : null,
            isMarkedForReview: saved ? saved.isMarkedForReview : false,
            timeSpent: timeSpentVal,
          };
        });
        setAnswers(answersList);
        setTimeSpentMap(initialTimeMap);

        // Set Active Subject section
        if (data.timerMode === "SUBJECT_WISE") {
          setActiveSubId(data.activeSubjectId || data.subjects[0]?.subjectId);
          setEndTime(new Date(data.activeSubjectEndTime));
        } else {
          setActiveSubId(data.subjects[0]?.subjectId);
          setEndTime(new Date(data.overallEndTime));
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to start active exam session");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExamState();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examId, attemptId]);

  // Auto transition or auto submit when section/exam timer hits zero
  const handleTimerExpiration = async () => {
    if (isPreview) {
      alert("Preview timer has expired!");
      router.push("/admin/exams");
      return;
    }

    try {
      // Re-fetch attempt state. The backend route `GET /api/attempts/[id]` automatically handles transitions or submits expired attempts!
      setLoading(true);
      const res = await fetch(`/api/attempts/${attemptId}`);
      const data = await res.json();

      if (data.isFinished) {
        // Redirect to results immediately
        router.push(`/candidate/attempts/${attemptId}/result`);
      } else {
        // Loaded next subject section
        setExamName(data.examName);
        setTimerMode(data.timerMode);
        setSubjects(data.subjects);
        setQuestions(data.questions);
        
        const initialTimeMap: Record<string, number> = {};
        const answersList = data.questions.map((q: any) => {
          const saved = data.answers.find((a: any) => a.questionId === q.id);
          const timeSpentVal = saved ? (saved.timeSpent || 0) : 0;
          initialTimeMap[q.id] = timeSpentVal;
          return {
            questionId: q.id,
            selectedOption: saved ? saved.selectedOption : null,
            isMarkedForReview: saved ? saved.isMarkedForReview : false,
            timeSpent: timeSpentVal,
          };
        });
        setAnswers(answersList);
        setTimeSpentMap(initialTimeMap);
        
        setActiveSubId(data.activeSubjectId);
        setActiveQIndex(0);
        setEndTime(new Date(data.activeSubjectEndTime));
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      router.push(`/candidate/attempts`);
    }
  };

  // 2. Synchronized Timer Loop
  useEffect(() => {
    if (!endTime) return;

    if (timerRef.current) clearInterval(timerRef.current);

    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((endTime.getTime() - Date.now()) / 1000));
      setRemainingTime(diff);

      // Warning levels
      const diffMin = diff / 60;
      if (diffMin <= 1) setTimerWarning("critical");
      else if (diffMin <= 5) setTimerWarning("strong");
      else if (diffMin <= 10) setTimerWarning("warn");
      else setTimerWarning("none");

      if (diff <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        handleTimerExpiration();
      }
    };

    updateTimer();
    timerRef.current = setInterval(updateTimer, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [endTime]);

  // Filter questions for active subject section
  const activeSubjectQs = questions.filter(q => q.subjectId === activeSubId);
  const currentQ = activeSubjectQs[activeQIndex];

  // Fetch current candidate answer selection
  const currentAns = answers.find(a => a.questionId === currentQ?.id);

  // Track visited questions
  useEffect(() => {
    if (currentQ && !visitedQIds.includes(currentQ.id)) {
      setVisitedQIds([...visitedQIds, currentQ.id]);
    }
  }, [currentQ]);

  // Save question-level time spent in background
  const saveTimeSpent = async (qId: string, time: number) => {
    if (isPreview) return;
    const ans = answers.find(a => a.questionId === qId);
    const selectedOption = ans?.selectedOption || "";
    const isMarkedForReview = ans?.isMarkedForReview || false;

    try {
      await fetch("/api/attempts/save-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          questionId: qId,
          selectedOption,
          isMarkedForReview,
          timeSpent: time,
        }),
      });
    } catch (err) {
      console.error("Failed to save time spent:", qId, err);
    }
  };

  // Effect to increment time spent on active question every second
  useEffect(() => {
    if (loading || !currentQ?.id) return;

    const interval = setInterval(() => {
      setTimeSpentMap(prev => ({
        ...prev,
        [currentQ.id]: (prev[currentQ.id] || 0) + 1,
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [currentQ?.id, loading]);

  // Effect to save time spent when navigating away from a question
  useEffect(() => {
    const prevQId = prevQIdRef.current;
    if (prevQId && prevQId !== currentQ?.id) {
      const timeSpentVal = timeSpentMap[prevQId] || 0;
      saveTimeSpent(prevQId, timeSpentVal);
    }
    if (currentQ?.id) {
      prevQIdRef.current = currentQ.id;
    }
  }, [currentQ?.id]);

  // Save selected answer option
  const handleSaveOption = async (optionCode: string) => {
    const updatedTime = timeSpentMap[currentQ.id] || 0;
    // Update local React state instantly
    const updated = answers.map((ans) => {
      if (ans.questionId === currentQ.id) {
        return { ...ans, selectedOption: optionCode, timeSpent: updatedTime };
      }
      return ans;
    });
    setAnswers(updated);

    if (isPreview) return;

    // Post to autosave API in background
    try {
      await fetch("/api/attempts/save-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          questionId: currentQ.id,
          selectedOption: optionCode,
          isMarkedForReview: currentAns?.isMarkedForReview ?? false,
          timeSpent: updatedTime,
        }),
      });
    } catch (err) {
      console.error("Autosave answer failed:", err);
    }
  };

  // Clear answer response
  const handleClearResponse = async () => {
    const updatedTime = timeSpentMap[currentQ.id] || 0;
    const updated = answers.map((ans) => {
      if (ans.questionId === currentQ.id) {
        return { ...ans, selectedOption: null, timeSpent: updatedTime };
      }
      return ans;
    });
    setAnswers(updated);

    if (isPreview) return;

    try {
      await fetch("/api/attempts/save-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          questionId: currentQ.id,
          selectedOption: "",
          isMarkedForReview: currentAns?.isMarkedForReview ?? false,
          timeSpent: updatedTime,
        }),
      });
    } catch (err) {
      console.error("Autosave clear failed:", err);
    }
  };

  // Toggle Mark for Review
  const handleMarkForReview = async () => {
    const nextReview = !(currentAns?.isMarkedForReview ?? false);
    const updatedTime = timeSpentMap[currentQ.id] || 0;

    const updated = answers.map((ans) => {
      if (ans.questionId === currentQ.id) {
        return { ...ans, isMarkedForReview: nextReview, timeSpent: updatedTime };
      }
      return ans;
    });
    setAnswers(updated);

    if (isPreview) {
      // Advance locally
      handleSaveAndNext();
      return;
    }

    try {
      await fetch("/api/attempts/save-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attemptId,
          questionId: currentQ.id,
          selectedOption: currentAns?.selectedOption || "",
          isMarkedForReview: nextReview,
          timeSpent: updatedTime,
        }),
      });
      handleSaveAndNext();
    } catch (err) {
      console.error("Mark for review failed:", err);
    }
  };

  // Save & Next navigator action
  const handleSaveAndNext = () => {
    if (activeQIndex < activeSubjectQs.length - 1) {
      setActiveQIndex(activeQIndex + 1);
    } else if (timerMode === "OVERALL") {
      const currentSubIdx = subjects.findIndex((s: any) => s.subjectId === activeSubId);
      const nextSub = subjects[currentSubIdx + 1];
      if (nextSub) {
        setActiveSubId(nextSub.subjectId);
        setActiveQIndex(0);
      }
    }
  };

  // Previous navigator action
  const handlePrevious = () => {
    if (activeQIndex > 0) {
      setActiveQIndex(activeQIndex - 1);
    } else if (timerMode === "OVERALL") {
      const currentSubIdx = subjects.findIndex((s: any) => s.subjectId === activeSubId);
      const prevSub = subjects[currentSubIdx - 1];
      if (prevSub) {
        const prevSubjectQs = questions.filter(q => q.subjectId === prevSub.subjectId);
        setActiveSubId(prevSub.subjectId);
        setActiveQIndex(Math.max(0, prevSubjectQs.length - 1));
      }
    }
  };

  // Switch subject tabs (Only permitted in OVERALL timer mode)
  const handleSwitchSubjectTab = (subjectId: string) => {
    if (timerMode === "SUBJECT_WISE") return; // locked in section-wise mode
    setActiveSubId(subjectId);
    setActiveQIndex(0);
  };

  // Manual Submission handler
  const handleSubmitExam = async () => {
    if (isPreview) {
      alert("Preview exam completed! Returning to Exam Management.");
      router.push("/admin/exams");
      return;
    }

    setSubmitting(true);
    
    // Save current active question's time spent before final submit
    if (currentQ?.id) {
      const timeSpentVal = timeSpentMap[currentQ.id] || 0;
      await saveTimeSpent(currentQ.id, timeSpentVal);
    }

    try {
      const res = await fetch("/api/attempts/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attemptId }),
      });

      if (!res.ok) throw new Error("Submission failed");
      router.push(`/candidate/attempts/${attemptId}/result`);
    } catch (err: any) {
      alert(err.message || "Failed to submit exam attempt");
      setSubmitting(false);
    }
  };

  // Format timer text (MM:SS)
  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Questions stats summary for confirmation modal
  const answeredCount = answers.filter(a => a.selectedOption !== null).length;
  const reviewCount = answers.filter(a => a.isMarkedForReview).length;
  const unansweredCount = questions.length - answeredCount;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
        <p>Loading active mock session...</p>
      </div>
    );
  }

  if (error || (questions.length === 0 && !loading)) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4 text-center p-6">
        <div className="text-rose-400 bg-rose-500/10 p-4 border border-rose-500/20 rounded-2xl max-w-md">
          <p className="font-semibold text-lg">Error</p>
          <p className="text-sm mt-1">{error || "No active questions allocated for this test."}</p>
        </div>
        <button
          onClick={() => router.push("/candidate/dashboard")}
          className="bg-indigo-600 px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 text-slate-200 flex flex-col overflow-hidden">
      {/* Top Sticky Header */}
      <header className="h-16 bg-slate-950 border-b border-slate-800 px-6 flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-2">
          <h1 className="font-bold text-white tracking-wide text-sm md:text-base uppercase">
            {examName}
          </h1>
          {isPreview && (
            <span className="bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
              Preview Mode
            </span>
          )}
        </div>

        {/* Timer status widget */}
        <div className={`flex items-center gap-2 px-4 py-1.5 rounded-xl border text-sm font-semibold transition-colors ${
          timerWarning === "critical" 
            ? "bg-rose-500/10 border-rose-500 text-rose-500 animate-pulse"
            : timerWarning === "strong"
            ? "bg-orange-500/10 border-orange-500 text-orange-500"
            : timerWarning === "warn"
            ? "bg-amber-500/10 border-amber-500 text-amber-500"
            : "bg-slate-900 border-slate-800 text-slate-350"
        }`}>
          <Clock size={16} />
          <span>Time Left: {formatTimer(remainingTime)}</span>
        </div>
      </header>

      {/* Dynamic Subjects Navigation Tab Row */}
      <div className="h-12 bg-slate-950/70 border-b border-slate-850 flex items-center px-6 overflow-x-auto shrink-0 gap-2">
        {subjects.map((sub) => {
          const isActive = sub.subjectId === activeSubId;
          const isDisabled = timerMode === "SUBJECT_WISE" && !isActive;
          return (
            <button
              key={sub.subjectId}
              disabled={isDisabled}
              onClick={() => handleSwitchSubjectTab(sub.subjectId)}
              className={`px-4 h-full text-xs font-semibold border-b-2 flex items-center transition-all ${
                isActive
                  ? "border-indigo-500 text-white bg-indigo-500/5 font-bold"
                  : isDisabled
                  ? "border-transparent text-slate-600 cursor-not-allowed opacity-40"
                  : "border-transparent text-slate-400 hover:text-white cursor-pointer"
              }`}
            >
              {sub.name}
            </button>
          );
        })}
      </div>

      {/* Main Examination workspace */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left Side: Question Pane */}
        <div className="flex-1 flex flex-col overflow-hidden border-r border-slate-850">
          {activeSubjectQs.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 gap-4">
              <div className="text-amber-400 bg-amber-500/10 p-5 border border-amber-500/20 rounded-2xl max-w-md space-y-2">
                <AlertTriangle className="mx-auto text-amber-400" size={28} />
                <p className="font-bold text-sm">No Questions Allocated</p>
                <p className="text-xs leading-relaxed">
                  There are no questions allocated for the <span className="text-white font-semibold">{subjects.find(s => s.subjectId === activeSubId)?.name}</span> subject.
                </p>
                <p className="text-[11px] text-slate-400">
                  Please select another subject section using the tabs above, or submit your exam using the button on the right.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                {/* Question title */}
                <div className="flex items-center justify-between text-xs font-medium text-slate-400">
                  <span>
                    Question {activeQIndex + 1} of {activeSubjectQs.length}
                  </span>
                  <span className="bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-slate-500 uppercase">
                    {currentQ.difficulty}
                  </span>
                </div>

                {/* Question Text */}
                <h2 className="text-white font-medium text-lg leading-relaxed whitespace-pre-wrap">
                  {currentQ.questionText}
                </h2>

                {/* MCQ Options Choices List */}
                <div className="space-y-3 max-w-2xl">
                  {currentQ.options.map((opt) => {
                    const isSelected = currentAns?.selectedOption === opt.optionCode;
                    return (
                      <button
                        key={opt.optionCode}
                        onClick={() => handleSaveOption(opt.optionCode)}
                        className={`w-full flex items-center gap-4 p-4 rounded-xl border text-sm font-medium transition-all text-left cursor-pointer ${
                          isSelected
                            ? "bg-indigo-600/10 border-indigo-500 text-white shadow-lg shadow-indigo-600/5"
                            : "bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-950/60"
                        }`}
                      >
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                          isSelected ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-500"
                        }`}>
                          {opt.optionCode}
                        </span>
                        <span>{opt.optionText}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Left panel actions bottom bar */}
              <div className="h-16 bg-slate-950 border-t border-slate-850 px-6 flex justify-between items-center shrink-0">
                {(() => {
                  const currentSubIdx = subjects.findIndex((s: any) => s.subjectId === activeSubId);
                  const isLastQuestionOfSection = activeQIndex === activeSubjectQs.length - 1;
                  const hasNextSection = currentSubIdx < subjects.length - 1;
                  
                  const isSaveNextDisabled = isLastQuestionOfSection && (timerMode !== "OVERALL" || !hasNextSection);
                  const isPreviousDisabled = activeQIndex === 0 && (timerMode !== "OVERALL" || currentSubIdx === 0);

                  return (
                    <>
                      <div className="flex gap-2">
                        <button
                          disabled={isPreviousDisabled}
                          onClick={handlePrevious}
                          className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-350 font-medium px-4 py-2 rounded-xl text-xs border border-slate-750 transition-colors cursor-pointer"
                        >
                          <ChevronLeft size={16} />
                          Previous
                        </button>
                        <button
                          disabled={!currentAns?.selectedOption}
                          onClick={handleClearResponse}
                          className="bg-slate-800 hover:bg-slate-700 disabled:opacity-45 text-rose-400 hover:text-rose-350 font-medium px-4 py-2 rounded-xl text-xs border border-slate-750 transition-colors cursor-pointer"
                        >
                          Clear Response
                        </button>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={handleMarkForReview}
                          className="bg-indigo-900/40 hover:bg-indigo-900/60 text-indigo-400 font-semibold px-4 py-2 rounded-xl text-xs border border-indigo-500/20 transition-all cursor-pointer"
                        >
                          {currentAns?.isMarkedForReview ? "Unmark Review" : "Mark for Review"}
                        </button>
                        <button
                          disabled={isSaveNextDisabled}
                          onClick={handleSaveAndNext}
                          className="inline-flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-medium px-4 py-2 rounded-xl text-xs shadow-md transition-colors cursor-pointer"
                        >
                          Save & Next
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </>
                  );
                })()}
              </div>
            </>
          )}
        </div>

        {/* Right Side Panel: Question Palette & Submit */}
        <div className="w-80 bg-slate-950/40 shrink-0 flex flex-col justify-between overflow-hidden">
          {/* Palette Grid list */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-3">
                Question Palette
              </h3>

              {/* Grid numbers */}
              <div className="grid grid-cols-5 gap-2.5">
                {activeSubjectQs.map((q, idx) => {
                  const ans = answers.find(a => a.questionId === q.id);
                  const isVisited = visitedQIds.includes(q.id);
                  const isAnswered = ans?.selectedOption !== null;
                  const isMarked = ans?.isMarkedForReview ?? false;

                  let colorClass = "bg-slate-800 text-slate-500 border border-slate-700"; // Not visited
                  if (isVisited && !isAnswered && !isMarked) {
                    colorClass = "bg-amber-600/10 border-amber-600/50 text-amber-500 font-medium"; // Visited but unanswered
                  } else if (isAnswered && !isMarked) {
                    colorClass = "bg-emerald-600 border-emerald-500 text-slate-950 font-bold"; // Answered
                  } else if (!isAnswered && isMarked) {
                    colorClass = "bg-indigo-600 border-indigo-500 text-white font-bold"; // Marked for review
                  } else if (isAnswered && isMarked) {
                    colorClass = "bg-emerald-600 border-indigo-500 text-slate-950 font-bold ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-900"; // Answered + Marked for review
                  }

                  const isActive = idx === activeQIndex;

                  return (
                    <button
                      key={q.id}
                      onClick={() => setActiveQIndex(idx)}
                      className={`w-10 h-10 rounded-xl text-xs font-semibold flex items-center justify-center transition-all cursor-pointer ${colorClass} ${
                        isActive ? "ring-2 ring-white scale-110 shadow-lg" : ""
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Legend block */}
            <div className="space-y-2 border-t border-slate-850 pt-4 text-xs text-slate-400">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Legend</span>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded bg-slate-800 border border-slate-700 block" />
                  <span>Not Visited</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded bg-amber-600/10 border border-amber-600/50 block" />
                  <span>Not Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded bg-emerald-600 block" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 rounded bg-indigo-600 block" />
                  <span>Marked</span>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Exam Button area */}
          <div className="p-5 border-t border-slate-850 bg-slate-950/60">
            <button
              onClick={() => setShowSubmitConfirm(true)}
              className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold py-3 rounded-xl text-sm shadow-lg shadow-emerald-600/10 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              Submit Exam
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-850 border border-slate-750 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-750 flex justify-between items-center bg-slate-900/50">
              <h3 className="text-lg font-bold text-white">Submit Exam Confirmation</h3>
              <button 
                onClick={() => setShowSubmitConfirm(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Content summary */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-300 leading-relaxed">
                Are you sure you want to submit your exam attempt? Once submitted, you cannot modify your answers.
              </p>

              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 divide-y divide-slate-800/60 text-xs">
                <div className="flex justify-between py-2 font-medium">
                  <span className="text-slate-400">Total Questions:</span>
                  <span className="text-white">{questions.length}</span>
                </div>
                <div className="flex justify-between py-2 font-medium">
                  <span className="text-slate-400">Answered questions:</span>
                  <span className="text-emerald-400">{answeredCount}</span>
                </div>
                <div className="flex justify-between py-2 font-medium">
                  <span className="text-slate-400">Unanswered questions:</span>
                  <span className="text-rose-450">{unansweredCount}</span>
                </div>
                <div className="flex justify-between py-2 font-medium">
                  <span className="text-slate-400">Marked for Review:</span>
                  <span className="text-indigo-400">{reviewCount}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-5 border-t border-slate-750 flex justify-end gap-3 bg-slate-900/50">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="px-4 py-2 border border-slate-700 text-slate-350 hover:text-white rounded-lg text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitExam}
                disabled={submitting}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-600/10 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 size={12} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    Confirm Submit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

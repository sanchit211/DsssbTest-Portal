"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, Clock, Award, ShieldAlert, Loader2, ArrowLeft, CheckSquare, Square } from "lucide-react";

interface Subject {
  subjectId: string;
  questionCount: number;
  duration: number;
  marks: number;
  negativeMarks: number;
  subject: { name: string };
}

interface Exam {
  id: string;
  name: string;
  description: string | null;
  instructions: string | null;
  duration: number;
  timerMode: string;
  subjects: Subject[];
}

export default function InstructionsClient({ examId }: { examId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPreview = searchParams.get("preview") === "true";

  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    const fetchExam = async () => {
      try {
        setLoading(true);
        // Use admin endpoint to load exam config if in preview mode (allows drafts preview), otherwise use a generic public detail endpoint
        // For simplicity, fetching from /api/admin/exams/[id] is fine if the user is authorized. Since we have middleware protecting admin routes, but wait: candidates can also fetch public exams!
        // Let's make `/api/admin/exams/[id]` accessible or create a candidate-facing detailed config API. Since this is an instruction details page, we can query a candidate-friendly endpoint.
        // Let's create `/api/exams/[id]` which is accessible to both candidates and admins. Let's write that route next. For now, we fetch from `/api/exams/${examId}`!
        const res = await fetch(`/api/exams/${examId}`);
        if (!res.ok) throw new Error("Failed to load exam instructions");
        const data = await res.json();
        setExam(data);
      } catch (err: any) {
        setError(err.message || "Failed to load instructions");
      } finally {
        setLoading(false);
      }
    };

    fetchExam();
  }, [examId]);

  const handleStartExam = async () => {
    if (!accepted) return;
    setStarting(true);
    setError("");

    if (isPreview) {
      // In preview mode, bypass attempt table creation and go directly to exam
      router.push(`/candidate/exams/${examId}/active?preview=true`);
      return;
    }

    try {
      const res = await fetch("/api/attempts/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start exam attempt");

      // Redirect to the active testing page
      router.push(`/candidate/exams/${examId}/active?attemptId=${data.attemptId}`);
    } catch (err: any) {
      setError(err.message || "Could not initialize exam attempt");
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
        <p>Loading exam instructions...</p>
      </div>
    );
  }

  if (error || !exam) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4 text-center p-6">
        <div className="text-rose-400 bg-rose-500/10 p-4 border border-rose-500/20 rounded-2xl max-w-md">
          <p className="font-semibold text-lg">Error</p>
          <p className="text-sm mt-1">{error || "Exam instructions not found"}</p>
        </div>
        <button
          onClick={() => router.push(isPreview ? "/admin/exams" : "/candidate/dashboard")}
          className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-semibold transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          Go Back
        </button>
      </div>
    );
  }

  // Calculate totals
  const totalQuestions = exam.subjects.reduce((sum, s) => sum + s.questionCount, 0);
  const totalMarks = exam.subjects.reduce((sum, s) => sum + (s.questionCount * s.marks), 0);

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 py-10 px-4 md:px-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(isPreview ? "/admin/exams" : "/candidate/dashboard")}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-all cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">General Exam Instructions</h1>
            <p className="text-slate-400 text-xs mt-0.5">{exam.name}</p>
          </div>
        </div>

        {/* Quick parameters grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
            <FileText className="text-indigo-400 shrink-0" size={20} />
            <div>
              <div className="text-slate-500 text-[10px] uppercase font-semibold">Total Questions</div>
              <div className="text-base font-bold text-white">{totalQuestions} Qs</div>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
            <Clock className="text-indigo-400 shrink-0" size={20} />
            <div>
              <div className="text-slate-500 text-[10px] uppercase font-semibold">Duration</div>
              <div className="text-base font-bold text-white">{exam.duration} Min</div>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
            <Award className="text-indigo-400 shrink-0" size={20} />
            <div>
              <div className="text-slate-500 text-[10px] uppercase font-semibold">Maximum Marks</div>
              <div className="text-base font-bold text-white">{totalMarks} Marks</div>
            </div>
          </div>

          <div className="bg-slate-800/40 border border-slate-800 p-4 rounded-xl flex items-center gap-3">
            <ShieldAlert className="text-indigo-400 shrink-0" size={20} />
            <div>
              <div className="text-slate-500 text-[10px] uppercase font-semibold">Timer Mode</div>
              <div className="text-base font-bold text-white leading-tight">
                {exam.timerMode === "SUBJECT_WISE" ? "Section-wise" : "Overall"}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Structure Table */}
        <div className="bg-slate-800/30 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white">Subject Breakdown</h2>
          <div className="overflow-x-auto border border-slate-800 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/40 font-semibold uppercase">
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4 text-center">Questions</th>
                  <th className="py-3 px-4 text-center">Duration</th>
                  <th className="py-3 px-4 text-center">Marks (Correct)</th>
                  <th className="py-3 px-4 text-center">Negative Marking</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {exam.subjects.map((sub, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/10">
                    <td className="py-3 px-4 font-semibold text-white">{sub.subject.name}</td>
                    <td className="py-3 px-4 text-center font-medium">{sub.questionCount}</td>
                    <td className="py-3 px-4 text-center font-medium">
                      {exam.timerMode === "SUBJECT_WISE" ? `${sub.duration} mins` : "Continuous"}
                    </td>
                    <td className="py-3 px-4 text-center font-medium">+{sub.marks}</td>
                    <td className="py-3 px-4 text-center font-medium text-rose-400">-{sub.negativeMarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Written Instructions */}
        <div className="bg-slate-800/30 border border-slate-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white">Instructions & Guidelines</h2>
          
          <div className="text-slate-400 text-sm space-y-3 leading-relaxed">
            {exam.instructions ? (
              <div className="whitespace-pre-wrap">{exam.instructions}</div>
            ) : (
              <ol className="list-decimal pl-5 space-y-2">
                <li>This exam is a mock test containing multiple subjects. Make sure you answer all questions.</li>
                <li>The countdown timer at the top-right of the screen will display the remaining time.</li>
                <li>When the timer expires, the exam will automatically submit and lock your answers.</li>
                <li>You can navigate between questions and mark them for review.</li>
                <li>Do not refresh the browser or close the window during the exam. If you do, the timer will keep running from the initial timestamp.</li>
              </ol>
            )}
          </div>
        </div>

        {/* Acceptance Checkbox */}
        <div className="bg-slate-800/50 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <button
            onClick={() => setAccepted(!accepted)}
            className="flex items-center gap-3 text-sm text-slate-350 hover:text-white font-medium cursor-pointer text-left"
          >
            <span className="text-indigo-400 shrink-0">
              {accepted ? <CheckSquare size={20} /> : <Square size={20} />}
            </span>
            I have read and understood all the instructions and am ready to start.
          </button>

          <button
            onClick={handleStartExam}
            disabled={!accepted || starting}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-semibold py-2.5 px-6 rounded-xl text-sm shadow-lg shadow-indigo-600/10 cursor-pointer flex items-center gap-2 justify-center"
          >
            {starting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Starting...
              </>
            ) : isPreview ? (
              "Start Preview"
            ) : (
              "I am ready to begin"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

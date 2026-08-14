"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Clock, FileText, CheckCircle2, XCircle, AlertCircle, ArrowRight, Loader2, HelpCircle } from "lucide-react";

interface SubjectBreakdown {
  name: string;
  questionsCount: number;
  correct: number;
  incorrect: number;
  unattempted: number;
  score: number;
}

interface QuestionAnalysis {
  id: string;
  questionText: string;
  options: { code: string; text: string }[];
  correctAnswer: string;
  selectedOption: string | null;
  status: "correct" | "incorrect" | "unattempted";
  earned: number;
  explanation: string | null;
  subjectName: string;
  difficulty: string;
}

interface ResultData {
  attemptId: string;
  examName: string;
  status: string;
  timeTaken: string;
  score: number;
  maxMarks: number;
  accuracy: number;
  totals: {
    questions: number;
    correct: number;
    incorrect: number;
    unattempted: number;
  };
  subjectBreakdown: SubjectBreakdown[];
  questions: QuestionAnalysis[];
}

export default function ResultClient({ attemptId }: { attemptId: string }) {
  const router = useRouter();
  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchResult = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/attempts/${attemptId}/result`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to load results");
        }
        const resData = await res.json();
        setData(resData);
      } catch (err: any) {
        setError(err.message || "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    fetchResult();
  }, [attemptId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
        <p>Loading result calculations...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4 text-center p-6">
        <div className="text-rose-400 bg-rose-500/10 p-4 border border-rose-500/20 rounded-2xl max-w-md">
          <p className="font-semibold text-lg">Report Loading Failed</p>
          <p className="text-sm mt-1">{error || "Attempt results not found"}</p>
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
    <div className="space-y-8 max-w-4xl mx-auto py-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block">Exam Result Report</span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white mt-1 leading-tight">{data.examName}</h1>
        </div>
        <button
          onClick={() => router.push("/candidate/dashboard")}
          className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-medium px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer border border-slate-750"
        >
          Go to Dashboard
          <ArrowRight size={14} />
        </button>
      </div>

      {/* Summary Scoreboard Grid */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {/* Score */}
        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 text-center">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Score</span>
          <div className="text-xl font-black text-white mt-1">
            {data.score} <span className="text-xs text-slate-500">/ {data.maxMarks}</span>
          </div>
        </div>

        {/* Accuracy */}
        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 text-center">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Accuracy</span>
          <div className="text-xl font-black text-white mt-1">{data.accuracy}%</div>
        </div>

        {/* Correct */}
        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 text-center">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Correct</span>
          <div className="text-xl font-black text-emerald-450 mt-1">{data.totals.correct}</div>
        </div>

        {/* Incorrect */}
        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 text-center">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Incorrect</span>
          <div className="text-xl font-black text-rose-455 mt-1">{data.totals.incorrect}</div>
        </div>

        {/* Unattempted */}
        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 text-center">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Unattempted</span>
          <div className="text-xl font-black text-slate-400 mt-1">{data.totals.unattempted}</div>
        </div>

        {/* Time Taken */}
        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 text-center">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Time Taken</span>
          <div className="text-xl font-black text-sky-400 mt-1">{data.timeTaken}</div>
        </div>
      </div>

      {/* Subject-Wise Report */}
      <div className="bg-slate-800/30 border border-slate-800 rounded-2xl p-6 space-y-4">
        <h2 className="text-lg font-bold text-white tracking-wide">Subject Performance</h2>
        <div className="overflow-x-auto border border-slate-800 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-900/40 font-semibold uppercase">
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4 text-center">Questions</th>
                <th className="py-3 px-4 text-center text-emerald-400">Correct</th>
                <th className="py-3 px-4 text-center text-rose-400">Incorrect</th>
                <th className="py-3 px-4 text-center text-slate-400">Unattempted</th>
                <th className="py-3 px-4 text-center text-indigo-400">Score</th>
                <th className="py-3 px-4 text-center">Accuracy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {data.subjectBreakdown.map((sub, idx) => {
                const attempted = sub.correct + sub.incorrect;
                const acc = attempted > 0 ? ((sub.correct / attempted) * 100).toFixed(1) : "0.0";
                return (
                  <tr key={idx} className="hover:bg-slate-800/10">
                    <td className="py-3 px-4 font-semibold text-white">{sub.name}</td>
                    <td className="py-3 px-4 text-center font-medium">{sub.questionsCount}</td>
                    <td className="py-3 px-4 text-center font-medium text-emerald-400">{sub.correct}</td>
                    <td className="py-3 px-4 text-center font-medium text-rose-455">{sub.incorrect}</td>
                    <td className="py-3 px-4 text-center font-medium text-slate-400">{sub.unattempted}</td>
                    <td className="py-3 px-4 text-center font-bold text-indigo-400">{sub.score}</td>
                    <td className="py-3 px-4 text-center font-medium">{acc}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Question Analysis */}
      <div className="space-y-6">
        <h2 className="text-lg font-bold text-white tracking-wide border-b border-slate-800 pb-2">
          Question-by-Question Analysis
        </h2>

        {data.questions.map((q, index) => {
          let statusBadgeColor = "bg-slate-800/60 text-slate-450 border border-slate-700/50";
          let statusLabel = "Not Attempted";
          let StatusIcon = AlertCircle;

          if (q.status === "correct") {
            statusBadgeColor = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
            statusLabel = "Correct Answer";
            StatusIcon = CheckCircle2;
          } else if (q.status === "incorrect") {
            statusBadgeColor = "bg-rose-500/10 text-rose-400 border border-rose-500/20";
            statusLabel = "Incorrect Answer";
            StatusIcon = XCircle;
          }

          return (
            <div 
              key={q.id} 
              className="bg-slate-800/30 border border-slate-800 rounded-2xl p-6 space-y-4 hover:border-slate-750 transition-colors"
            >
              {/* Question Meta Header */}
              <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-800 pb-3">
                <div className="flex gap-2 items-center text-xs">
                  <span className="text-slate-400 font-bold">Q{index + 1}</span>
                  <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-semibold border border-indigo-500/15">
                    {q.subjectName}
                  </span>
                  <span className="bg-slate-800 text-slate-500 px-2 py-0.5 rounded text-[10px] uppercase font-bold">
                    {q.difficulty}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadgeColor}`}>
                    <StatusIcon size={12} />
                    {statusLabel}
                  </span>
                  <span className={`text-xs font-bold ${q.earned > 0 ? "text-emerald-450" : q.earned < 0 ? "text-rose-455" : "text-slate-500"}`}>
                    {q.earned > 0 ? `+${q.earned}` : q.earned} Marks
                  </span>
                </div>
              </div>

              {/* Question Text */}
              <p className="text-white font-medium text-base leading-relaxed whitespace-pre-wrap">{q.questionText}</p>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {q.options.map((opt) => {
                  const isCorrect = opt.code === q.correctAnswer;
                  const isSelected = opt.code === q.selectedOption;

                  let optBorderColor = "border-slate-800 bg-slate-900/40 text-slate-400";
                  let codeBadgeColor = "bg-slate-800 text-slate-500";

                  if (isCorrect) {
                    optBorderColor = "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-medium";
                    codeBadgeColor = "bg-emerald-500 text-slate-950 font-bold";
                  } else if (isSelected && !isCorrect) {
                    optBorderColor = "bg-rose-500/10 border-rose-500/40 text-rose-450";
                    codeBadgeColor = "bg-rose-500 text-white font-bold";
                  }

                  return (
                    <div 
                      key={opt.code} 
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm ${optBorderColor}`}
                    >
                      <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${codeBadgeColor}`}>
                        {opt.code}
                      </span>
                      <span>{opt.text}</span>
                    </div>
                  );
                })}
              </div>

              {/* Explanation block */}
              {q.explanation && (
                <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 leading-relaxed">
                  <span className="font-bold text-slate-300 block mb-1 text-sm">Explanation / Solution:</span>
                  {q.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

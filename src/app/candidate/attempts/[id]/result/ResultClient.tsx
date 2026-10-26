"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Award, Clock, FileText, CheckCircle2, XCircle, AlertCircle, ArrowRight, Loader2, HelpCircle, Download } from "lucide-react";

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
  timeSpent: number;
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

  const handleExportPDF = () => {
    window.print();
  };
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

  // Time Analysis calculations
  const totalTimeSec = data.questions.reduce((sum, q) => sum + (q.timeSpent || 0), 0);
  const avgTimePerQ = data.questions.length > 0 ? totalTimeSec / data.questions.length : 0;
  
  const correctQs = data.questions.filter(q => q.status === "correct");
  const incorrectQs = data.questions.filter(q => q.status === "incorrect");
  const unattemptedQs = data.questions.filter(q => q.status === "unattempted");
  
  const avgTimeCorrect = correctQs.length > 0
    ? correctQs.reduce((sum, q) => sum + q.timeSpent, 0) / correctQs.length
    : 0;
  const avgTimeIncorrect = incorrectQs.length > 0
    ? incorrectQs.reduce((sum, q) => sum + q.timeSpent, 0) / incorrectQs.length
    : 0;
  const avgTimeUnattempted = unattemptedQs.length > 0
    ? unattemptedQs.reduce((sum, q) => sum + q.timeSpent, 0) / unattemptedQs.length
    : 0;

  const difficultyStats = ["EASY", "MEDIUM", "HARD"].map(diff => {
    const qs = data.questions.filter(q => q.difficulty === diff);
    const totalTime = qs.reduce((sum, q) => sum + q.timeSpent, 0);
    const avgTime = qs.length > 0 ? totalTime / qs.length : 0;
    return { diff, count: qs.length, totalTime, avgTime };
  });

  const timeSpentBySubject: Record<string, number> = {};
  data.questions.forEach(q => {
    timeSpentBySubject[q.subjectName] = (timeSpentBySubject[q.subjectName] || 0) + q.timeSpent;
  });

  const formatSeconds = (totalSecs: number) => {
    if (totalSecs < 60) return `${totalSecs}s`;
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto py-6 print:py-0 print:max-w-full print:text-slate-900">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 print:border-slate-200 pb-5">
        <div>
          <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest block print:text-indigo-750">Exam Result Report</span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white print:text-slate-900 mt-1 leading-tight">{data.examName}</h1>
        </div>
        <div className="flex items-center gap-3 print:hidden">
          <button
            onClick={handleExportPDF}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer"
          >
            <Download size={14} />
            Export PDF
          </button>
          <button
            onClick={() => router.push("/candidate/dashboard")}
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-medium px-4 py-2 rounded-xl text-xs transition-colors cursor-pointer border border-slate-750"
          >
            Go to Dashboard
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Summary Scoreboard Grid */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {/* Score */}
        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 text-center print:bg-slate-50 print:border-slate-200">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider print:text-slate-600">Score</span>
          <div className="text-xl font-black text-white print:text-slate-900 mt-1">
            {data.score} <span className="text-xs text-slate-500">/ {data.maxMarks}</span>
          </div>
        </div>

        {/* Accuracy */}
        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 text-center print:bg-slate-50 print:border-slate-200">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider print:text-slate-600">Accuracy</span>
          <div className="text-xl font-black text-white print:text-slate-900 mt-1">{data.accuracy}%</div>
        </div>

        {/* Correct */}
        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 text-center print:bg-slate-50 print:border-slate-200">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider print:text-slate-600">Correct</span>
          <div className="text-xl font-black text-emerald-450 print:text-emerald-700 mt-1">{data.totals.correct}</div>
        </div>

        {/* Incorrect */}
        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 text-center print:bg-slate-50 print:border-slate-200">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider print:text-slate-600">Incorrect</span>
          <div className="text-xl font-black text-rose-455 print:text-rose-700 mt-1">{data.totals.incorrect}</div>
        </div>

        {/* Unattempted */}
        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 text-center print:bg-slate-50 print:border-slate-200">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider print:text-slate-600">Unattempted</span>
          <div className="text-xl font-black text-slate-400 print:text-slate-700 mt-1">{data.totals.unattempted}</div>
        </div>

        {/* Time Taken */}
        <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 text-center print:bg-slate-50 print:border-slate-200">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider print:text-slate-600">Time Taken</span>
          <div className="text-xl font-black text-sky-400 print:text-sky-850 mt-1">{data.timeTaken}</div>
        </div>
      </div>
      
      {/* Time Analysis Dashboard */}
      <div className="bg-slate-800/30 border border-slate-800 rounded-2xl p-6 space-y-6 print:bg-slate-50 print:border-slate-200 print:break-inside-avoid">
        <div>
          <h2 className="text-lg font-bold text-white print:text-slate-900 tracking-wide flex items-center gap-2">
            <Clock className="text-sky-400 print:text-sky-750" size={18} />
            Time Analysis Dashboard
          </h2>
          <p className="text-xs text-slate-400 print:text-slate-600 mt-1">Detailed breakdown of how time was allocated during the exam</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Pacing Overview */}
          <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-4 space-y-3 print:bg-white print:border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block print:text-slate-600">Pacing Overview</span>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400 print:text-slate-600">Total Measured Time:</span>
                <span className="text-white print:text-slate-900 font-bold">{formatSeconds(totalTimeSec)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400 print:text-slate-600">Avg. Time per Question:</span>
                <span className="text-white print:text-slate-900 font-bold">{avgTimePerQ.toFixed(1)}s</span>
              </div>
            </div>
          </div>

          {/* Card 2: Correct vs. Incorrect Pacing */}
          <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-4 space-y-3 print:bg-white print:border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block print:text-slate-600">Accuracy Pacing</span>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-emerald-400 print:text-emerald-700 font-medium">Avg. Time on Correct:</span>
                <span className="text-white print:text-slate-900 font-bold">{avgTimeCorrect.toFixed(1)}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-rose-400 print:text-rose-700 font-medium">Avg. Time on Incorrect:</span>
                <span className="text-white print:text-slate-900 font-bold">{avgTimeIncorrect.toFixed(1)}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 print:text-slate-600">Avg. Time on Unattempted:</span>
                <span className="text-white print:text-slate-900 font-bold">{avgTimeUnattempted.toFixed(1)}s</span>
              </div>
            </div>
          </div>

          {/* Card 3: Difficulty Pacing */}
          <div className="bg-slate-900/40 border border-slate-850 rounded-xl p-4 space-y-3 print:bg-white print:border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block print:text-slate-600">Difficulty Pacing (Avg.)</span>
            <div className="space-y-2 text-xs">
              {difficultyStats.map(({ diff, count, avgTime }) => (
                <div key={diff} className="flex justify-between">
                  <span className="text-slate-400 print:text-slate-600 capitalize">{diff.toLowerCase()}:</span>
                  <span className="text-white print:text-slate-900 font-bold">{avgTime.toFixed(1)}s <span className="text-[10px] font-normal text-slate-500">({count} qs)</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Subject-Wise Report */}
      <div className="bg-slate-800/30 border border-slate-800 rounded-2xl p-6 space-y-4 print:bg-slate-50 print:border-slate-200 print:break-inside-avoid">
        <h2 className="text-lg font-bold text-white print:text-slate-900 tracking-wide">Subject Performance</h2>
        <div className="overflow-x-auto border border-slate-800 print:border-slate-200 rounded-xl">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 print:border-slate-200 text-slate-400 print:text-slate-600 bg-slate-900/40 print:bg-slate-100 font-semibold uppercase">
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4 text-center">Questions</th>
                <th className="py-3 px-4 text-center text-emerald-400 print:text-emerald-700">Correct</th>
                <th className="py-3 px-4 text-center text-rose-400 print:text-rose-700">Incorrect</th>
                <th className="py-3 px-4 text-center text-slate-400 print:text-slate-600">Unattempted</th>
                <th className="py-3 px-4 text-center text-indigo-400 print:text-indigo-750">Score</th>
                <th className="py-3 px-4 text-center text-sky-400 print:text-sky-850">Time Spent</th>
                <th className="py-3 px-4 text-center">Accuracy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 print:divide-slate-200 text-slate-300 print:text-slate-800">
              {data.subjectBreakdown.map((sub, idx) => {
                const attempted = sub.correct + sub.incorrect;
                const acc = attempted > 0 ? ((sub.correct / attempted) * 100).toFixed(1) : "0.0";
                return (
                  <tr key={idx} className="hover:bg-slate-800/10 print:hover:bg-slate-100">
                    <td className="py-3 px-4 font-semibold text-white print:text-slate-900">{sub.name}</td>
                    <td className="py-3 px-4 text-center font-medium">{sub.questionsCount}</td>
                    <td className="py-3 px-4 text-center font-medium text-emerald-400 print:text-emerald-700">{sub.correct}</td>
                    <td className="py-3 px-4 text-center font-medium text-rose-455 print:text-rose-700">{sub.incorrect}</td>
                    <td className="py-3 px-4 text-center font-medium text-slate-400 print:text-slate-600">{sub.unattempted}</td>
                    <td className="py-3 px-4 text-center font-bold text-indigo-400 print:text-indigo-750">{sub.score}</td>
                    <td className="py-3 px-4 text-center font-bold text-sky-400 print:text-sky-850">{formatSeconds(timeSpentBySubject[sub.name] || 0)}</td>
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
        <h2 className="text-lg font-bold text-white print:text-slate-900 tracking-wide border-b border-slate-800 print:border-slate-200 pb-2">
          Question-by-Question Analysis
        </h2>

        {data.questions.map((q, index) => {
          let statusBadgeColor = "bg-slate-800/60 text-slate-450 border border-slate-700/50";
          let statusLabel = "Not Attempted";
          let StatusIcon = AlertCircle;

          if (q.status === "correct") {
            statusBadgeColor = "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 print:bg-emerald-50 print:text-emerald-750 print:border-emerald-200";
            statusLabel = "Correct Answer";
            StatusIcon = CheckCircle2;
          } else if (q.status === "incorrect") {
            statusBadgeColor = "bg-rose-500/10 text-rose-400 border border-rose-500/20 print:bg-rose-50 print:text-rose-750 print:border-rose-200";
            statusLabel = "Incorrect Answer";
            StatusIcon = XCircle;
          }

          return (
            <div 
              key={q.id} 
              className="bg-slate-800/30 border border-slate-800 rounded-2xl p-6 space-y-4 hover:border-slate-750 transition-colors print:bg-slate-50 print:border-slate-200 print:break-inside-avoid print:shadow-none"
            >
              {/* Question Meta Header */}
              <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-800 print:border-slate-200 pb-3">
                <div className="flex gap-2 items-center text-xs">
                  <span className="text-slate-400 print:text-slate-800 font-bold">Q{index + 1}</span>
                  <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded font-semibold border border-indigo-500/15 print:bg-indigo-50 print:text-indigo-750 print:border-indigo-100">
                    {q.subjectName}
                  </span>
                  <span className="bg-slate-800 text-slate-500 px-2 py-0.5 rounded text-[10px] uppercase font-bold print:bg-slate-200 print:text-slate-700">
                    {q.difficulty}
                  </span>
                  <span className="bg-slate-800/80 text-sky-400 px-2 py-0.5 rounded text-[10px] flex items-center gap-1 border border-slate-700/40 print:bg-slate-200 print:text-sky-850 print:border-slate-200">
                    <Clock size={10} />
                    Time spent: {formatSeconds(q.timeSpent || 0)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusBadgeColor}`}>
                    <StatusIcon size={12} />
                    {statusLabel}
                  </span>
                  <span className={`text-xs font-bold ${q.earned > 0 ? "text-emerald-450 print:text-emerald-700" : q.earned < 0 ? "text-rose-455 print:text-rose-700" : "text-slate-500 print:text-slate-600"}`}>
                    {q.earned > 0 ? `+${q.earned}` : q.earned} Marks
                  </span>
                </div>
              </div>

              {/* Question Text */}
              <p className="text-white print:text-slate-900 font-medium text-base leading-relaxed whitespace-pre-wrap">{q.questionText}</p>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {q.options.map((opt) => {
                  const isCorrect = opt.code === q.correctAnswer;
                  const isSelected = opt.code === q.selectedOption;

                  let optBorderColor = "border-slate-800 bg-slate-900/40 text-slate-400 print:border-slate-200 print:bg-white print:text-slate-700";
                  let codeBadgeColor = "bg-slate-800 text-slate-500 print:bg-slate-100 print:text-slate-650";

                  if (isCorrect) {
                    optBorderColor = "bg-emerald-500/10 border-emerald-500/40 text-emerald-400 font-medium print:bg-emerald-50 print:border-emerald-300 print:text-emerald-800";
                    codeBadgeColor = "bg-emerald-500 text-slate-950 font-bold print:bg-emerald-600 print:text-white";
                  } else if (isSelected && !isCorrect) {
                    optBorderColor = "bg-rose-500/10 border-rose-500/40 text-rose-450 print:bg-rose-50 print:border-rose-300 print:text-rose-800";
                    codeBadgeColor = "bg-rose-500 text-white font-bold print:bg-rose-600";
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
                <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 print:text-slate-800 leading-relaxed print:bg-white print:border-slate-200">
                  <span className="font-bold text-slate-300 print:text-slate-800 block mb-1 text-sm">Explanation / Solution:</span>
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

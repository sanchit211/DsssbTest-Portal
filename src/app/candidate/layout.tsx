import { ReactNode } from "react";
import CandidateSidebar from "./CandidateSidebar";

export const metadata = {
  title: "Candidate Dashboard - MockExam Portal",
  description: "Take timed competitive exam mock tests and view detailed reports",
};

interface CandidateLayoutProps {
  children: ReactNode;
}

export default function CandidateLayout({ children }: CandidateLayoutProps) {
  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      {/* Sidebar navigation */}
      <CandidateSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-900">
          <div className="container mx-auto px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

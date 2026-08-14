import { ReactNode } from "react";
import AdminSidebar from "./AdminSidebar";

export const metadata = {
  title: "Admin Dashboard - MockExam Portal",
  description: "Manage exams, subjects, questions, and candidates",
};

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      {/* Sidebar navigation */}
      <AdminSidebar />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-900">
          <div className="container mx-auto px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}

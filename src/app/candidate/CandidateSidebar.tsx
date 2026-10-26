"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  History,
  LogOut,
  Menu,
  X,
  GraduationCap
} from "lucide-react";

export default function CandidateSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(true);

  // Hide sidebar on the active exam-taking interface (since it needs to be distraction-free!)
  const isTakingExam = pathname.includes("/active");
  if (isTakingExam) return null;

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const navItems = [
    { name: "Dashboard", href: "/candidate/dashboard", icon: LayoutDashboard },
    { name: "My Attempts", href: "/candidate/attempts", icon: History },
  ];

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed z-50 bottom-4 right-4 bg-indigo-600 text-white p-3 rounded-full shadow-lg border border-indigo-500 hover:bg-indigo-500 cursor-pointer print:hidden"
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar Container */}
      <div
        className={`${
          isOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0 lg:w-20"
        } transition-all duration-300 ease-in-out bg-slate-950 border-r border-slate-800 flex flex-col z-40 fixed lg:relative h-full shrink-0 print:hidden`}
      >
        {/* Logo Section */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-3">
          <GraduationCap className="text-indigo-400 shrink-0" size={28} />
          {isOpen && (
            <span className="font-bold text-white tracking-wider uppercase text-sm">
              MockExam Portal
            </span>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/10"
                    : "text-slate-400 hover:bg-slate-900 hover:text-white"
                }`}
              >
                <Icon size={20} className="shrink-0" />
                {isOpen && <span className="text-sm font-medium">{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Footer / Logout */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all duration-200 cursor-pointer"
          >
            <LogOut size={20} className="shrink-0" />
            {isOpen && <span className="text-sm font-medium">Log Out</span>}
          </button>
        </div>
      </div>
    </>
  );
}

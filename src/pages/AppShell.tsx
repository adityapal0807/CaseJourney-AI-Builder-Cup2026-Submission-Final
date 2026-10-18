import { useState, lazy, Suspense } from "react";
import SimpleLogin from "./SimpleLogin.tsx";

const AdminDashboard = lazy(() => import("./admin/page.tsx"));
const CandidateApp = lazy(() => import("./CandidateApp.tsx"));

export default function AppShell() {
  const [currentUser, setCurrentUser] = useState<{ role: "user" | "admin"; name: string } | null>(() => {
    const saved = localStorage.getItem("casejourney_poc_user");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
    return null;
  });

  const handleLogin = (role: "user" | "admin", name: string) => {
    const user = { role, name };
    localStorage.setItem("casejourney_poc_user", JSON.stringify(user));
    localStorage.setItem("casejourney_dev_role", role);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    localStorage.removeItem("casejourney_poc_user");
    localStorage.removeItem("casejourney_dev_role");
    setCurrentUser(null);
  };

  const handleSwitchRole = () => {
    if (!currentUser) return;
    const nextRole = currentUser.role === "admin" ? "user" : "admin";
    const nextName = nextRole === "admin" ? "Admin" : "Aditya";
    handleLogin(nextRole, nextName);
  };

  if (!currentUser) {
    return <SimpleLogin onLoginAs={handleLogin} />;
  }

  return (
    <div className="relative min-h-screen">
      {/* Floating POC Top Switcher Bar */}
      <aside aria-label="POC Sandbox Controls" className="fixed top-2 right-4 z-50 flex items-center gap-2 bg-[#0d1527]/90 border border-[#1e293b] backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg text-xs text-slate-300">
        <span className="flex items-center gap-1.5 font-medium">
          <span className={`w-2 h-2 rounded-full ${currentUser.role === "admin" ? "bg-blue-400" : "bg-cyan-400"}`} />
          {currentUser.name} ({currentUser.role.toUpperCase()})
        </span>
        <span className="text-slate-600">|</span>
        <button
          onClick={handleSwitchRole}
          className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium hover:underline"
        >
          Switch to {currentUser.role === "admin" ? "Aditya" : "Admin"}
        </button>
        <span className="text-slate-600">|</span>
        <button
          onClick={handleLogout}
          className="text-slate-400 hover:text-red-400 transition-colors"
        >
          Exit
        </button>
      </aside>

      <Suspense fallback={null}>
        {currentUser.role === "admin" ? <AdminDashboard /> : <CandidateApp />}
      </Suspense>
    </div>
  );
}

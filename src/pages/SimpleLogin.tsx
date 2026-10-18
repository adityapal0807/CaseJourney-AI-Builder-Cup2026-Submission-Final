import { useState } from "react";
import { Sparkles, ArrowRight, ShieldCheck, UserCheck } from "lucide-react";

interface SimpleLoginProps {
  onLoginAs: (role: "user" | "admin", name: string) => void;
}

export default function SimpleLogin({ onLoginAs }: SimpleLoginProps) {
  const [selectedRole, setSelectedRole] = useState<"user" | "admin">("user");

  return (
    <div className="min-h-screen bg-[#070b14] text-white flex flex-col justify-center items-center px-4 relative overflow-hidden font-sans">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-[#1d4ed8]/20 via-[#38bdf8]/10 to-transparent blur-3xl pointer-events-none rounded-full" />

      {/* Main card */}
      <div className="w-full max-w-md bg-[#0d1527]/90 border border-[#1e293b] rounded-2xl p-8 shadow-2xl relative z-10 backdrop-blur-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#2563eb] to-[#0284c7] shadow-lg shadow-blue-500/25 mb-4 border border-blue-400/30">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">CaseJourney POC</h1>
          <p className="text-sm text-slate-400">Global AI Hackathon Interactive Prototype</p>
        </div>

        {/* Role Toggle Selector */}
        <div className="grid grid-cols-2 gap-3 mb-6 p-1 bg-[#0b101f] border border-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setSelectedRole("user")}
            className={`flex flex-col items-center justify-center p-3.5 rounded-lg border transition-all duration-150 ${
              selectedRole === "user"
                ? "bg-[#1e293b] text-white border-blue-500/50 shadow-md shadow-blue-900/20"
                : "bg-transparent text-slate-400 border-transparent hover:text-slate-200"
            }`}
          >
            <UserCheck className={`w-5 h-5 mb-1.5 ${selectedRole === "user" ? "text-cyan-400" : "text-slate-500"}`} />
            <span className="font-semibold text-sm">Aditya</span>
            <span className="text-[11px] text-slate-400">Candidate / Interviewee</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole("admin")}
            className={`flex flex-col items-center justify-center p-3.5 rounded-lg border transition-all duration-150 ${
              selectedRole === "admin"
                ? "bg-[#1e293b] text-white border-blue-500/50 shadow-md shadow-blue-900/20"
                : "bg-transparent text-slate-400 border-transparent hover:text-slate-200"
            }`}
          >
            <ShieldCheck className={`w-5 h-5 mb-1.5 ${selectedRole === "admin" ? "text-blue-400" : "text-slate-500"}`} />
            <span className="font-semibold text-sm">Admin</span>
            <span className="text-[11px] text-slate-400">Case Creation & Flows</span>
          </button>
        </div>

        {/* Role Summary Callout */}
        <div className="mb-6 p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs text-slate-300">
          {selectedRole === "user" ? (
            <p>
              <strong className="text-cyan-300">Candidate Mode:</strong> Browse cases (including EV Charging in Gurgaon), take the AI voice interview with live progressive exhibits, and view the post-session MindFlow diagram.
            </p>
          ) : (
            <p>
              <strong className="text-blue-300">Admin Mode:</strong> Create new cases, configure interview stages, define framework tree nodes, and customize rubrics.
            </p>
          )}
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={() => onLoginAs(selectedRole, selectedRole === "admin" ? "Admin" : "Aditya")}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-white bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 shadow-lg shadow-blue-600/30 transition-all duration-150 active:scale-[0.98]"
        >
          <span>Enter as {selectedRole === "admin" ? "Admin" : "Aditya"}</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {/* Footer info */}
        <div className="mt-6 text-center text-[11px] text-slate-500">
          No sign-up or verification needed &bull; Zero external analytics
        </div>
      </div>
    </div>
  );
}

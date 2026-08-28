import { 
  Activity, 
  Layers, 
  FileText, 
  History, 
  BookOpen, 
  Info,
  User
} from "lucide-react";

interface SidebarProps {
  activeTab: "dashboard" | "assessment" | "methodology" | "about" | "history";
  setActiveTab: (tab: "dashboard" | "assessment" | "methodology" | "about" | "history") => void;
  systemStatus: string;
}

export default function Sidebar({ activeTab, setActiveTab, systemStatus }: SidebarProps) {
  return (
    <aside className="w-[240px] bg-[#07152E] text-slate-100 flex flex-col justify-between border-r border-slate-800 shrink-0 select-none">
      <div>
        {/* Brand Header */}
        <div className="p-6 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] rounded-lg text-white shadow-md shadow-indigo-600/10">
              <Activity size={18} />
            </div>
            <div>
              <h1 className="font-extrabold text-sm leading-tight text-white tracking-tight">MedAssist AI</h1>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase leading-none mt-0.5">
                Clinical Decision Support
              </p>
            </div>
          </div>
        </div>
        
        {/* Navigation items */}
        <nav className="p-4 space-y-1">
          <button 
            onClick={() => setActiveTab("dashboard")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold tracking-tight transition-all ${
              activeTab === "dashboard" 
                ? "bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white shadow-md shadow-indigo-600/15" 
                : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
            }`}
          >
            <Layers size={14} className={activeTab === "dashboard" ? "text-white" : "text-slate-400"} />
            Dashboard
          </button>
          
          <button 
            onClick={() => setActiveTab("assessment")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold tracking-tight transition-all ${
              activeTab === "assessment" 
                ? "bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white shadow-md shadow-indigo-600/15" 
                : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
            }`}
          >
            <FileText size={14} className={activeTab === "assessment" ? "text-white" : "text-slate-400"} />
            New Assessment
          </button>
          
          <button 
            onClick={() => setActiveTab("history")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold tracking-tight transition-all ${
              activeTab === "history" 
                ? "bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white shadow-md shadow-indigo-600/15" 
                : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
            }`}
          >
            <History size={14} className={activeTab === "history" ? "text-white" : "text-slate-400"} />
            Assessment History
          </button>

          <button 
            onClick={() => setActiveTab("methodology")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold tracking-tight transition-all ${
              activeTab === "methodology" 
                ? "bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white shadow-md shadow-indigo-600/15" 
                : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
            }`}
          >
            <BookOpen size={14} className={activeTab === "methodology" ? "text-white" : "text-slate-400"} />
            Methodology
          </button>

          <button 
            onClick={() => setActiveTab("about")}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-xs font-semibold tracking-tight transition-all ${
              activeTab === "about" 
                ? "bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] text-white shadow-md shadow-indigo-600/15" 
                : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
            }`}
          >
            <Info size={14} className={activeTab === "about" ? "text-white" : "text-slate-400"} />
            About MedAssist AI
          </button>
        </nav>
      </div>

      {/* Sidebar Footer details */}
      <div className="border-t border-slate-850">
        
        {/* Status Indicator */}
        <div className="p-4 border-b border-slate-850">
          <div className="flex items-center justify-between text-[10px] text-slate-500 font-semibold tracking-tight">
            <span>System Status</span>
            <div className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${
                systemStatus === "healthy" ? "bg-emerald-500 animate-pulse" :
                systemStatus === "connecting" ? "bg-amber-500 animate-pulse" : "bg-red-500"
              }`} />
              <span className="capitalize text-slate-400 text-[10px]">
                {systemStatus === "healthy" ? "All engines operational" : systemStatus === "connecting" ? "Syncing..." : "Server Offline"}
              </span>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="p-4 flex items-center gap-3">
          <div className="h-8 w-8 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 border border-slate-700 relative shrink-0">
            <User size={16} />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-emerald-500 border border-slate-900 rounded-full" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-1">
              <h5 className="text-[11px] font-bold text-slate-200 leading-none truncate">Research User</h5>
              <span className="text-[9px] text-amber-500 font-bold flex items-center shrink-0 gap-0.5 bg-amber-500/10 border border-amber-500/20 px-1 py-0.5 rounded leading-none">
                🔥 12d
              </span>
            </div>
            <span className="text-[9px] text-slate-500 font-medium block mt-0.5 truncate">Clinical Researcher</span>
          </div>
        </div>

      </div>
    </aside>
  );
}

import { 
  Activity, 
  Layers, 
  FileText, 
  History, 
  BookOpen, 
  Info,
  User
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SidebarProps {
  activeTab: "dashboard" | "assessment" | "methodology" | "about";
  setActiveTab: (tab: "dashboard" | "assessment" | "methodology" | "about") => void;
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
          
          {/* Assessment History - Disabled / Coming Soon */}
          <div className="w-full flex items-center justify-between gap-2 px-4 py-3 text-slate-500 rounded-lg text-xs font-semibold cursor-not-allowed hover:bg-slate-800/10">
            <div className="flex items-center gap-3">
              <History size={14} className="text-slate-600" />
              <span>Assessment History</span>
            </div>
            <Badge className="bg-slate-800 text-[8px] font-bold px-1.5 py-0 border-0 text-slate-400 uppercase tracking-widest scale-90">
              Soon
            </Badge>
          </div>

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
          <div className="h-8 w-8 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 border border-slate-700">
            <User size={16} />
          </div>
          <div>
            <h5 className="text-[11px] font-bold text-slate-200 leading-none">Research User</h5>
            <span className="text-[9px] text-slate-500 font-medium">Clinical Researcher</span>
          </div>
        </div>

      </div>
    </aside>
  );
}

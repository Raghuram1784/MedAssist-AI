import { ArrowRight, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroCardProps {
  onStartAssessment: () => void;
  onExploreMethodology: () => void;
}

export default function HeroCard({ onStartAssessment, onExploreMethodology }: HeroCardProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#4F46E5] via-[#7C3AED] to-[#06B6D4] text-white p-6 shadow-md shadow-indigo-600/10">
      
      {/* Decorative Vector Graphic Background Overlay */}
      <div className="absolute right-0 top-0 bottom-0 w-1/3 hidden md:flex items-center justify-center opacity-15 pointer-events-none select-none">
        <svg viewBox="0 0 200 200" fill="none" className="w-48 h-48 stroke-white stroke-2">
          {/* Stethoscope + Brain nodes conceptual overlay */}
          <path d="M100 30 C130 30, 150 50, 150 80 C150 120, 100 150, 100 170" />
          <path d="M100 30 C70 30, 50 50, 50 80 C50 120, 100 150, 100 170" />
          <circle cx="100" cy="170" r="10" fill="white" />
          <circle cx="100" cy="80" r="5" fill="white" />
          <line x1="100" y1="80" x2="65" y2="60" />
          <circle cx="65" cy="60" r="4" fill="white" />
          <line x1="100" y1="80" x2="135" y2="60" />
          <circle cx="135" cy="60" r="4" fill="white" />
          <line x1="100" y1="80" x2="100" y2="120" />
          <circle cx="100" cy="120" r="4" fill="white" />
          <line x1="65" y1="60" x2="100" y2="120" />
          <line x1="135" y1="60" x2="100" y2="120" />
        </svg>
      </div>

      <div className="relative z-10 max-w-2xl space-y-4">
        <div className="space-y-1">
          <span className="text-[10px] uppercase font-extrabold tracking-widest text-indigo-100 bg-white/10 px-2.5 py-0.5 rounded-full">
            AI-Powered Clinical Decision Support
          </span>
          <h2 className="text-2xl font-extrabold tracking-tight leading-tight">
            AI-Assisted Clinical<br />Decision Support
          </h2>
        </div>

        <p className="text-xs text-indigo-100 leading-relaxed font-medium">
          Evidence-grounded clinical reasoning using semantic retrieval, medical knowledge graphs, and LLM-assisted explanation. Grounded context ensures verifiable, citation-backed support for candidate conditions.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button 
            onClick={onStartAssessment} 
            className="h-9 px-4 bg-white hover:bg-slate-100 text-indigo-700 font-bold text-xs shadow-md shadow-black/5 gap-2 rounded-lg"
          >
            Start New Assessment <ArrowRight size={14} />
          </Button>
          <Button 
            onClick={onExploreMethodology} 
            variant="outline" 
            className="h-9 px-4 border-white/30 text-white bg-transparent hover:bg-white/10 hover:text-white font-semibold text-xs rounded-lg gap-2"
          >
            <BookOpen size={14} />
            Explore Methodology
          </Button>
        </div>
      </div>

    </div>
  );
}

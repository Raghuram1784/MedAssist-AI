import React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface MetricCardProps {
  value: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  iconBgColor?: string;
  iconColor?: string;
  accentColor?: string;
}

export default function MetricCard({ 
  value, 
  label, 
  description, 
  icon: Icon,
  iconBgColor = "bg-indigo-50",
  iconColor = "text-indigo-600",
  accentColor = ""
}: MetricCardProps) {
  return (
    <Card className={`shadow-sm border border-[#E2E8F0] hover:border-slate-350 transition-all duration-200 bg-white rounded-xl ${accentColor}`}>
      <CardContent className="p-4 flex items-start gap-4">
        
        <div className={`p-2.5 rounded-xl ${iconBgColor} ${iconColor} shrink-0 mt-0.5`}>
          <Icon size={18} />
        </div>

        <div className="space-y-1 select-none">
          <span className="block text-xl font-extrabold text-[#0F172A] tracking-tight leading-none">
            {value}
          </span>
          <h4 className="font-bold text-xs text-[#0F172A] tracking-tight leading-none pt-0.5">
            {label}
          </h4>
          <p className="text-[10px] text-[#64748B] leading-snug">
            {description}
          </p>
        </div>

      </CardContent>
    </Card>
  );
}

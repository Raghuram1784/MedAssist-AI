import MethodologyCard from "@/components/methodology/MethodologyCard";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function Methodology() {
  return (
    <div className="space-y-6">
      
      <Card className="border-l-4 border-l-[#4F46E5] bg-white rounded-xl shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-extrabold text-[#0F172A] tracking-tight leading-none">Clinical Methodology</CardTitle>
          <CardDescription className="text-xs">
            A multi-layer clinical reasoning architecture combining semantic retrieval, structured medical knowledge, and grounded LLM reasoning.
          </CardDescription>
        </CardHeader>
      </Card>

      <MethodologyCard />

    </div>
  );
}

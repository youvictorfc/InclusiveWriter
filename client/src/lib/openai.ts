import { type AnalysisResult } from "@shared/schema";
import { apiRequest } from "./queryClient";

export async function analyzeText(content: string): Promise<AnalysisResult> {
  const res = await apiRequest("POST", "/api/analyze", { content });
  const data = await res.json();
  return data.analysis;
}

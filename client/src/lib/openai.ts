import { type AnalysisResult, type AnalysisMode } from "@shared/schema";
import { apiRequest } from "./queryClient";

export async function analyzeText(content: string, mode: AnalysisMode): Promise<AnalysisResult> {
  try {
    const res = await apiRequest("POST", "/api/analyze", { content, mode });
    const data = await res.json();
    return data.analysis;
  } catch (error) {
    console.error('Analysis error:', error);
    throw error;
  }
}
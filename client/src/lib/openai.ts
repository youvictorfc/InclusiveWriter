import { type AnalysisResult, type AnalysisMode } from "@shared/schema";
import { apiRequest } from "./queryClient";

interface AnalysisResponse {
  analysis: AnalysisResult;
  modeSuggestion?: {
    suggestedMode: AnalysisMode;
    explanation: string;
  };
}

export async function analyzeText(content: string, mode: AnalysisMode): Promise<AnalysisResponse> {
  try {
    if (!content.trim()) {
      throw new Error("Content cannot be empty");
    }

    const res = await apiRequest("POST", "/api/analyze", { content, mode });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Analysis failed');
    }

    const data = await res.json();

    // Check if the response has the expected structure
    if (!data.analysis?.issues || !Array.isArray(data.analysis.issues)) {
      throw new Error("Invalid response format from analysis");
    }

    return data;
  } catch (error: any) {
    console.error('Analysis error:', error);
    throw error;
  }
}
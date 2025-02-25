import { type AnalysisResult, type AnalysisMode } from "@shared/schema";
import { apiRequest } from "./queryClient";

export async function analyzeText(content: string, mode: AnalysisMode): Promise<AnalysisResult> {
  try {
    if (!content.trim()) {
      throw new Error("Content cannot be empty");
    }

    const res = await apiRequest("POST", "/api/analyze", { content, mode });
    let data;
    try {
      data = await res.json();
    } catch (e) {
      throw new Error("Failed to parse analysis response");
    }

    // Check if there's an error message in the response
    if (data.error) {
      throw new Error(data.error);
    }

    // Check if the response has the expected structure
    if (!data.analysis?.issues || !Array.isArray(data.analysis.issues)) {
      throw new Error("Invalid response format from analysis");
    }

    return data.analysis;
  } catch (error) {
    console.error('Analysis error:', error);
    throw error;
  }
}
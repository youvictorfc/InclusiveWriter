import { z } from "zod";

export interface User {
  id: number;
  email: string;
  supabase_id: string | null;
  created_at: string;
}

export interface Document {
  id: number;
  user_id: number;
  title: string;
  content: string;
  html_content: string;
  analysis_mode: AnalysisMode | null;
  analysis_result: AnalysisResult | null;
  created_at: string;
  updated_at: string;
}

export interface Analysis {
  id: number;
  content: string;
  mode: string;
  analysis: AnalysisResult;
}

export type AnalysisMode = 'language' | 'policy' | 'recruitment';

export type AnalysisResult = {
  issues: Array<{
    text: string;
    startIndex: number;
    endIndex: number;
    suggestion: string;
    reason: string;
    severity: 'low' | 'medium' | 'high';
  }>;
};

// Validation schemas
export const analysisResultSchema = z.object({
  issues: z.array(
    z.object({
      text: z.string(),
      startIndex: z.number(),
      endIndex: z.number(),
      suggestion: z.string(),
      reason: z.string(),
      severity: z.enum(['low', 'medium', 'high']),
    })
  ),
});

export const documentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  html_content: z.string().min(1, "HTML content is required"),
  analysis_mode: z.enum(['language', 'policy', 'recruitment']).nullable(),
  analysis_result: analysisResultSchema.nullable(),
});

export const userSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export type InsertDocument = z.infer<typeof documentSchema>;
export type InsertUser = z.infer<typeof userSchema>;
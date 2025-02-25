import { pgTable, text, serial, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  mode: text("mode").notNull(),
  analysis: jsonb("analysis").notNull(),
});

export const insertAnalysisSchema = createInsertSchema(analyses).omit({
  id: true,
});

export type Analysis = typeof analyses.$inferSelect;
export type InsertAnalysis = z.infer<typeof insertAnalysisSchema>;

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

// Add validation schema for the analysis result
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
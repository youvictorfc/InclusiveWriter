import { pgTable, text, serial, jsonb, timestamp, varchar, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

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

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  supabaseId: text("supabase_id").unique(), 
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  documents: many(documents),
}));

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: serial("user_id").references(() => users.id).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  htmlContent: text("html_content").notNull(),
  analysisMode: text("analysis_mode"),
  analysisResult: jsonb("analysis_result"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const documentsRelations = relations(documents, ({ one }) => ({
  user: one(users, {
    fields: [documents.userId],
    references: [users.id],
  }),
}));

export const insertUserSchema = createInsertSchema(users)
  .omit({
    id: true,
    supabaseId: true,
    createdAt: true,
  })
  .extend({
    email: z.string().email("Please enter a valid email address"),
  });

export const insertDocumentSchema = createInsertSchema(documents)
  .omit({
    id: true,
    userId: true,
    createdAt: true,
    updatedAt: true,
    analysisMode: true,
    analysisResult: true,
  });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

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
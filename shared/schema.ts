import { pgTable, serial, text, timestamp, json } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull(),
  supabase_id: text('supabase_id').unique().notNull(),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Relations for users
export const usersRelations = relations(users, ({ many }) => ({
  documents: many(documents)
}));

// Documents table
export const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  user_id: serial('user_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  html_content: text('html_content').notNull(),
  analysis_mode: text('analysis_mode', { enum: ['language', 'policy', 'recruitment'] }),
  analysis_result: json('analysis_result').$type<AnalysisResult | null>(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Relations for documents
export const documentsRelations = relations(documents, ({ one }) => ({
  user: one(users, {
    fields: [documents.user_id],
    references: [users.id],
  })
}));

// Types and validation schemas
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

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

// Zod schemas for validation
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

// Insert schemas
export const insertUserSchema = createInsertSchema(users);
export const insertDocumentSchema = createInsertSchema(documents);
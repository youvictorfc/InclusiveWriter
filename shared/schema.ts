import { pgTable, text, serial, jsonb, timestamp, varchar, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Update users table with verification fields
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  verificationToken: text("verification_token"),
  verificationExpires: timestamp("verification_expires"),
});

// Enhanced validation for registration
export const insertUserSchema = createInsertSchema(users)
  .omit({
    id: true,
    passwordHash: true,
    createdAt: true,
    isVerified: true,
    verificationToken: true,
    verificationExpires: true,
  })
  .extend({
    password: z.string().min(6, "Password must be at least 6 characters"),
    email: z.string().email("Please enter a valid email address"),
  });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export const analyses = pgTable("analyses", {
  id: serial("id").primaryKey(),
  content: text("content").notNull(),
  mode: text("mode").notNull(),
  analysis: jsonb("analysis").notNull(),
});

export const insertAnalysisSchema = createInsertSchema(analyses).omit({
  id: true,
});

export type Analysis = {
  id: number;
  content: string;
  mode: AnalysisMode;
  analysis: AnalysisResult;
};
export type InsertAnalysis = Omit<Analysis, 'id'>;

// Add documents table after analyses table
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id", {length: 36}).references(() => users.id).notNull(), // Changed to varchar(36) for UUID
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  htmlContent: text("html_content").notNull(),
  analysisMode: text("analysis_mode"),
  analysisResult: jsonb("analysis_result"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true,
  analysisMode: true,
  analysisResult: true,
});

export type Document = {
  id: number;
  userId: string; // Changed from number to string for Supabase UUID
  title: string;
  content: string;
  htmlContent: string;
  analysisMode?: AnalysisMode;
  analysisResult?: AnalysisResult;
  createdAt: string;
  updatedAt: string;
};

export type InsertDocument = Omit<Document, 'id' | 'userId' | 'createdAt' | 'updatedAt'>;

export type AnalysisMode = 'language' | 'policy' | 'recruitment';

export type AnalysisResult = {
  issues: Array<{
    text: string;
    suggestion: string;
    reason: string;
    severity: 'low' | 'medium' | 'high';
  }>;
};

export const analysisResultSchema = z.object({
  issues: z.array(
    z.object({
      text: z.string(),
      suggestion: z.string(),
      reason: z.string(),
      severity: z.enum(['low', 'medium', 'high']),
    })
  ),
});
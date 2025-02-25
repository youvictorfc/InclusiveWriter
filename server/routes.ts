import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import OpenAI from "openai";
import { insertAnalysisSchema, type AnalysisMode, analysisResultSchema } from "@shared/schema";
import { z } from "zod";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const getGuidelinesForMode = (mode: AnalysisMode): string => {
  switch (mode) {
    case 'language':
      return `
      Analyze the text for general inclusive language issues including:
      - Gender-neutral language
      - Cultural sensitivity
      - Disability-inclusive terminology
      - Age-inclusive language
      - Socioeconomic inclusion
      - Avoiding exclusionary idioms
      `;
    case 'policy':
      return `
      Analyze policy documentation for inclusivity issues including:
      - Legal compliance and regulatory framework alignment
      - Universal accessibility considerations
      - Organizational equity principles
      - Accommodations language
      - Remote and flexible work considerations
      - Assistive technology compatibility
      - Clear dispute resolution procedures
      `;
    case 'recruitment':
      return `
      Analyze recruitment content for inclusivity issues including:
      - Job requirement neutrality
      - Skills-based vs credential-based language
      - Removal of gendered job descriptors
      - Accessibility in application process
      - Diverse candidate pool encouragement
      - Inclusive workplace culture representation
      - Flexible work arrangements
      `;
    default:
      return 'Analyze the text for general inclusive language issues.';
  }
};

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
export async function registerRoutes(app: Express) {
  app.post("/api/analyze", async (req, res) => {
    try {
      const { content, mode } = await insertAnalysisSchema.parseAsync(req.body);

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert at identifying non-inclusive language. ${getGuidelinesForMode(mode as AnalysisMode)} Return the results in JSON format with the following structure: { issues: [{ text: string, startIndex: number, endIndex: number, suggestion: string, reason: string, severity: 'low' | 'medium' | 'high' }] }`
          },
          {
            role: "user",
            content
          }
        ],
        response_format: { type: "json_object" }
      });

      if (!response.choices[0].message.content) {
        throw new Error("No response from OpenAI");
      }

      const analysisResult = JSON.parse(response.choices[0].message.content);

      // Validate the analysis result
      const validatedResult = await analysisResultSchema.parseAsync(analysisResult);

      const result = await storage.createAnalysis({
        content,
        mode,
        analysis: validatedResult
      });

      res.json(result);
    } catch (error) {
      console.error('Analysis error:', error);
      res.status(400).json({ error: (error as Error).message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
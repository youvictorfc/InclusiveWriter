import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import OpenAI from "openai";
import { insertAnalysisSchema } from "@shared/schema";
import { z } from "zod";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
export async function registerRoutes(app: Express) {
  app.post("/api/analyze", async (req, res) => {
    try {
      const { content } = await insertAnalysisSchema.parseAsync(req.body);

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are an expert at identifying non-inclusive language. Analyze the text and identify any non-inclusive language, providing alternatives and explanations. Return the results in JSON format with the following structure: { issues: [{ text: string, startIndex: number, endIndex: number, suggestion: string, reason: string, severity: 'low' | 'medium' | 'high' }] }"
          },
          {
            role: "user",
            content
          }
        ],
        response_format: { type: "json_object" }
      });

      const analysis = JSON.parse(response.choices[0].message.content);
      
      const result = await storage.createAnalysis({
        content,
        analysis
      });

      res.json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

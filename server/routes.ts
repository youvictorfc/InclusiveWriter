import type { Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import OpenAI from "openai";
import { type AnalysisMode, analysisResultSchema } from "@shared/schema";
import { setupAuth } from "./auth";

// Validate OpenAI API key
if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY environment variable is required");
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024
export async function registerRoutes(app: Express) {
  // Set up authentication routes first
  setupAuth(app);

  app.post("/api/analyze", async (req, res) => {
    try {
      const { content, mode } = req.body;

      // Validate request body
      if (!content || typeof content !== 'string') {
        throw new Error('Content is required and must be a string');
      }

      if (!mode || !['language', 'policy', 'recruitment'].includes(mode)) {
        throw new Error('Valid mode is required');
      }

      // Ensure user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Select the appropriate system prompt based on mode
      let systemPrompt = '';
      switch (mode) {
        case 'language':
          systemPrompt = `You are an expert at identifying non-inclusive language. Analyze the text and identify specific instances of non-inclusive language.
            For each issue found, provide:
            1. The exact problematic text
            2. A suggested alternative
            3. A clear explanation of why this needs to be changed
            4. The severity level (low, medium, or high)`;
          break;
        case 'policy':
          systemPrompt = `You are an expert at analyzing organizational policies for inclusivity and fairness. Review the policy text and identify areas that could be improved.
            For each issue found, provide:
            1. The exact policy text that needs attention
            2. A suggested revision
            3. An explanation of why this change would make the policy more inclusive
            4. The severity level (low, medium, or high) based on potential impact`;
          break;
        case 'recruitment':
          systemPrompt = `You are an expert at analyzing recruitment and job-related content for bias and inclusivity. Review the text and identify potential barriers or biases.
            For each issue found, provide:
            1. The exact text that may limit candidate diversity
            2. A suggested alternative
            3. An explanation of how this change promotes inclusive recruitment
            4. The severity level (low, medium, or high) based on potential impact on candidate pool`;
          break;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `${systemPrompt}

            Return the results in this exact JSON format:
            {
              "issues": [
                {
                  "text": "exact text found",
                  "startIndex": 0,
                  "endIndex": 0,
                  "suggestion": "suggested replacement",
                  "reason": "explanation of why this needs to be changed",
                  "severity": "low" | "medium" | "high"
                }
              ]
            }`
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

      // Create the analysis result with correct structure
      const validatedResult = {
        issues: analysisResult.issues.map((issue: any) => ({
          text: issue.text,
          startIndex: 0, // We'll calculate these on the frontend
          endIndex: 0,   // since they depend on the actual text placement
          suggestion: issue.suggestion,
          reason: issue.reason,
          severity: issue.severity,
        }))
      };

      // Validate the analysis result
      const validatedAnalysis = await analysisResultSchema.parseAsync(validatedResult);

      const result = await storage.createAnalysis({
        content,
        mode,
        analysis: validatedAnalysis
      });

      res.json({ analysis: validatedAnalysis });
    } catch (error) {
      console.error('Analysis error:', error);

      // Handle specific OpenAI errors
      if (error instanceof OpenAI.APIError) {
        if (error.status === 429) {
          return res.status(429).json({
            error: "OpenAI API rate limit reached. Please check your API key quota and try again later."
          });
        }
        if (error.status === 401) {
          return res.status(401).json({
            error: "Invalid OpenAI API key. Please check your API key configuration."
          });
        }
        if (error.status === 500) {
          return res.status(500).json({
            error: "OpenAI service error. Please try again later."
          });
        }
        return res.status(error.status || 500).json({
          error: "OpenAI API error: " + error.message
        });
      }

      res.status(400).json({ 
        error: error instanceof Error ? error.message : 'Analysis failed' 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
import { type Express } from "express";
import { createServer } from "http";
import { storage } from "./storage";
import OpenAI from "openai";
import { insertAnalysisSchema, type AnalysisMode, analysisResultSchema } from "@shared/schema";
import { z } from "zod";

// Validate OpenAI API key exists
if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY environment variable");
}

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

export async function registerRoutes(app: Express) {
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

      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4", // Using gpt-4 since gpt-4o was causing issues
          messages: [
            {
              role: "system",
              content: `You are an expert at identifying non-inclusive language. ${getGuidelinesForMode(mode as AnalysisMode)} 
              Analyze the text and identify specific instances of non-inclusive language.
              For each issue found, provide:
              1. The exact problematic text
              2. A suggested alternative
              3. A clear explanation of why this needs to be changed
              4. The severity level (low, medium, or high)

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

        let analysisResult;
        try {
          analysisResult = JSON.parse(response.choices[0].message.content);
        } catch (parseError) {
          console.error('Failed to parse OpenAI response:', parseError);
          throw new Error("Failed to parse analysis response");
        }

        if (!analysisResult || !Array.isArray(analysisResult.issues)) {
          console.error('Invalid analysis result structure:', analysisResult);
          throw new Error("Invalid response format from OpenAI");
        }

        // Create the analysis result with correct structure
        const validatedResult = {
          issues: analysisResult.issues.map((issue: any) => ({
            text: issue.text || '',
            startIndex: 0, // We'll calculate these on the frontend
            endIndex: 0,   // since they depend on the actual text placement
            suggestion: issue.suggestion || '',
            reason: issue.reason || '',
            severity: issue.severity || 'low',
          }))
        };

        // Validate the analysis result
        try {
          const validatedAnalysis = await analysisResultSchema.parseAsync(validatedResult);

          const result = await storage.createAnalysis({
            content,
            mode,
            analysis: validatedAnalysis
          });

          return res.json(result);
        } catch (validationError) {
          console.error('Validation error:', validationError);
          throw new Error("Invalid analysis format");
        }
      } catch (error) {
        if (error instanceof OpenAI.APIError) {
          console.error('OpenAI API Error:', error);
          if (error.status === 429) {
            return res.status(429).json({
              error: "The OpenAI API is currently unavailable due to rate limiting. Please check your plan and billing details."
            });
          }
          if (error.type === 'insufficient_quota') {
            return res.status(429).json({
              error: "You have exceeded your OpenAI API quota. Please check your plan and billing details."
            });
          }
          return res.status(error.status || 500).json({
            error: "There was an issue with the analysis service. Please try again later."
          });
        }
        // Handle parsing errors
        if (error instanceof SyntaxError) {
          return res.status(500).json({
            error: "Failed to parse the analysis results. Please try again."
          });
        }
        // Handle validation errors
        if (error instanceof z.ZodError) {
          return res.status(400).json({
            error: "Invalid analysis format. Please try again."
          });
        }
        throw error; // Re-throw other errors to be caught by outer catch
      }
    } catch (error) {
      console.error('Analysis error:', error);
      res.status(400).json({
        error: error instanceof Error ? error.message : 'Analysis failed. Please try again later.'
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
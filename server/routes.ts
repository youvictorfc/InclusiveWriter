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

  app.post("/api/documents", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const document = await storage.createDocument({
        ...req.body,
        userId: req.user.id,
      });

      res.json(document);
    } catch (error) {
      console.error('Document creation error:', error);
      res.status(500).json({ error: 'Failed to create document' });
    }
  });

  app.get("/api/documents", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const documents = await storage.getUserDocuments(req.user.id);
      res.json(documents);
    } catch (error) {
      console.error('Document fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch documents' });
    }
  });

  app.get("/api/documents/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const documentId = parseInt(req.params.id);
      if (isNaN(documentId)) {
        console.error('Invalid document ID:', req.params.id);
        return res.status(400).json({ error: "Invalid document ID" });
      }

      console.log('Fetching document with ID:', documentId);
      const document = await storage.getDocument(documentId);

      if (!document) {
        console.error('Document not found:', documentId);
        return res.status(404).json({ error: "Document not found" });
      }

      if (document.userId !== req.user.id) {
        console.error('Access denied for user', req.user.id, 'trying to access document', documentId);
        return res.status(403).json({ error: "Access denied" });
      }

      console.log('Successfully fetched document:', {
        id: document.id,
        title: document.title,
        contentLength: document.content.length,
        htmlContentLength: document.htmlContent.length
      });

      res.json(document);
    } catch (error) {
      console.error('Document fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch document' });
    }
  });

  app.patch("/api/documents/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const document = await storage.getDocument(parseInt(req.params.id));
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      if (document.userId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const updatedDocument = await storage.updateDocument(document.id, req.body);
      res.json(updatedDocument);
    } catch (error) {
      console.error('Document update error:', error);
      res.status(500).json({ error: 'Failed to update document' });
    }
  });

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

      // First, detect the content type
      const contentTypeResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are an expert at identifying document types. Analyze the given text and determine if it is:
              1. A policy document (containing organizational guidelines, rules, or procedures)
              2. A recruitment document (job posting, job description, or hiring-related content)
              3. General text (any other type of content)

              For policy documents, look for:
              - Organizational rules and procedures
              - Guidelines for employee behavior
              - Company-wide standards
              - Terms and conditions

              For recruitment documents, look for:
              - Job requirements and qualifications
              - Position descriptions
              - Hiring process details
              - Candidate requirements

              Return the result in this exact JSON format:
              {
                "type": "policy" | "recruitment" | "general",
                "confidence": number between 0 and 1,
                "explanation": "brief explanation of why this classification was made"
              }`
          },
          {
            role: "user",
            content
          }
        ],
        response_format: { type: "json_object" }
      });

      const contentType = JSON.parse(contentTypeResponse.choices[0].message.content);
      const detectedMode = contentType.type === 'general' ? 'language' : contentType.type;
      let modeSuggestion = null;

      // If there's a mismatch between selected mode and detected content type
      if (mode !== detectedMode && contentType.confidence > 0.7) {
        modeSuggestion = {
          suggestedMode: detectedMode as AnalysisMode,
          explanation: `It looks like you're analyzing ${contentType.type} content. ${contentType.explanation} You might get better results using the ${detectedMode} mode.`
        };
        console.log('Created mode suggestion:', modeSuggestion); // Debug log
      }

      // Select the appropriate system prompt based on mode
      let systemPrompt = '';
      switch (mode) {
        case 'language':
          systemPrompt = `You are an expert at identifying non-inclusive language. Follow these specific guidelines:
            1. Check for bias-free language and replace biased or exclusionary terms
            2. Ensure gender-neutral language usage
            3. Check for accessibility issues in content
            4. Review for ethnic and cultural sensitivity
            5. Ensure disability-aware language
            6. Verify LGBTQ+ inclusive language
            7. Check proper use of inclusive pronouns
            8. Encourage diverse representation
            9. Identify cultural appropriation issues
            10. Provide real-time, actionable feedback

            For each issue found, provide:
            1. The exact problematic text
            2. A suggested alternative
            3. A clear explanation of why this needs to be changed
            4. The severity level (low, medium, or high)`;
          break;
        case 'policy':
          systemPrompt = `You are an expert at analyzing organizational policies for inclusivity and fairness. Follow these specific guidelines:
            1. Check that language makes no stereotypes about gender, sexuality, race, ethnicity, religion, disability, age
            2. Verify policy reflects diverse workforce including remote, casual, contractors, and flex workers
            3. Ensure no assumptions about office-based work
            4. Account for assistive technologies usage
            5. Avoid assumptions about hearing, vision, or mobility
            6. Use language without assumptions about intellect or education
            7. Implement human-centered language
            8. Check for clear reasonable adjustments
            9. Verify support resources are mentioned
            10. Ensure clear dispute resolution guidelines
            11. Look for case studies in complex concepts
            12. Verify language is clear, concise, and not open to interpretation
            13. Ensure policies are understandable at all organizational levels
            14. Check for genuine inclusion of all backgrounds

            For each issue found, provide:
            1. The exact policy text that needs attention
            2. A suggested revision
            3. An explanation of why this change would make the policy more inclusive
            4. The severity level (low, medium, or high) based on potential impact`;
          break;
        case 'recruitment':
          systemPrompt = `You are an expert at analyzing recruitment and job-related content for bias and inclusivity. Follow these specific guidelines:
            1. Use gender-neutral job titles and language
            2. Focus on required skills and qualifications, not personal characteristics
            3. Avoid terms like "rock star" or "ninja" that carry bias
            4. Check for clear commitment to diversity and inclusion
            5. Ensure language is accessible and easy to understand
            6. Include appropriate equal opportunity statements
            7. Verify accommodation information for candidates with disabilities
            8. Remove age-related qualifications or expectations
            9. Include work-life balance information
            10. Maintain cultural sensitivity
            11. Highlight inclusive benefits
            12. Use encouraging language for diverse applicants

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

      const analysisResult = JSON.parse(response.choices[0].message.content);

      // Create the analysis result with correct structure and include mode suggestion
      const result = {
        analysis: {
          issues: analysisResult.issues.map((issue: any) => ({
            text: issue.text,
            startIndex: 0,
            endIndex: 0,
            suggestion: issue.suggestion,
            reason: issue.reason,
            severity: issue.severity,
          }))
        },
        modeSuggestion
      };

      console.log('Sending response with modeSuggestion:', !!modeSuggestion); // Debug log
      res.json(result);
    } catch (error) {
      console.error('Analysis error:', error);

      // Handle specific OpenAI errors
      if (error instanceof OpenAI.APIError) {
        if (error.status === 429) {
          return res.status(429).json({
            error: "OpenAI API rate limit reached. Please try again later."
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
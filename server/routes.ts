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

      const document = await storage.getDocument(parseInt(req.params.id));
      if (!document) {
        return res.status(404).json({ error: "Document not found" });
      }

      if (document.userId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

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

  app.delete("/api/documents/:id", async (req, res) => {
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

      await storage.deleteDocument(document.id);
      res.json({ message: "Document deleted successfully" });
    } catch (error) {
      console.error('Document deletion error:', error);
      res.status(500).json({ error: 'Failed to delete document' });
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
          systemPrompt = `You are an expert at analyzing language for inclusivity, with specific focus on Australian English and compliance with Australian laws. You must strictly use Australian English spelling conventions:

1. Use -ise instead of -ize (e.g., customise, organise, recognise)
2. Use -our instead of -or (e.g., colour, behaviour, favour)
3. Use -re instead of -er (e.g., centre, metre, theatre)
4. Use -ogue instead of -og (e.g., dialogue, catalogue)
5. Use Australian terminology and conventions throughout

Follow these specific guidelines:
1. Use Gender-Neutral Language:
   - Use chairperson or chair instead of chairman
   - Use police officer instead of policeman
   - Use they/them when gender is unknown or irrelevant
2. Avoid Ableist Language:
   - Use accessible parking instead of handicapped parking
   - Use person with a disability rather than disabled person unless preferred
   - Replace phrases like "falling on deaf ears" with "being ignored"
3. Use Culturally Inclusive Terms:
   - Use international visitor or non-citizen resident instead of foreigner
   - Avoid terms that stereotype ethnic or cultural groups
   - Use specific names for Indigenous Australians and Aboriginal peoples
4. Respect Personal Identities:
   - Use correct pronouns
   - Use partner or spouse instead of assuming husband/wife
   - Use appropriate transgender terminology
5. Use Person-First or Identity-First Language Thoughtfully
6. Be Mindful of Socioeconomic Bias
7. Ensure Readability and Accessibility
8. Ethnic and Cultural Sensitivity
9. Disability Awareness
10. LGBTQ+ Inclusivity
11. Inclusive Pronouns
12. Diverse Representation
13. Cultural Appropriation Awareness
14. Must not assume old-fashioned views about gender roles
15. Must comply with:
    - Australian laws
    - Australian English spelling and grammar
    - Disability Discrimination Act
    - Anti-discrimination legislation

For each issue found, provide:
1. The exact problematic text
2. A suggested alternative that uses proper Australian English
3. A clear explanation of why this needs to be changed
4. The severity level (low, medium, or high)`;
          break;

        case 'policy':
          systemPrompt = `You are an expert at analysing organisational policies for inclusivity and fairness, following Australian standards. You must strictly use Australian English spelling conventions:

1. Use -ise instead of -ize (e.g., customise, organise, recognise)
2. Use -our instead of -or (e.g., colour, behaviour, favour)
3. Use -re instead of -er (e.g., centre, metre, theatre)
4. Use -ogue instead of -og (e.g., dialogue, catalogue)
5. Use Australian terminology and conventions throughout

Follow these specific guidelines:
1. Objective & Scope: Analyse the policy's purpose and impact on inclusivity
2. Commitment to Inclusion: Check for equitable access and participation
3. Legal & Ethical Considerations: Verify alignment with anti-discrimination and accessibility laws
4. Plain Language: Ensure clear, accessible language free from jargon
5. Bias-Free Wording: Verify gender-neutral, non-stigmatising, culturally sensitive language
6. Multiple Formats: Check if policy is available in accessible formats
7. Workplace Adjustments: Verify support for reasonable accommodations
8. Cultural Competency: Check acknowledgment of diverse practices
9. Digital & Physical Accessibility: Ensure inclusive and usable by all
10. Monitoring & Reporting: Check compliance tracking responsibility
11. Complaint & Feedback Mechanism: Verify clear reporting process
12. Continuous Improvement: Check review and update process
13. Additional Requirements:
    - Use kind and respectful language
    - Use human-centred language
    - Identify reasonable adjustments
    - Mention available supports
    - Provide clear dispute resolution guidelines
    - Include case studies for complex concepts
    - Seek comments from people with lived experience
    - Use clear and concise language
    - Ensure respectful, non-divisive language
    - Make policies inclusive for all organisational levels
    - Ensure genuine inclusion regardless of race, gender, ability, age, 
      socio-economic background, health status, religion and sexuality

Must comply with:
- Australian laws
- Australian English spelling and grammar
- Disability Discrimination Act

For each issue found, provide:
1. The exact policy text needing attention
2. A suggested revision using proper Australian English
3. An explanation of why this change improves inclusivity
4. The severity level (low, medium, or high) based on impact`;
          break;

        case 'recruitment':
          systemPrompt = `You are an expert at analysing recruitment and job-related content for bias and inclusivity, following Australian standards. You must strictly use Australian English spelling conventions:

1. Use -ise instead of -ize (e.g., customise, organise, recognise)
2. Use -our instead of -or (e.g., colour, behaviour, favour)
3. Use -re instead of -er (e.g., centre, metre, theatre)
4. Use -ogue instead of -og (e.g., dialogue, catalogue)
5. Use Australian terminology and conventions throughout

Follow these specific guidelines:
1. Use gender-neutral job titles and language
2. Focus on required skills and qualifications, not personal characteristics
3. Avoid terms like "rock star" or "ninja" that carry bias
4. Check for clear commitment to diversity and inclusion
5. Ensure language is accessible and easy to understand
6. Include appropriate equal opportunity statements
7. Verify accommodation information for candidates with disability
8. Remove age-related qualifications or expectations
9. Include work-life balance information
10. Maintain cultural sensitivity
11. Highlight inclusive benefits
12. Use encouraging language for diverse applicants
13. Use Australian workplace terminology:
    - Use "annual leave" instead of "vacation"
    - Use "redundancy" instead of "layoff"
    - Use "labour hire" instead of "temp agency"
    - Use "superannuation" instead of "401k"
    - Use "casual" instead of "part-time"

For each issue found, provide:
1. The exact text that may limit candidate diversity
2. A suggested alternative using proper Australian English
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
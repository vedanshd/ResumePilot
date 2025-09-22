import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertResumeSchema, insertJobDescriptionSchema, insertCoverLetterSchema, resumeJsonSchema, ResumeJson } from "@shared/schema";
import { computeATSScore, computeATSScoreWithEmbeddings } from "./services/ats-engine";
import { computeGeminiATSScore } from "./services/gemini-ats-scorer";
import { parseJobDescription } from "./services/jd-parser";
import { generateEmbedding, suggestResumeImprovements } from "./services/gemini-enhanced";
import { analyzeJobDescription, improveCoverLetter } from "./services/cover-letter-service";
import { generateCoverLetter } from "./services/gemini-enhanced";
import { generateATSFriendlyPDF, generateCoverLetterPDF } from "./services/pdf-generator";
import { scrapeLinkedInProfile } from "./services/linkedin-scraper";
import multer from "multer";
import { z } from "zod";
import rateLimit from "express-rate-limit";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// WebSocket connections store
const wsConnections = new Map<string, Set<WebSocket>>();

function broadcastToChannel(channel: string, data: any) {
  const connections = wsConnections.get(channel);
  console.log(`🔔 Broadcasting to channel ${channel}:`, {
    hasConnections: !!connections,
    connectionCount: connections?.size || 0,
    dataKeys: Object.keys(data)
  });
  if (connections) {
    const message = JSON.stringify({ channel, data });
    console.log(`📤 Sending message to ${connections.size} connections:`, message.substring(0, 200) + '...');
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  } else {
    console.log(`⚠️ No connections found for channel ${channel}`);
    console.log(`📋 Available channels:`, Array.from(wsConnections.keys()));
  }
}

// Rate limiter for LinkedIn scraping endpoint
const linkedInRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: "Too many LinkedIn scraping requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limiter
const apiRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per minute
  message: "Too many API requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Apply general rate limiting to all API routes
  app.use('/api/', apiRateLimiter);
  
  // WebSocket server on /ws path
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws, request) => {
    console.log('WebSocket connected');
    
    ws.on('message', (message) => {
      try {
        const { channel } = JSON.parse(message.toString());
        if (channel) {
          console.log(`🔌 Client subscribing to channel: ${channel}`);
          // Subscribe to channel
          if (!wsConnections.has(channel)) {
            wsConnections.set(channel, new Set());
            console.log(`🆕 Created new channel: ${channel}`);
          }
          wsConnections.get(channel)!.add(ws);
          console.log(`📋 Channel ${channel} now has ${wsConnections.get(channel)!.size} connections`);
        }
      } catch (error) {
        console.error('Invalid WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      // Remove from all channels
      wsConnections.forEach(connections => {
        connections.delete(ws);
      });
    });
  });

  // LinkedIn scraping route with rate limiting and enhanced error handling
  app.post("/api/linkedin/scrape", linkedInRateLimiter, async (req, res) => {
    try {
      const { url } = req.body;
      
      // Input validation
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ 
          error: "LinkedIn URL is required",
          details: "Please provide a valid LinkedIn profile URL" 
        });
      }
      
      // URL format validation
      const linkedInUrlPattern = /^https?:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9-]+\/?$/;
      if (!linkedInUrlPattern.test(url)) {
        return res.status(400).json({ 
          error: "Invalid LinkedIn URL format",
          details: "URL should be in format: https://www.linkedin.com/in/username" 
        });
      }
      
      // Log the scraping attempt (for monitoring)
      console.log(`LinkedIn scraping attempt from IP: ${req.ip} for URL: ${url}`);
      
      // Set a timeout for the scraping operation
      const scrapeTimeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Scraping timeout')), 45000)
      );
      
      // Scrape LinkedIn profile with timeout
      const resumeData = await Promise.race([
        scrapeLinkedInProfile(url),
        scrapeTimeout
      ]);
      
      // Success response
      res.json({
        success: true,
        data: resumeData,
        message: "LinkedIn profile successfully imported"
      });
      
    } catch (error: any) {
      console.error("LinkedIn scraping error:", error);
      
      // Determine appropriate error response
      if (error.message === 'Scraping timeout') {
        return res.status(504).json({ 
          error: "Request timeout",
          details: "The LinkedIn profile took too long to load. Please try again.",
          fallback: true
        });
      }
      
      if (error.message?.includes('Invalid LinkedIn URL')) {
        return res.status(400).json({ 
          error: "Invalid URL",
          details: error.message 
        });
      }
      
      // Generic error with fallback indication
      res.status(500).json({ 
        error: "Failed to scrape LinkedIn profile",
        details: "An error occurred while fetching the profile. Using sample data instead.",
        fallback: true
      });
    }
  });

  // Resume routes
  app.get("/api/resumes", async (req, res) => {
    try {
      const userId = req.headers['user-id'] as string || 'anonymous';
      const resumes = await storage.getResumesByUser(userId);
      res.json(resumes);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch resumes" });
    }
  });

  app.get("/api/resumes/:id", async (req, res) => {
    try {
      const resume = await storage.getResume(req.params.id);
      if (!resume) {
        return res.status(404).json({ error: "Resume not found" });
      }
      res.json(resume);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch resume" });
    }
  });

  app.post("/api/resumes", async (req, res) => {
    try {
      const userId = req.headers['user-id'] as string || 'anonymous';
      const validatedData = insertResumeSchema.parse({
        ...req.body,
        userId,
      });
      
      // Validate the JSON structure
      resumeJsonSchema.parse(validatedData.json);
      
      const resume = await storage.createResume(validatedData);
      res.json(resume);
    } catch (error) {
      console.error("Resume creation error:", error);
      res.status(400).json({ error: "Invalid resume data" });
    }
  });

  app.patch("/api/resumes/:id", async (req, res) => {
    try {
      const updateData: any = {};
      if (req.body.title) updateData.title = req.body.title;
      if (req.body.json) {
        resumeJsonSchema.parse(req.body.json);
        updateData.json = req.body.json;
      }
      
      const resume = await storage.updateResume(req.params.id, updateData);
      res.json(resume);
    } catch (error) {
      console.error("Resume update error:", error);
      res.status(400).json({ error: "Invalid resume data" });
    }
  });

  // Job description routes
  app.get("/api/jds", async (req, res) => {
    try {
      const userId = req.headers['user-id'] as string || 'anonymous';
      const jds = await storage.getJobDescriptionsByUser(userId);
      res.json(jds);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch job descriptions" });
    }
  });

  app.get("/api/jds/:id", async (req, res) => {
    try {
      const jd = await storage.getJobDescription(req.params.id);
      if (!jd) {
        return res.status(404).json({ error: "Job description not found" });
      }
      res.json(jd);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch job description" });
    }
  });

  app.post("/api/jds", async (req, res) => {
    try {
      const userId = req.headers['user-id'] as string || 'anonymous';
      const { text, title, company } = req.body;
      
      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Job description text is required" });
      }
      
      // Parse the job description
      const parsed = parseJobDescription(text, title, company);
      
      // Generate embedding if OpenAI is available
      let embedding = null;
      try {
        embedding = await generateEmbedding(text);
      } catch (error) {
        console.warn("Failed to generate embedding:", error);
      }
      
      const jdData = insertJobDescriptionSchema.parse({
        userId,
        title: parsed.title,
        company: parsed.company,
        sourceName: company || parsed.company,
        rawText: text,
        parsed,
        embedding
      });
      
      const jd = await storage.createJobDescription(jdData);
      res.json(jd);
    } catch (error) {
      console.error("JD creation error:", error);
      res.status(400).json({ error: "Failed to parse job description" });
    }
  });

  app.post("/api/jds/upload", upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      
      const userId = req.headers['user-id'] as string || 'anonymous';
      const text = req.file.buffer.toString('utf-8');
      const filename = req.file.originalname;
      
      // Parse the job description
      const parsed = parseJobDescription(text);
      
      // Generate embedding if OpenAI is available
      let embedding = null;
      try {
        embedding = await generateEmbedding(text);
      } catch (error) {
        console.warn("Failed to generate embedding:", error);
      }
      
      const jdData = insertJobDescriptionSchema.parse({
        userId,
        title: parsed.title,
        company: parsed.company,
        sourceName: filename,
        rawText: text,
        parsed,
        embedding
      });
      
      const jd = await storage.createJobDescription(jdData);
      res.json(jd);
    } catch (error) {
      console.error("JD upload error:", error);
      res.status(500).json({ error: "Failed to process uploaded file" });
    }
  });

  app.delete("/api/jds/:id", async (req, res) => {
    try {
      const jd = await storage.getJobDescription(req.params.id);
      if (!jd) {
        return res.status(404).json({ error: "Job description not found" });
      }
      
      await storage.deleteJobDescription(req.params.id);
      res.json({ success: true, message: "Job description deleted successfully" });
    } catch (error) {
      console.error("JD deletion error:", error);
      res.status(500).json({ error: "Failed to delete job description" });
    }
  });

  // Generate cover letter for specific job description
  app.post("/api/jds/:id/cover-letter", async (req, res) => {
    try {
      const { resumeId, tone = 'professional', wordCount = 250 } = req.body;
      const userId = req.headers['user-id'] as string || 'anonymous';
      
      if (!resumeId) {
        return res.status(400).json({ error: "resumeId is required" });
      }
      
      const [resume, jd] = await Promise.all([
        storage.getResume(resumeId),
        storage.getJobDescription(req.params.id)
      ]);
      
      if (!resume || !jd) {
        return res.status(404).json({ error: "Resume or job description not found" });
      }
      
      const coverLetter = await generateCoverLetter({
        resume: resume.json as ResumeJson,
        jd: {
          id: jd.id,
          title: jd.title,
          company: jd.company,
          rawText: jd.rawText
        },
        tone,
        wordCount
      });
      
      // Save the generated cover letter
      const coverData = insertCoverLetterSchema.parse({
        userId,
        resumeId,
        jdId: req.params.id,
        contentMd: coverLetter,
        tone,
        version: 1
      });
      
      const savedCover = await storage.createCoverLetter(coverData);
      res.json(savedCover);
    } catch (error) {
      console.error("Cover letter generation error:", error);
      res.status(500).json({ error: "Failed to generate cover letter" });
    }
  });

  // Job analysis endpoint
  app.post("/api/jds/:id/analyze", async (req, res) => {
    try {
      const jd = await storage.getJobDescription(req.params.id);
      if (!jd) {
        return res.status(404).json({ error: "Job description not found" });
      }
      
      const analysis = await analyzeJobDescription(jd.rawText);
      res.json(analysis);
    } catch (error) {
      console.error("JD analysis error:", error);
      res.status(500).json({ error: "Failed to analyze job description" });
    }
  });

  // ATS scoring routes
  app.post("/api/ats/score", async (req, res) => {
    try {
      const { resumeId, jdId } = req.body;
      
      if (!resumeId || !jdId) {
        return res.status(400).json({ error: "resumeId and jdId are required" });
      }
      
      const [resume, jd] = await Promise.all([
        storage.getResume(resumeId),
        storage.getJobDescription(jdId)
      ]);
      
      if (!resume || !jd) {
        return res.status(404).json({ error: "Resume or job description not found" });
      }
      
      const channel = `ats:${resumeId}:${jdId}`;
      
      console.log('🎯 Starting legitimate ATS scoring with Gemini AI...');
      
      // Use Gemini API for legitimate ATS scoring
      const atsResult = await computeGeminiATSScore(resume.json as ResumeJson, jd.rawText || '');
      
      console.log(`📊 Genuine ATS Score computed: ${atsResult.overall}/100`);
      
      // Broadcast the legitimate score
      const scoreData = {
        partial: true,
        overall: atsResult.overall,
        breakdown: atsResult.breakdown,
        suggestions: atsResult.suggestions
      };
      
      await broadcastToChannel(channel, scoreData);
      console.log(`🎯 Generated ATS score for ${channel}: { overall: ${atsResult.overall}, contentLength: ${JSON.stringify(resume.json).length} }`);
      
      // Broadcast final score
      const finalScoreData = {
        final: true,
        overall: atsResult.overall,
        breakdown: atsResult.breakdown,
        suggestions: atsResult.suggestions
      };
      
      await broadcastToChannel(channel, finalScoreData);
      console.log(`🎯 Broadcasting final ATS score to ${channel}: { overall: ${atsResult.overall}, breakdown: true }`);
      
      res.json({
        success: true,
        channel,
        score: atsResult.overall,
        breakdown: atsResult.breakdown,
        suggestions: atsResult.suggestions
      });
    } catch (error) {
      console.error("ATS scoring error:", error);
      res.status(500).json({ error: "Failed to compute ATS score" });
    }
  });

  app.get("/api/ats/score/:resumeId/:jdId", async (req, res) => {
    try {
      const { resumeId, jdId } = req.params;
      const score = await storage.getATSScore(resumeId, jdId);
      
      if (!score) {
        return res.status(404).json({ error: "ATS score not found" });
      }
      
      res.json(score);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch ATS score" });
    }
  });

  // Cover letter generation endpoint
  app.post("/api/covers/generate", async (req, res) => {
    try {
      const { resumeId, jdId, tone = 'professional', length = 'medium' } = req.body;
      
      if (!resumeId || !jdId) {
        return res.status(400).json({ error: "resumeId and jdId are required" });
      }
      
      const [resume, jd] = await Promise.all([
        storage.getResume(resumeId),
        storage.getJobDescription(jdId)
      ]);
      
      if (!resume || !jd) {
        return res.status(404).json({ error: "Resume or job description not found" });
      }
      
      const coverLetter = await generateCoverLetter({
        resume: resume.json as ResumeJson,
        jd: {
          id: jd.id,
          title: jd.title,
          company: jd.company,
          rawText: jd.rawText
        },
        tone,
        wordCount: length === 'short' ? 250 : length === 'long' ? 450 : 350
      });
      
      // Save the generated cover letter
      const userId = req.headers['user-id'] as string || 'anonymous';
      const coverData = insertCoverLetterSchema.parse({
        userId,
        resumeId,
        jdId,
        contentMd: coverLetter,
        tone,
        version: 1
      });
      
      const savedCover = await storage.createCoverLetter(coverData);
      res.json(savedCover);
    } catch (error) {
      console.error("Cover letter generation error:", error);
      res.status(500).json({ error: "Failed to generate cover letter" });
    }
  });

  // Improve cover letter endpoint
  app.post("/api/covers/:id/improve", async (req, res) => {
    try {
      const cover = await storage.getCoverLetter(req.params.id);
      if (!cover) {
        return res.status(404).json({ error: "Cover letter not found" });
      }
      
      const jd = await storage.getJobDescription(cover.jdId);
      if (!jd) {
        return res.status(404).json({ error: "Associated job description not found" });
      }
      
      const { improved, suggestions } = await improveCoverLetter(
        cover.contentMd,
        jd.rawText
      );
      
      // Update the cover letter with improved content
      const updatedCover = await storage.updateCoverLetter(req.params.id, {
        content: improved,
        lastImproved: new Date().toISOString()
      });
      
      res.json({
        ...updatedCover,
        suggestions
      });
    } catch (error) {
      console.error("Cover letter improvement error:", error);
      res.status(500).json({ error: "Failed to improve cover letter" });
    }
  });

  app.post("/api/covers/batch", async (req, res) => {
    try {
      const { resumeId, jdIds, tone = "professional", wordCount = 250 } = req.body;
      const userId = req.headers['user-id'] as string || 'anonymous';
      
      if (!Array.isArray(jdIds) || jdIds.length === 0) {
        return res.status(400).json({ error: "jdIds array is required" });
      }
      
      // Create a job for batch processing
      const job = await storage.createJob({
        type: "batch_cover_letters",
        payload: { resumeId, jdIds, tone, wordCount, userId },
        status: "pending"
      });
      
      // Process in background
      processBatchCoverLetters(job.id);
      
      res.json({ jobId: job.id });
    } catch (error) {
      console.error("Batch cover letter error:", error);
      res.status(500).json({ error: "Failed to start batch cover letter generation" });
    }
  });

  app.get("/api/jobs/:id", async (req, res) => {
    try {
      const job = await storage.getJob(req.params.id);
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      res.json(job);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch job status" });
    }
  });

  // Cover letter list
  app.get("/api/covers", async (req, res) => {
    try {
      const userId = req.headers['user-id'] as string || 'anonymous';
      const letters = await storage.getCoverLettersByUser(userId);
      res.json(letters);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cover letters" });
    }
  });

  // Get individual cover letter
  app.get("/api/covers/:id", async (req, res) => {
    try {
      const coverLetter = await storage.getCoverLetter(req.params.id);
      if (!coverLetter) {
        return res.status(404).json({ error: "Cover letter not found" });
      }
      res.json(coverLetter);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch cover letter" });
    }
  });

  // Delete cover letter
  app.delete("/api/covers/:id", async (req, res) => {
    try {
      const coverLetter = await storage.getCoverLetter(req.params.id);
      if (!coverLetter) {
        return res.status(404).json({ error: "Cover letter not found" });
      }
      
      await storage.deleteCoverLetter(req.params.id);
      res.json({ success: true, message: "Cover letter deleted successfully" });
    } catch (error) {
      console.error("Cover letter deletion error:", error);
      res.status(500).json({ error: "Failed to delete cover letter" });
    }
  });

  // Delete all cover letters for user
  app.delete("/api/covers/bulk/all", async (req, res) => {
    try {
      const userId = req.headers['user-id'] as string || 'anonymous';
      const deletedCount = await storage.deleteAllCoverLetters(userId);
      res.json({ 
        success: true, 
        message: `Successfully deleted ${deletedCount} cover letters`,
        deletedCount 
      });
    } catch (error) {
      console.error("Bulk cover letter deletion error:", error);
      res.status(500).json({ error: "Failed to delete cover letters" });
    }
  });

  // Export routes
  app.post("/api/export/resume-pdf", async (req, res) => {
    try {
      const { resumeId } = req.body;
      const resume = await storage.getResume(resumeId);
      
      if (!resume) {
        return res.status(404).json({ error: "Resume not found" });
      }
      
      const pdfDoc = generateATSFriendlyPDF(resume.json as ResumeJson);
      
      res.json({
        filename: `${resume.title.replace(/\s+/g, '_')}.pdf`,
        document: pdfDoc
      });
    } catch (error) {
      console.error("PDF export error:", error);
      res.status(500).json({ error: "Failed to generate PDF" });
    }
  });

  app.post("/api/export/cover-pdf", async (req, res) => {
    try {
      console.log('📄 PDF Export Request:', req.body);
      const { coverId } = req.body;
      console.log('📄 Looking for cover letter ID:', coverId);
      
      const coverLetter = await storage.getCoverLetter(coverId);
      console.log('📄 Found cover letter:', coverLetter ? 'YES' : 'NO');
      
      if (!coverLetter) {
        console.log('❌ Cover letter not found for ID:', coverId);
        return res.status(404).json({ error: "Cover letter not found" });
      }
      
      const [jd] = await Promise.all([
        storage.getJobDescription(coverLetter.jdId)
      ]);
      console.log('📄 Found job description:', jd ? 'YES' : 'NO');

      console.log('📄 Cover letter content length:', coverLetter.contentMd?.length || 0);
      console.log('📄 Cover letter content preview:', coverLetter.contentMd?.substring(0, 100) || 'No content');

      // Generate PDF using PDFKit with dynamic import
      console.log('📄 Starting PDF generation...');
      const PDFKit = await import('pdfkit');
      const PDFDocument = PDFKit.default;
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 50, left: 50, right: 50 }
      });
      
      const chunks: Buffer[] = [];
      
      // Create a Promise to handle async PDF generation
      const pdfPromise = new Promise<string>((resolve, reject) => {
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => {
          try {
            const pdfBuffer = Buffer.concat(chunks);
            const base64PDF = pdfBuffer.toString('base64');
            resolve(base64PDF);
          } catch (err) {
            reject(err);
          }
        });
        doc.on('error', (err: Error) => {
          reject(err);
        });

        // Add date header (right aligned)
        doc.fontSize(11);
        doc.text(new Date().toLocaleDateString(), 50, 50, { align: 'right' });
        doc.moveDown(2);

        // Add recipient information if available
        if (jd?.company) {
          doc.text('Hiring Manager', 50, doc.y);
          doc.text(jd.company, 50, doc.y);
          doc.moveDown(2);
        }

        // Add cover letter content
        const content = coverLetter.contentMd || '';
        console.log('Cover letter content length:', content.length);
        
        if (content.trim()) {
          // Split content into paragraphs
          const paragraphs = content.split('\n\n').filter(p => p.trim());
          console.log('Number of paragraphs:', paragraphs.length);

          if (paragraphs.length === 0 && content.trim()) {
            // If no double newlines, split by single newlines or treat as one block
            const lines = content.split('\n').filter(l => l.trim());
            if (lines.length > 1) {
              paragraphs.push(...lines);
            } else {
              paragraphs.push(content.trim());
            }
          }

          // Add each paragraph with proper spacing
          paragraphs.forEach((paragraph, index) => {
            const cleanParagraph = paragraph.trim();
            if (cleanParagraph) {
              // Check if we need a new page
              if (doc.y > 700) {
                doc.addPage();
              }
              
              doc.text(cleanParagraph, 50, doc.y, {
                width: 500,
                align: 'left',
                lineGap: 3
              });
              
              // Add spacing between paragraphs
              if (index < paragraphs.length - 1) {
                doc.moveDown(1.5);
              }
            }
          });
        } else {
          // Add a message if no content
          doc.text('No cover letter content available.', 50, doc.y);
        }

        doc.end();
      });

      const base64PDF = await pdfPromise;
      
      res.json({
        filename: `Cover_Letter_${jd?.company || 'Position'}.pdf`,
        document: base64PDF
      });    } catch (error) {
      console.error("Cover letter PDF export error:", error);
      res.status(500).json({ error: "Failed to generate cover letter PDF" });
    }
  });

  // Background job processor for batch cover letters
  async function processBatchCoverLetters(jobId: string) {
    try {
      const job = await storage.getJob(jobId);
      if (!job) return;
      
      await storage.updateJobStatus(jobId, "running");
      
      const { resumeId, jdIds, tone, wordCount, userId } = job.payload;
      const [resume, ...jds] = await Promise.all([
        storage.getResume(resumeId),
        ...jdIds.map((id: string) => storage.getJobDescription(id))
      ]);
      
      if (!resume) {
        await storage.updateJobStatus(jobId, "error", { error: "Resume not found" });
        return;
      }
      
      const results = [];
      const channel = `batch:${jobId}`;
      
      for (let i = 0; i < jds.length; i++) {
        const jd = jds[i];
        if (!jd) continue;
        
        try {
          // Broadcast progress
          broadcastToChannel(channel, {
            progress: Math.round(((i) / jds.length) * 100),
            current: jd.title,
            status: "generating"
          });
          
          const content = await generateCoverLetter({
            resume: resume.json as ResumeJson,
            jd: {
              id: jd.id,
              title: jd.title,
              company: jd.company,
              rawText: jd.rawText
            },
            tone,
            wordCount
          });
          
          const coverLetter = await storage.createCoverLetter({
            userId,
            resumeId,
            jdId: jd.id,
            tone,
            contentMd: content,
            version: 1
          });
          
          results.push({
            jdId: jd.id,
            jdTitle: jd.title,
            coverId: coverLetter.id,
            success: true
          });
        } catch (error) {
          console.error(`Failed to generate cover letter for JD ${jd.id}:`, error);
          results.push({
            jdId: jd.id,
            jdTitle: jd.title,
            error: "Generation failed",
            success: false
          });
        }
        
        // Small delay to prevent rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Broadcast completion
      broadcastToChannel(channel, {
        progress: 100,
        status: "completed",
        results
      });
      
      await storage.updateJobStatus(jobId, "completed", { results });
    } catch (error) {
      console.error(`Batch job ${jobId} failed:`, error);
      await storage.updateJobStatus(jobId, "error", { error: error.message });
    }
  }

  return httpServer;
}

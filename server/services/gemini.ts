import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { generateMockCoverLetter } from "./mock-cover-letter-generator";

// Lazy initialization of Gemini AI to ensure env vars are loaded
let genAI: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "default_key";
    console.log('Initializing Gemini API with key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'Not found');
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

// Safety settings for Gemini
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_NONE,
  },
];

export async function generateCoverLetter({
  resume,
  jd,
  tone = "professional",
  wordCount = 250
}: {
  resume: any;
  jd: any;
  tone: string;
  wordCount: number;
}): Promise<string> {
  const systemPrompt = `You are an expert cover letter writer. Create tailored cover letters using only the provided resume JSON and job description. Never invent employers, titles, or metrics. If evidence is missing, propose conservative phrasing.

Rules:
- Use only information from the provided resume and job description
- Match tone: ${tone}
- Target length: ${wordCount} words
- Include 2-3 specific achievements from resume that align with JD requirements
- Naturally incorporate key skills and keywords from the JD
- End with enthusiasm and next steps`;

  const userPrompt = `Resume JSON: ${JSON.stringify(resume)}

Job Description: ${JSON.stringify(jd)}

Generate a ${tone} cover letter of approximately ${wordCount} words.`;

  try {
    // Check if Gemini API key is configured
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === "default_key" || apiKey === "your_gemini_api_key_here") {
      console.log("Gemini API key not configured, using mock cover letter generator");
      return generateMockCoverLetter({ 
        resume, 
        jobTitle: jd?.title || 'Software Engineer',
        company: jd?.company || 'Your Company',
        jobDescription: jd?.rawText || JSON.stringify(jd),
        tone: tone as 'professional' | 'friendly' | 'enthusiastic'
      });
    }

    // Use Gemini 1.5 Flash model for text generation
    const model = getGeminiClient().getGenerativeModel({ 
      model: "gemini-1.5-flash",
      safetySettings,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: Math.ceil(wordCount * 2), // Approximate token count
        topP: 0.8,
        topK: 40,
      }
    });

    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();
    
    return text || "";
  } catch (error: any) {
    console.error("Gemini API error:", error);
    
    // Use mock generator as fallback
    console.log("Falling back to mock cover letter generator");
    return generateMockCoverLetter({ 
      resume, 
      jobTitle: jd?.title || 'Software Engineer',
      company: jd?.company || 'Your Company',
      jobDescription: jd?.rawText || JSON.stringify(jd),
      tone: tone as 'professional' | 'friendly' | 'enthusiastic'
    });
  }
}

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Check if Gemini API key is configured
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === "default_key" || apiKey === "your_gemini_api_key_here") {
      console.log("Gemini API key not configured, returning mock embedding");
      // Return a mock embedding vector (768 dimensions like Gemini's text-embedding-004)
      return Array(768).fill(0).map(() => Math.random() * 2 - 1);
    }

    // Use Gemini's embedding model
    const model = getGeminiClient().getGenerativeModel({ model: "text-embedding-004" });
    
    const result = await model.embedContent(text);
    const embedding = result.embedding;
    
    return embedding.values;
  } catch (error) {
    console.error("Gemini embedding error:", error);
    // Return a mock embedding as fallback
    return Array(768).fill(0).map(() => Math.random() * 2 - 1);
  }
}

// Track quota usage to avoid hitting limits
let dailyRequestCount = 0;
let lastResetDate = new Date().toDateString();
const MAX_DAILY_REQUESTS = 45; // Leave some buffer for the 50 request limit

function checkQuotaLimit(): boolean {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    // Reset counter for new day
    dailyRequestCount = 0;
    lastResetDate = today;
  }
  
  if (dailyRequestCount >= MAX_DAILY_REQUESTS) {
    console.log(`Daily Gemini API quota limit reached (${dailyRequestCount}/${MAX_DAILY_REQUESTS})`);
    return false;
  }
  
  return true;
}

function incrementQuotaCount() {
  dailyRequestCount++;
}

export async function suggestResumeImprovements(resumeText: string, jdText: string): Promise<string[]> {
  const systemPrompt = `You are an ATS optimization expert. Analyze the resume against the job description and provide specific, actionable suggestions to improve ATS compatibility and relevance.

Focus on:
- Missing keywords that should be naturally incorporated
- Opportunities to quantify achievements
- Ways to better align experience with job requirements
- Formatting or structure improvements for ATS scanning

Respond with a JSON object containing a "suggestions" array of strings, each containing one specific suggestion. Format: {"suggestions": ["suggestion1", "suggestion2", ...]}`;

  const userPrompt = `Resume: ${resumeText}

Job Description: ${jdText}

Provide 3-5 specific suggestions for improvement in JSON format.`;

  try {
    // Check if Gemini API key is configured
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === "default_key" || apiKey === "your_gemini_api_key_here") {
      console.log("Gemini API key not configured, returning generic suggestions");
      return [
        "Add more quantifiable achievements with specific metrics",
        "Include keywords from the job description naturally throughout your resume",
        "Consider reformatting to ensure ATS compatibility",
        "Align your experience descriptions more closely with the job requirements"
      ];
    }

    // Check quota limit before making API call
    if (!checkQuotaLimit()) {
      console.log("Gemini API quota limit reached, using fallback suggestions");
      return [
        "Add more quantifiable achievements with specific metrics",
        "Include keywords from the job description naturally throughout your resume",
        "Consider reformatting to ensure ATS compatibility",
        "Align your experience descriptions more closely with the job requirements"
      ];
    }

    // Use Gemini 1.5 Flash model for analysis
    const model = getGeminiClient().getGenerativeModel({ 
      model: "gemini-1.5-flash",
      safetySettings,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1000,
        topP: 0.8,
        topK: 40,
      }
    });

    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
    incrementQuotaCount(); // Track API usage
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse the JSON response
    try {
      // Clean the response text to extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed.suggestions || ["Unable to generate specific suggestions"];
      }
    } catch (parseError) {
      console.error("Error parsing Gemini response:", parseError);
      console.log("Raw response:", text);
    }
    
    // Fallback: try to extract suggestions from plain text
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const suggestions = lines
      .filter(line => line.match(/^[-•*\d]/))
      .map(line => line.replace(/^[-•*\d]+\.?\s*/, '').trim())
      .filter(s => s.length > 0)
      .slice(0, 5);
    
    return suggestions.length > 0 ? suggestions : ["Unable to generate AI suggestions at this time"];
  } catch (error) {
    console.error("Gemini suggestions error:", error);
    return ["Unable to generate AI suggestions at this time"];
  }
}

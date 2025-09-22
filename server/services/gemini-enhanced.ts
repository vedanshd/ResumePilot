import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { generateMockCoverLetter } from "./mock-cover-letter-generator";

// Enhanced Gemini service with quota management and better error handling
let genAI: GoogleGenerativeAI | null = null;
let dailyRequestCount = 0;
let lastResetDate = new Date().toDateString();
const MAX_DAILY_REQUESTS = 45; // Buffer for 50 free tier limit

// Cache for embeddings to reduce API calls
const embeddingCache = new Map<string, number[]>();
const suggestionCache = new Map<string, string[]>();

function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('Gemini API key not configured');
    }
    console.log('🔧 Initializing Gemini client with key:', `${apiKey.substring(0, 10)}...`);
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

function checkQuotaLimit(): boolean {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    // Reset counter for new day
    dailyRequestCount = 0;
    lastResetDate = today;
    console.log('🔄 Daily quota reset');
  }
  
  if (dailyRequestCount >= MAX_DAILY_REQUESTS) {
    console.log(`⚠️ Daily Gemini API quota limit reached (${dailyRequestCount}/${MAX_DAILY_REQUESTS})`);
    return false;
  }
  
  return true;
}

function incrementQuotaCount(operation: string) {
  dailyRequestCount++;
  console.log(`📊 Gemini API usage: ${dailyRequestCount}/${MAX_DAILY_REQUESTS} (${operation})`);
}

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

export async function generateCoverLetterWithQuota({
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
  const cacheKey = `cover_${JSON.stringify({resume: resume.personalInfo?.email, jd: jd.id, tone, wordCount})}`;
  
  try {
    // Check API key
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === "default_key" || apiKey === "your_gemini_api_key_here") {
      console.log("🔧 No valid Gemini API key, using mock generator");
      return generateMockCoverLetter({ 
        resume, 
        jobTitle: jd?.title || 'Software Engineer',
        company: jd?.company || 'Your Company',
        jobDescription: jd?.rawText || JSON.stringify(jd),
        tone: tone as 'professional' | 'friendly' | 'enthusiastic'
      });
    }

    // Check quota
    if (!checkQuotaLimit()) {
      console.log("⚠️ Quota limit reached, using mock generator");
      return generateMockCoverLetter({ 
        resume, 
        jobTitle: jd?.title || 'Software Engineer',
        company: jd?.company || 'Your Company',
        jobDescription: jd?.rawText || JSON.stringify(jd),
        tone: tone as 'professional' | 'friendly' | 'enthusiastic'
      });
    }

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

    // Use Gemini 1.5 Flash model for text generation
    const model = getGeminiClient().getGenerativeModel({ 
      model: "gemini-1.5-flash",
      safetySettings,
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: Math.ceil(wordCount * 2),
        topP: 0.8,
        topK: 40,
      }
    });

    const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
    incrementQuotaCount('cover-letter');
    
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();
    
    return text || generateMockCoverLetter({ 
      resume, 
      jobTitle: jd?.title || 'Software Engineer',
      company: jd?.company || 'Your Company',
      jobDescription: jd?.rawText || JSON.stringify(jd),
      tone: tone as 'professional' | 'friendly' | 'enthusiastic'
    });
  } catch (error: any) {
    console.error("🚨 Gemini API error:", error.message?.substring(0, 100) || error);
    
    // Use mock generator as fallback
    console.log("🔄 Falling back to mock cover letter generator");
    return generateMockCoverLetter({ 
      resume, 
      jobTitle: jd?.title || 'Software Engineer',
      company: jd?.company || 'Your Company',
      jobDescription: jd?.rawText || JSON.stringify(jd),
      tone: tone as 'professional' | 'friendly' | 'enthusiastic'
    });
  }
}

export async function generateEmbeddingWithCache(text: string): Promise<number[]> {
  // Check cache first
  const cacheKey = text.substring(0, 100); // Use first 100 chars as cache key
  if (embeddingCache.has(cacheKey)) {
    console.log('📋 Using cached embedding');
    return embeddingCache.get(cacheKey)!;
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === "default_key" || apiKey === "your_gemini_api_key_here") {
      console.log("🔧 No valid Gemini API key, returning mock embedding");
      const mockEmbedding = Array(768).fill(0).map(() => Math.random() * 2 - 1);
      embeddingCache.set(cacheKey, mockEmbedding);
      return mockEmbedding;
    }

    if (!checkQuotaLimit()) {
      console.log("⚠️ Quota limit reached, using mock embedding");
      const mockEmbedding = Array(768).fill(0).map(() => Math.random() * 2 - 1);
      embeddingCache.set(cacheKey, mockEmbedding);
      return mockEmbedding;
    }

    const model = getGeminiClient().getGenerativeModel({ model: "text-embedding-004" });
    
    incrementQuotaCount('embedding');
    const result = await model.embedContent(text);
    const embedding = result.embedding;
    
    // Cache the result
    embeddingCache.set(cacheKey, embedding.values);
    
    return embedding.values;
  } catch (error: any) {
    console.error("🚨 Gemini embedding error:", error.message?.substring(0, 100) || error);
    
    // Return cached or mock embedding as fallback
    if (embeddingCache.has(cacheKey)) {
      return embeddingCache.get(cacheKey)!;
    }
    
    const mockEmbedding = Array(768).fill(0).map(() => Math.random() * 2 - 1);
    embeddingCache.set(cacheKey, mockEmbedding);
    return mockEmbedding;
  }
}

export async function suggestResumeImprovementsWithCache(resumeText: string, jdText: string): Promise<string[]> {
  const cacheKey = `${resumeText.substring(0, 50)}_${jdText.substring(0, 50)}`;
  
  // Check cache first
  if (suggestionCache.has(cacheKey)) {
    console.log('📋 Using cached suggestions');
    return suggestionCache.get(cacheKey)!;
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === "default_key" || apiKey === "your_gemini_api_key_here") {
      console.log("🔧 No valid Gemini API key, using generic suggestions");
      const fallbackSuggestions = [
        "Add more quantifiable achievements with specific metrics",
        "Include keywords from the job description naturally throughout your resume",
        "Consider reformatting to ensure ATS compatibility",
        "Align your experience descriptions more closely with the job requirements"
      ];
      suggestionCache.set(cacheKey, fallbackSuggestions);
      return fallbackSuggestions;
    }

    if (!checkQuotaLimit()) {
      console.log("⚠️ Quota limit reached, using generic suggestions");
      const fallbackSuggestions = [
        "Add more quantifiable achievements with specific metrics",
        "Include keywords from the job description naturally throughout your resume",
        "Consider reformatting to ensure ATS compatibility",
        "Align your experience descriptions more closely with the job requirements"
      ];
      suggestionCache.set(cacheKey, fallbackSuggestions);
      return fallbackSuggestions;
    }

    const systemPrompt = `You are an ATS optimization expert. Analyze the resume against the job description and provide specific, actionable suggestions.

Focus on:
- Missing keywords that should be naturally incorporated
- Opportunities to quantify achievements
- Ways to better align experience with job requirements
- Formatting or structure improvements for ATS scanning

Respond with a JSON object containing a "suggestions" array of strings. Format: {"suggestions": ["suggestion1", "suggestion2", ...]}`;

    const userPrompt = `Resume: ${resumeText}

Job Description: ${jdText}

Provide 3-5 specific suggestions for improvement in JSON format.`;

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
    incrementQuotaCount('suggestions');
    
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse the JSON response
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        const suggestions = parsed.suggestions || ["Unable to generate specific suggestions"];
        suggestionCache.set(cacheKey, suggestions);
        return suggestions;
      }
    } catch (parseError) {
      console.error("🚨 Error parsing Gemini response:", parseError);
    }
    
    // Fallback: try to extract suggestions from plain text
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const suggestions = lines
      .filter(line => line.match(/^[-•*\d]/))
      .map(line => line.replace(/^[-•*\d]+\.?\s*/, '').trim())
      .filter(s => s.length > 0)
      .slice(0, 5);
    
    const finalSuggestions = suggestions.length > 0 ? suggestions : ["Unable to generate AI suggestions at this time"];
    suggestionCache.set(cacheKey, finalSuggestions);
    return finalSuggestions;
    
  } catch (error: any) {
    console.error("🚨 Gemini suggestions error:", error.message?.substring(0, 100) || error);
    
    // Return cached or fallback suggestions
    if (suggestionCache.has(cacheKey)) {
      return suggestionCache.get(cacheKey)!;
    }
    
    const fallbackSuggestions = ["Unable to generate AI suggestions at this time"];
    suggestionCache.set(cacheKey, fallbackSuggestions);
    return fallbackSuggestions;
  }
}

// Export both cached and original functions
export { 
  generateCoverLetterWithQuota as generateCoverLetter,
  generateEmbeddingWithCache as generateEmbedding,
  suggestResumeImprovementsWithCache as suggestResumeImprovements
};

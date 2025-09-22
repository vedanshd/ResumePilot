import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { ResumeJson } from "@shared/schema";

// Lazy initialization of Gemini AI client
let genAI: GoogleGenerativeAI | null = null;

// Quota management for free tier
let dailyRequestCount = 0;
let lastResetDate = new Date().toDateString();
const MAX_DAILY_REQUESTS = 45; // Leave buffer for 50 request limit

function checkQuotaLimit(): boolean {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    dailyRequestCount = 0;
    lastResetDate = today;
  }
  return dailyRequestCount < MAX_DAILY_REQUESTS;
}

function incrementQuotaCount() {
  dailyRequestCount++;
  console.log(`Gemini API usage: ${dailyRequestCount}/${MAX_DAILY_REQUESTS} (ATS scoring)`);
}

function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === '' || apiKey === 'your_gemini_api_key_here') {
      throw new Error('Gemini API key not configured');
    }
    console.log('🤖 Initializing Gemini ATS Scorer with key:', `${apiKey.substring(0, 10)}...`);
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

interface ATSBreakdown {
  keywords: { score: number; matched: number; total: number; missing: string[] };
  relevancy: { score: number; total: number };
  quantification: { score: number; total: number; quantifiedBullets: number; totalBullets: number };
  formatting: { score: number; total: number };
  readability: { score: number; total: number; gradeLevel: number };
}

interface ATSResult {
  overall: number;
  breakdown: ATSBreakdown;
  suggestions: string[];
}

function convertResumeToText(resume: ResumeJson): string {
  const parts = [];
  
  // Personal Info
  if (resume.personalInfo) {
    parts.push(`Name: ${resume.personalInfo.name || 'N/A'}`);
    parts.push(`Email: ${resume.personalInfo.email || 'N/A'}`);
    parts.push(`Phone: ${resume.personalInfo.phone || 'N/A'}`);
    parts.push(`Location: ${resume.personalInfo.location || 'N/A'}`);
    if (resume.personalInfo.linkedin) parts.push(`LinkedIn: ${resume.personalInfo.linkedin}`);
    if (resume.personalInfo.github) parts.push(`GitHub: ${resume.personalInfo.github}`);
  }
  
  // Summary
  if (resume.summary) {
    parts.push(`\nPROFESSIONAL SUMMARY:\n${resume.summary}`);
  }
  
  // Experience
  if (resume.experience && resume.experience.length > 0) {
    parts.push(`\nWORK EXPERIENCE:`);
    resume.experience.forEach(exp => {
      parts.push(`\n${exp.title || 'N/A'} at ${exp.company || 'N/A'}`);
      parts.push(`${exp.startDate || 'N/A'} - ${exp.endDate || 'N/A'}`);
      if (exp.bullets && exp.bullets.length > 0) {
        exp.bullets.forEach(bullet => {
          parts.push(`• ${bullet}`);
        });
      }
    });
  }
  
  // Skills
  if (resume.skills) {
    parts.push(`\nSKILLS:`);
    Object.entries(resume.skills).forEach(([category, skills]) => {
      if (Array.isArray(skills) && skills.length > 0) {
        parts.push(`${category}: ${skills.join(', ')}`);
      }
    });
  }
  
  // Education
  if (resume.education && resume.education.length > 0) {
    parts.push(`\nEDUCATION:`);
    resume.education.forEach(edu => {
      parts.push(`${edu.degree || 'N/A'} - ${edu.school || 'N/A'}`);
      if (edu.graduation) parts.push(`Graduation: ${edu.graduation}`);
      if (edu.gpa) parts.push(`GPA: ${edu.gpa}`);
    });
  }
  
  return parts.join('\n');
}

export async function computeGeminiATSScore(resume: ResumeJson, jdText: string): Promise<ATSResult> {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === '' || apiKey === 'your_gemini_api_key_here' || apiKey === 'default_key') {
      console.log('❌ Gemini API key not configured for ATS scoring, using fallback');
      return getFallbackATSScore(resume, jdText);
    }

    // Check quota limit before making API call
    if (!checkQuotaLimit()) {
      console.log('❌ Gemini API quota limit reached for ATS scoring, using fallback');
      return getFallbackATSScore(resume, jdText);
    }

    const resumeText = convertResumeToText(resume);
    
    const prompt = `You are an expert ATS (Applicant Tracking System) analyzer and recruiter. Analyze how well this resume matches the job description and provide a detailed scoring breakdown.

RESUME:
${resumeText}

JOB DESCRIPTION:
${jdText}

Please analyze the resume against the job description and provide scores for each category. Be strict but fair in your assessment.

Respond with a JSON object containing:
{
  "keywords": {
    "score": <number 0-40>,
    "matched": <number of matched keywords>,
    "total": <total important keywords in JD>,
    "missing": [<array of 3-5 most important missing keywords>]
  },
  "relevancy": {
    "score": <number 0-25>,
    "total": 25
  },
  "quantification": {
    "score": <number 0-15>,
    "total": 15,
    "quantifiedBullets": <number of bullets with metrics>,
    "totalBullets": <total bullet points>
  },
  "formatting": {
    "score": <number 0-10>,
    "total": 10
  },
  "readability": {
    "score": <number 0-10>,
    "total": 10,
    "gradeLevel": <estimated reading grade level>
  },
  "suggestions": [<array of 3-5 specific improvement suggestions>]
}

Scoring guidelines:
- Keywords (0-40): Count exact matches of important technical skills, tools, and requirements from the JD
- Relevancy (0-25): How well the experience and skills align with the job requirements
- Quantification (0-15): Percentage of bullet points that include specific metrics, numbers, or measurable achievements
- Formatting (0-10): Resume structure, completeness, and ATS-friendliness
- Readability (0-10): Clarity, conciseness, and professional language
- Suggestions: Specific, actionable recommendations for improvement

Be accurate and provide realistic scores based on actual content analysis.`;

    const model = getGeminiClient().getGenerativeModel({
      model: 'gemini-1.5-flash',
      safetySettings,
      generationConfig: {
        temperature: 0.1, // Lower temperature for more consistent scoring
        maxOutputTokens: 1000,
        topP: 0.8,
        topK: 40,
      }
    });

    console.log('🎯 Starting Gemini ATS analysis...');
    incrementQuotaCount(); // Track API usage
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('📊 Gemini ATS response received');
    
    // Parse JSON from response
    let analysis: any = {};
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('❌ Error parsing Gemini ATS response:', parseError);
      console.log('Raw response:', text);
      return getFallbackATSScore(resume, jdText);
    }
    
    // Validate and sanitize scores
    const breakdown: ATSBreakdown = {
      keywords: {
        score: Math.min(40, Math.max(0, analysis.keywords?.score || 0)),
        matched: Math.max(0, analysis.keywords?.matched || 0),
        total: Math.max(1, analysis.keywords?.total || 1),
        missing: Array.isArray(analysis.keywords?.missing) ? analysis.keywords.missing.slice(0, 5) : []
      },
      relevancy: {
        score: Math.min(25, Math.max(0, analysis.relevancy?.score || 0)),
        total: 25
      },
      quantification: {
        score: Math.min(15, Math.max(0, analysis.quantification?.score || 0)),
        total: 15,
        quantifiedBullets: Math.max(0, analysis.quantification?.quantifiedBullets || 0),
        totalBullets: Math.max(1, analysis.quantification?.totalBullets || 1)
      },
      formatting: {
        score: Math.min(10, Math.max(0, analysis.formatting?.score || 0)),
        total: 10
      },
      readability: {
        score: Math.min(10, Math.max(0, analysis.readability?.score || 0)),
        total: 10,
        gradeLevel: Math.max(1, analysis.readability?.gradeLevel || 10)
      }
    };
    
    const overall = breakdown.keywords.score + 
                   breakdown.relevancy.score + 
                   breakdown.quantification.score + 
                   breakdown.formatting.score + 
                   breakdown.readability.score;
    
    const suggestions = Array.isArray(analysis.suggestions) 
      ? analysis.suggestions.slice(0, 5) 
      : ["Resume analyzed successfully"];
    
    console.log(`✅ Gemini ATS Score: ${overall}/100`);
    
    return { overall, breakdown, suggestions };
    
  } catch (error) {
    console.error('❌ Error in Gemini ATS scoring:', error);
    return getFallbackATSScore(resume, jdText);
  }
}

// Fallback scoring when Gemini is not available
function getFallbackATSScore(resume: ResumeJson, jdText: string): ATSResult {
  console.log('🔄 Using fallback ATS scoring');
  
  // Simple keyword matching fallback
  const resumeText = convertResumeToText(resume).toLowerCase();
  const jdLower = jdText.toLowerCase();
  
  // Extract keywords from job description
  const jdWords = jdLower.match(/\b\w{3,}\b/g) || [];
  const uniqueWords = Array.from(new Set(jdWords));
  const commonKeywords = uniqueWords.filter(word => 
    !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'].includes(word) &&
    word.length > 3
  ).slice(0, 20);
  
  const matchedKeywords = commonKeywords.filter(keyword => resumeText.includes(keyword));
  const keywordScore = Math.round((matchedKeywords.length / Math.max(commonKeywords.length, 1)) * 40);
  
  // Count bullet points and quantified ones
  let totalBullets = 0;
  let quantifiedBullets = 0;
  
  resume.experience?.forEach(exp => {
    exp.bullets?.forEach(bullet => {
      totalBullets++;
      if (/\d+[%$]?|\$\d+|\d+\+?\s*(users?|customers?|projects?|team|people|million|thousand|k\b)/i.test(bullet)) {
        quantifiedBullets++;
      }
    });
  });
  
  const quantificationScore = totalBullets > 0 ? Math.round((quantifiedBullets / totalBullets) * 15) : 0;
  
  // Basic formatting check
  let formattingScore = 10;
  if (!resume.personalInfo?.name || !resume.personalInfo?.email) formattingScore -= 3;
  if (!resume.summary || resume.summary.length < 50) formattingScore -= 2;
  if (!resume.experience || resume.experience.length === 0) formattingScore -= 3;
  if (!resume.skills) formattingScore -= 2;
  
  const breakdown: ATSBreakdown = {
    keywords: {
      score: keywordScore,
      matched: matchedKeywords.length,
      total: commonKeywords.length,
      missing: commonKeywords.filter(kw => !matchedKeywords.includes(kw)).slice(0, 5)
    },
    relevancy: { score: Math.min(25, keywordScore + 5), total: 25 },
    quantification: {
      score: quantificationScore,
      total: 15,
      quantifiedBullets,
      totalBullets
    },
    formatting: { score: Math.max(0, formattingScore), total: 10 },
    readability: { score: 8, total: 10, gradeLevel: 10 }
  };
  
  const overall = breakdown.keywords.score + 
                 breakdown.relevancy.score + 
                 breakdown.quantification.score + 
                 breakdown.formatting.score + 
                 breakdown.readability.score;
  
  const suggestions = [
    "Add more relevant keywords from the job description",
    "Include specific metrics and numbers in experience bullets",
    "Ensure all required sections are complete and well-formatted",
    "Tailor your experience descriptions to match job requirements"
  ];
  
  return { overall, breakdown, suggestions };
}
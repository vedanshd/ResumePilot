import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { ResumeJson } from '../types';
import { generateMockCoverLetter } from './mock-cover-letter-generator';

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
  console.log(`Gemini API usage: ${dailyRequestCount}/${MAX_DAILY_REQUESTS}`);
}

function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === '' || apiKey === 'your_gemini_api_key_here') {
      throw new Error('Gemini API key not configured');
    }
    console.log('Initializing Gemini client with key:', `${apiKey.substring(0, 10)}...`);
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

interface CoverLetterOptions {
  resumeData: ResumeJson;
  jobDescription: string;
  jobTitle: string;
  company: string;
  tone?: 'professional' | 'friendly' | 'enthusiastic';
  length?: 'short' | 'medium' | 'long';
}

interface JobAnalysis {
  keyRequirements: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
  companyValues: string[];
  matchScore: number;
  suggestions: string[];
}

/**
 * Analyze job description using OpenAI
 */
export async function analyzeJobDescription(jobDescription: string): Promise<JobAnalysis> {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === '' || apiKey === 'your_gemini_api_key_here') {
      // Return mock analysis if no API key
      console.log('Gemini API key not configured for job analysis, using mock');
      return getMockJobAnalysis(jobDescription);
    }

    const prompt = `You are an expert recruiter and job description analyst. Extract key information from job descriptions in a structured format.

Analyze this job description and extract:
1. Key requirements (5-7 items)
2. Required technical skills
3. Preferred/nice-to-have skills
4. Main responsibilities
5. Company values/culture indicators

Job Description:
${jobDescription}

Respond in JSON format with keys: keyRequirements, requiredSkills, preferredSkills, responsibilities, companyValues`;

    const model = getGeminiClient().getGenerativeModel({
      model: 'gemini-1.5-flash',
      safetySettings,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1000,
        topP: 0.8,
        topK: 40,
      }
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Parse JSON from response
    let analysis = {};
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      return getMockJobAnalysis(jobDescription);
    }
    
    // Calculate match score based on the analysis (this would be more sophisticated in production)
    const matchScore = Math.floor(Math.random() * 30) + 70; // 70-100 for demo
    
    return {
      ...analysis,
      matchScore,
      suggestions: generateSuggestions(analysis),
    };
  } catch (error) {
    console.error('Error analyzing job description:', error);
    return getMockJobAnalysis(jobDescription);
  }
}

/**
 * Generate personalized cover letter using Gemini (with intelligent fallbacks)
 */
export async function generateCoverLetter(options: CoverLetterOptions | any): Promise<string> {
  // Handle both interfaces - from routes.ts and internal
  const resumeData = options.resumeData || options.resume;
  const jobDescription = options.jobDescription || (typeof options.jd === 'string' ? options.jd : options.jd?.rawText);
  const jobTitle = options.jobTitle || options.jd?.title || 'the position';
  const company = '[Company Name]'; // Always use placeholder for company
  const tone = options.tone || 'professional';
  const length = options.length || 'medium';
  const wordCount = options.wordCount || (length === 'short' ? 250 : length === 'long' ? 450 : 350);

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === '' || apiKey === 'your_gemini_api_key_here' || apiKey === 'default_key') {
      // Return mock cover letter if no API key
      console.log('Using mock cover letter generator - no valid Gemini API key');
      return generateMockCoverLetter({
        resume: resumeData,
        jobTitle: jobTitle,
        company: '[Company Name]',
        jobDescription: jobDescription,
        tone: tone
      });
    }

    // Check quota limit before making API call
    if (!checkQuotaLimit()) {
      console.log('Gemini API quota limit reached for cover letter, using mock generator');
      return generateMockCoverLetter({
        resume: resumeData,
        jobTitle: jobTitle,
        company: '[Company Name]',
        jobDescription: jobDescription,
        tone: tone
      });
    }

    const lengthGuide = {
      short: '250-300 words',
      medium: '350-400 words',
      long: '450-500 words',
    };

    const toneGuide = {
      professional: 'formal and business-appropriate',
      friendly: 'warm and personable while maintaining professionalism',
      enthusiastic: 'energetic and passionate about the opportunity',
    };

    const prompt = `You are an expert career coach and professional writer specializing in creating compelling, ATS-optimized cover letters that get candidates interviewed.

Create a compelling cover letter for this position:

Job Title: ${jobTitle}
Company: Use "[Company Name]" as placeholder
Tone: ${toneGuide[tone] || 'professional'}
Length: ${lengthGuide[length] || '350-400 words'}

My Background:
- Name: ${resumeData.personalInfo?.name || '[Your Name]'}
- Email: ${resumeData.personalInfo?.email || '[Your Email]'}
- Phone: ${resumeData.personalInfo?.phone || '[Your Phone]'}
- Location: ${resumeData.personalInfo?.location || '[Your Location]'}
- Summary: ${resumeData.summary || 'Experienced professional'}
- Key Experience: ${resumeData.experience?.slice(0, 2).map((exp: any) => `${exp.title} at ${exp.company}`).join(', ') || 'Previous experience'}
- Top Skills: ${Object.values(resumeData.skills || {}).flat().slice(0, 10).join(', ') || 'Professional skills'}

Job Description:
${jobDescription}

Requirements:
1. Start with proper header including name and contact information
2. Address specific requirements from the job description
3. Highlight relevant experience and achievements
4. Show enthusiasm for the role and company (use "[Company Name]" placeholder)
5. Include specific examples from the resume
6. End with a strong call to action
7. Use the ${tone} tone throughout
8. Keep it concise (${lengthGuide[length] || '350-400 words'})
9. Format as a professional business letter

Format the letter with proper business letter structure and include contact information at the top.`;

    const model = getGeminiClient().getGenerativeModel({
      model: 'gemini-1.5-flash',
      safetySettings,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1500,
        topP: 0.9,
        topK: 40,
      }
    });

    incrementQuotaCount(); // Track API usage
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text || generateMockCoverLetter({
      resume: resumeData,
      jobTitle: jobTitle,
      company: '[Company Name]',
      jobDescription: jobDescription,
      tone: tone
    });
  } catch (error) {
    console.error('Error generating cover letter, using mock:', error);
    return generateMockCoverLetter({
      resume: resumeData,
      jobTitle: jobTitle,
      company: '[Company Name]',
      jobDescription: jobDescription,
      tone: tone
    });
  }
}

/**
 * Generate improvement suggestions for cover letter
 */
export async function improveCoverLetter(
  coverLetter: string,
  jobDescription: string
): Promise<{ improved: string; suggestions: string[] }> {
  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === '' || apiKey === 'your_gemini_api_key_here') {
      console.log('Gemini API key not configured for cover letter improvement, using mock');
      return {
        improved: coverLetter,
        suggestions: [
          'Add more specific examples from your experience',
          'Include keywords from the job description',
          'Strengthen the opening paragraph',
          'Add a compelling closing statement',
        ],
      };
    }

    const prompt = `You are an expert at improving cover letters to better match job descriptions and increase interview chances.

Improve this cover letter to better match the job description:

Cover Letter:
${coverLetter}

Job Description:
${jobDescription}

Provide an improved version and list 3-5 specific suggestions.
Format the response with the improved cover letter first, then add "\n\nSuggestions:\n" followed by the numbered suggestions.`;

    const model = getGeminiClient().getGenerativeModel({
      model: 'gemini-1.5-flash',
      safetySettings,
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 1500,
        topP: 0.9,
        topK: 40,
      }
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text() || '';
    const [improved, ...suggestionLines] = text.split('\n\nSuggestions:\n');
    
    return {
      improved: improved || coverLetter,
      suggestions: suggestionLines[0]?.split('\n').filter(s => s.trim()) || [],
    };
  } catch (error) {
    console.error('Error improving cover letter:', error);
    return {
      improved: coverLetter,
      suggestions: ['Unable to generate suggestions at this time'],
    };
  }
}

// Helper functions

function generateSuggestions(analysis: any): string[] {
  const suggestions = [];
  
  if (analysis.requiredSkills?.length > 0) {
    suggestions.push(`Emphasize your experience with ${analysis.requiredSkills.slice(0, 3).join(', ')}`);
  }
  
  if (analysis.keyRequirements?.length > 0) {
    suggestions.push('Address each key requirement in your cover letter');
  }
  
  if (analysis.companyValues?.length > 0) {
    suggestions.push(`Align your values with company culture: ${analysis.companyValues[0]}`);
  }
  
  suggestions.push('Include quantifiable achievements that match the role');
  suggestions.push('Research the company and mention specific projects or initiatives');
  
  return suggestions.slice(0, 5);
}

function getMockJobAnalysis(jobDescription: string): JobAnalysis {
  return {
    keyRequirements: [
      '5+ years of software development experience',
      'Strong proficiency in React and Node.js',
      'Experience with cloud platforms (AWS/GCP)',
      'Excellent communication skills',
      'Team leadership experience',
    ],
    requiredSkills: [
      'JavaScript/TypeScript',
      'React',
      'Node.js',
      'REST APIs',
      'Git',
      'Agile/Scrum',
    ],
    preferredSkills: [
      'GraphQL',
      'Docker/Kubernetes',
      'CI/CD',
      'Python',
      'Machine Learning',
    ],
    responsibilities: [
      'Design and develop scalable web applications',
      'Lead technical discussions and code reviews',
      'Mentor junior developers',
      'Collaborate with product and design teams',
      'Optimize application performance',
    ],
    companyValues: [
      'Innovation and continuous learning',
      'Collaborative team environment',
      'Customer-focused mindset',
      'Work-life balance',
    ],
    matchScore: 85,
    suggestions: [
      'Highlight your React and Node.js experience prominently',
      'Include examples of team leadership and mentoring',
      'Mention specific cloud platform projects',
      'Emphasize your experience with scalable applications',
      'Show alignment with company values in your cover letter',
    ],
  };
}

function getMockCoverLetter(resumeData: ResumeJson, jobTitle: string, company: string): string {
  const name = resumeData.personalInfo?.name || 'John Doe';
  const email = resumeData.personalInfo?.email || 'john.doe@email.com';
  const phone = resumeData.personalInfo?.phone || '';
  const location = resumeData.personalInfo?.location || '';
  const currentRole = resumeData.experience?.[0]?.title || 'Software Engineer';
  const currentCompany = resumeData.experience?.[0]?.company || 'Tech Company';
  
  // Build contact info line
  const contactInfo = [email, phone, location].filter(Boolean).join(' | ');
  
  return `${name}
${contactInfo}

Dear Hiring Manager,

I am writing to express my strong interest in the ${jobTitle} position at ${company}. With my extensive experience as a ${currentRole} at ${currentCompany} and a proven track record of delivering innovative solutions, I am confident that I would be a valuable addition to your team.

In my current role, I have:
• Led the development of scalable web applications serving millions of users
• Implemented modern technologies including React, Node.js, and cloud platforms
• Mentored junior developers and conducted technical interviews
• Improved application performance by 40% through optimization techniques

What particularly excites me about ${company} is your commitment to innovation and creating products that make a real difference in people's lives. Your recent work in [specific project/area] aligns perfectly with my passion for building user-centric solutions that scale.

My technical expertise spans the full stack, with particular strength in:
${Object.entries(resumeData.skills || {}).slice(0, 3).map(([category, skills]) => 
  `• ${category}: ${(skills as string[]).slice(0, 4).join(', ')}`
).join('\n')}

Beyond technical skills, I bring strong leadership abilities, excellent communication skills, and a collaborative approach to problem-solving. I thrive in fast-paced environments and am passionate about staying current with emerging technologies.

I am eager to bring my expertise to ${company} and contribute to your continued success. I would welcome the opportunity to discuss how my background and skills align with your needs.

Thank you for considering my application. I look forward to speaking with you about how I can contribute to your team.

Sincerely,

${name}
${contactInfo}`;
}

export default {
  analyzeJobDescription,
  generateCoverLetter,
  improveCoverLetter,
};

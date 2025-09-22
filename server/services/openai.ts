import OpenAI from "openai";
import { generateMockCoverLetter } from "./mock-cover-letter-generator";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || "default_key"
});

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
    // Check if OpenAI API key is configured
    const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
    if (!apiKey || apiKey === "default_key" || apiKey === "your_openai_api_key_here") {
      console.log("OpenAI API key not configured, using mock cover letter generator");
      return generateMockCoverLetter({ 
        resume, 
        jobTitle: jd?.title || 'Software Engineer',
        company: jd?.company || 'Your Company',
        jobDescription: jd?.rawText || JSON.stringify(jd),
        tone: tone as 'professional' | 'friendly' | 'enthusiastic'
      });
    }

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.4,
      max_tokens: Math.ceil(wordCount * 1.5)
    });

    return response.choices[0].message.content || "";
  } catch (error: any) {
    console.error("OpenAI API error:", error);
    
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
    const response = await openai.embeddings.create({
      model: "text-embedding-ada-002",
      input: text
    });

    return response.data[0].embedding;
  } catch (error) {
    console.error("OpenAI embedding error:", error);
    throw new Error("Failed to generate embedding");
  }
}

export async function suggestResumeImprovements(resumeText: string, jdText: string): Promise<string[]> {
  const systemPrompt = `You are an ATS optimization expert. Analyze the resume against the job description and provide specific, actionable suggestions to improve ATS compatibility and relevance.

Focus on:
- Missing keywords that should be naturally incorporated
- Opportunities to quantify achievements
- Ways to better align experience with job requirements
- Formatting or structure improvements for ATS scanning

Respond with JSON array of strings, each containing one specific suggestion.`;

  const userPrompt = `Resume: ${resumeText}

Job Description: ${jdText}

Provide 3-5 specific suggestions for improvement.`;

  try {
    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3
    });

    const result = JSON.parse(response.choices[0].message.content || '{"suggestions": []}');
    return result.suggestions || [];
  } catch (error) {
    console.error("OpenAI suggestions error:", error);
    return ["Unable to generate AI suggestions at this time"];
  }
}

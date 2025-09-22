import { mockResumeData } from "@/data/mock-resume";

interface ResumeGenerationOptions {
  jobDescription?: string;
  targetRole?: string;
  experience?: string;
  skills?: string[];
}

class OpenAIService {
  private apiKey: string | null = null;
  private baseURL = "https://api.openai.com/v1";

  setApiKey(key: string) {
    this.apiKey = key;
    localStorage.setItem("openai_api_key", key);
  }

  getApiKey(): string | null {
    if (!this.apiKey) {
      this.apiKey = localStorage.getItem("openai_api_key");
    }
    return this.apiKey;
  }

  async generateOptimizedResume(
    baseData: any,
    options: ResumeGenerationOptions = {}
  ): Promise<any> {
    const apiKey = this.getApiKey();
    
    // If no API key or API call fails, return mock data
    if (!apiKey) {
      console.log("No OpenAI API key found, using mock data");
      return this.enhanceWithMockData(baseData);
    }

    try {
      const prompt = this.buildResumePrompt(baseData, options);
      
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are an expert resume writer and ATS optimization specialist. Create professional, quantified, and ATS-friendly resume content."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const generatedContent = JSON.parse(data.choices[0].message.content);
      
      return this.mergeResumeData(baseData, generatedContent);
    } catch (error) {
      console.error("Error generating resume with OpenAI:", error);
      return this.enhanceWithMockData(baseData);
    }
  }

  private buildResumePrompt(baseData: any, options: ResumeGenerationOptions): string {
    let prompt = `Generate an optimized resume based on the following information:

Personal Info:
- Name: ${baseData.personalInfo?.name || ""}
- Email: ${baseData.personalInfo?.email || ""}
- Phone: ${baseData.personalInfo?.phone || ""}
- Location: ${baseData.personalInfo?.location || ""}

Current Experience:
${JSON.stringify(baseData.experience || [], null, 2)}

Skills:
${JSON.stringify(baseData.skills || {}, null, 2)}

`;

    if (options.jobDescription) {
      prompt += `\nTarget Job Description:\n${options.jobDescription}\n`;
    }

    if (options.targetRole) {
      prompt += `\nTarget Role: ${options.targetRole}\n`;
    }

    prompt += `
Please generate an optimized resume in JSON format with the following structure:
{
  "summary": "A compelling professional summary (2-3 sentences)",
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "location": "Location",
      "startDate": "Start Date",
      "endDate": "End Date",
      "bullets": ["Quantified achievement 1", "Quantified achievement 2", ...]
    }
  ],
  "skills": {
    "programming": ["skill1", "skill2"],
    "frameworks": ["framework1", "framework2"],
    "tools": ["tool1", "tool2"],
    "other": ["skill1", "skill2"]
  },
  "optimizations": {
    "keywords": ["keyword1", "keyword2"],
    "improvements": ["suggestion1", "suggestion2"]
  }
}

Focus on:
1. Quantifying achievements with numbers, percentages, and metrics
2. Using strong action verbs
3. Including relevant keywords for ATS
4. Highlighting impact and results
5. Keeping bullets concise and impactful`;

    return prompt;
  }

  private enhanceWithMockData(baseData: any): any {
    // Merge user data with mock data, prioritizing user data
    return {
      ...mockResumeData,
      personalInfo: {
        ...mockResumeData.personalInfo,
        ...baseData.personalInfo
      },
      experience: baseData.experience?.length > 0 ? baseData.experience : mockResumeData.experience,
      skills: Object.keys(baseData.skills || {}).length > 0 ? baseData.skills : mockResumeData.skills,
      summary: baseData.summary || mockResumeData.summary,
      education: baseData.education || mockResumeData.education,
      projects: mockResumeData.projects,
      certifications: mockResumeData.certifications,
      achievements: mockResumeData.achievements
    };
  }

  private mergeResumeData(baseData: any, generatedData: any): any {
    return {
      personalInfo: baseData.personalInfo,
      summary: generatedData.summary || baseData.summary,
      experience: this.enhanceExperience(baseData.experience, generatedData.experience),
      skills: generatedData.skills || baseData.skills,
      education: baseData.education,
      projects: baseData.projects,
      certifications: baseData.certifications,
      achievements: baseData.achievements,
      optimizations: generatedData.optimizations
    };
  }

  private enhanceExperience(baseExperience: any[], generatedExperience: any[]): any[] {
    if (!baseExperience || baseExperience.length === 0) {
      return generatedExperience || [];
    }

    return baseExperience.map((exp, index) => {
      const generated = generatedExperience?.[index];
      if (!generated) return exp;

      return {
        ...exp,
        bullets: generated.bullets || exp.bullets
      };
    });
  }

  async improveResumeBullet(bullet: string, context: any = {}): Promise<string> {
    const apiKey = this.getApiKey();
    
    if (!apiKey) {
      // Return a mock improved version
      return this.mockImproveBullet(bullet);
    }

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are an expert resume writer. Improve resume bullets to be more impactful, quantified, and ATS-friendly."
            },
            {
              role: "user",
              content: `Improve this resume bullet point: "${bullet}"
              
              Make it:
              1. Start with a strong action verb
              2. Include quantified metrics where possible
              3. Show impact and results
              4. Be concise (under 2 lines)
              5. ATS-friendly with relevant keywords
              
              Context: ${JSON.stringify(context)}
              
              Return only the improved bullet point.`
            }
          ],
          temperature: 0.7,
          max_tokens: 100
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0].message.content.trim();
    } catch (error) {
      console.error("Error improving bullet with OpenAI:", error);
      return this.mockImproveBullet(bullet);
    }
  }

  private mockImproveBullet(bullet: string): string {
    // Simple mock improvement - add quantification if not present
    if (!/\d/.test(bullet)) {
      const improvements = [
        "Led initiative that improved efficiency by 25%",
        "Managed project with 10+ team members and $500K budget",
        "Increased performance metrics by 30% through optimization",
        "Reduced processing time by 40% using automated solutions",
        "Delivered 15+ features impacting 1000+ users"
      ];
      return improvements[Math.floor(Math.random() * improvements.length)];
    }
    return bullet;
  }
}

export const openAIService = new OpenAIService();

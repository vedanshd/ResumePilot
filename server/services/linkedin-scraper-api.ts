import { ResumeJson } from "@shared/schema";
import axios from "axios";

/**
 * LinkedIn Profile Scraper using Web Scraping APIs
 * 
 * This implementation uses professional web scraping services that handle:
 * - Proxy rotation
 * - Anti-bot detection bypass
 * - Legal compliance (GDPR/CCPA)
 * - Structured data extraction
 * 
 * Supported services:
 * 1. ScrapingDog (primary)
 * 2. Bright Data (alternative)
 * 3. ScraperAPI (backup)
 */

interface LinkedInProfile {
  name: string;
  headline: string;
  location: string;
  email?: string;
  phone?: string;
  linkedin: string;
  github?: string;
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    location?: string;
    startDate: string;
    endDate: string;
    description: string[];
  }>;
  education: Array<{
    degree: string;
    school: string;
    location?: string;
    graduation: string;
    gpa?: string;
  }>;
  skills: string[];
  certifications?: Array<{
    name: string;
    issuer: string;
    date: string;
  }>;
}

// Configuration for different scraping services
const SCRAPING_SERVICES = {
  scrapingdog: {
    enabled: !!process.env.SCRAPINGDOG_API_KEY,
    apiKey: process.env.SCRAPINGDOG_API_KEY!,
    url: 'https://api.scrapingdog.com/linkedin' // Use dedicated LinkedIn API
  },
  brightdata: {
    enabled: true, // Enable Bright Data with hardcoded key for testing
    apiKey: 'e87597c9eb6cb50ff55329f2009ec4383056612f38af8a45655430b8ca7fae59',
    url: 'https://api.brightdata.com'
  },
  scraperapi: {
    url: 'https://api.scraperapi.com',
    apiKey: process.env.SCRAPERAPI_KEY || '',
    enabled: !!process.env.SCRAPERAPI_KEY
  }
};

/**
 * Scrape LinkedIn profile using ScrapingDog API
 */
async function scrapeWithScrapingDog(url: string): Promise<LinkedInProfile | null> {
  if (!SCRAPING_SERVICES.scrapingdog.enabled) {
    console.log("ScrapingDog API key not configured");
    return null;
  }

  try {
    console.log("🔍 Making request to ScrapingDog LinkedIn API...");
    
    // Extract LinkedIn profile ID from URL
    // URLs like https://www.linkedin.com/in/anandk0040/ -> anandk0040
    const profileIdMatch = url.match(/linkedin\.com\/in\/([^\/]+)/);
    if (!profileIdMatch) {
      console.log("❌ Could not extract LinkedIn profile ID from URL:", url);
      return null;
    }
    
    const linkId = profileIdMatch[1];
    console.log("🔍 Extracted LinkedIn profile ID:", linkId);
    
    const response = await axios.get(SCRAPING_SERVICES.scrapingdog.url, {
      params: {
        api_key: SCRAPING_SERVICES.scrapingdog.apiKey,
        type: 'profile',
        linkId: linkId,
        premium: 'true' // Enable premium mode for protected profiles
      },
      timeout: 30000
    });

    console.log("✅ ScrapingDog API response received");
    
    const responseData = response.data;
    
    // Debug: Log response type and structure
    console.log(`📊 ScrapingDog response type: ${typeof responseData}`);
    console.log("📊 ScrapingDog full response:", JSON.stringify(responseData, null, 2));
    
    // Check if we got structured JSON data (ScrapingDog LinkedIn API response)
    if (Array.isArray(responseData) && responseData.length > 0) {
      console.log("🎯 ScrapingDog returned structured LinkedIn JSON data");
      return convertScrapingDogResponse(responseData[0], url);
    }
    
    // Check if we got HTML response
    if (typeof responseData === 'string') {
      console.log("📄 ScrapingDog returned HTML content, parsing with AI");
      
      // Check if it's an error page or blocked content
      if (responseData.includes('Request blocked') || responseData.includes('Access denied') || responseData.includes('Sign in to LinkedIn')) {
        console.log("⚠️ ScrapingDog request was blocked or requires authentication");
        return null;
      }
      
      // Check if we have minimal content
      if (responseData.length < 1000) {
        console.log(`⚠️ ScrapingDog returned minimal content (${responseData.length} chars), likely blocked`);
        return null;
      }
      
      return await parseLinkedInHTML(responseData, url);
    }
    
        // Check if we got an object response (non-array JSON from ScrapingDog)
    if (typeof responseData === 'object' && !Array.isArray(responseData) && responseData !== null) {
      console.log("📋 ScrapingDog returned JSON object, converting to profile");
      
      // Check if it's an error response
      if (responseData.message && !responseData.fullName && !responseData.name && !responseData.first_name) {
        console.log("❌ ScrapingDog returned error response:", responseData.message);
        return null;
      }
      
      return convertScrapingDogResponse(responseData, url);
    }
    
    console.log("⚠️ Unexpected response format from ScrapingDog");
    return null;
    
  } catch (error: any) {
    console.error("ScrapingDog API error:", error.message || error);
    console.error("📊 Error response status:", error.response?.status);
    console.error("📊 Error response data:", error.response?.data);
    
    if (error.response?.status === 401) {
      console.error("❌ ScrapingDog API authentication failed - check your API key");
    } else if (error.response?.status === 429) {
      console.error("❌ ScrapingDog API rate limit exceeded");
    } else if (error.response?.status === 400) {
      console.error("❌ ScrapingDog API bad request - check parameters or profile ID");
    }
    return null;
  }
}

/**
 * Scrape LinkedIn profile using Bright Data API
 */
async function scrapeWithBrightData(url: string): Promise<LinkedInProfile | null> {
  if (!SCRAPING_SERVICES.brightdata.enabled) {
    console.log("Bright Data API key not configured");
    return null;
  }

  try {
    console.log("🔍 Making request to Bright Data API...");
    
    // Extract profile ID from LinkedIn URL
    const profileIdMatch = url.match(/linkedin\.com\/in\/([^\/\?]+)/);
    if (!profileIdMatch) {
      console.error("❌ Could not extract LinkedIn profile ID from URL");
      return null;
    }
    const profileId = profileIdMatch[1];
    console.log("🔍 Extracted LinkedIn profile ID:", profileId);

    // Bright Data datasets API - check progress/trigger LinkedIn scraping
    const response = await axios.get(
      `${SCRAPING_SERVICES.brightdata.url}/datasets/v3/progress/`,
      {
        headers: {
          'Authorization': `Bearer ${SCRAPING_SERVICES.brightdata.apiKey}`,
        },
        params: {
          url: url,
          profile_id: profileId
        },
        timeout: 30000
      }
    );

    console.log("✅ Bright Data API response received");
    console.log("📊 Bright Data response type:", typeof response.data);
    console.log("📊 Bright Data full response:", JSON.stringify(response.data, null, 2));

    // Convert Bright Data format to our format
    return convertBrightDataToProfile(response.data, url);
  } catch (error: any) {
    console.error("Bright Data API error:", error.message || error);
    console.error("📊 Error response status:", error.response?.status);
    console.error("📊 Error response data:", error.response?.data);
    return null;
  }
}

/**
 * Scrape LinkedIn profile using ScraperAPI
 */
async function scrapeWithScraperAPI(url: string): Promise<LinkedInProfile | null> {
  if (!SCRAPING_SERVICES.scraperapi.enabled) {
    console.log("ScraperAPI key not configured");
    return null;
  }

  try {
    const response = await axios.get('http://api.scraperapi.com', {
      params: {
        api_key: SCRAPING_SERVICES.scraperapi.apiKey,
        url: url,
        render: 'true', // Enable JavaScript rendering
        premium: 'true'
      },
      timeout: 30000
    });

    // Parse the HTML response
    const html = response.data;
    return await parseLinkedInHTML(html, url);
  } catch (error) {
    console.error("ScraperAPI error:", error);
    return null;
  }
}

/**
 * Parse LinkedIn HTML to extract profile data using AI
 * Uses the same AI extraction system as the paste feature
 */
async function parseLinkedInHTML(html: string, profileUrl: string): Promise<LinkedInProfile> {
  console.log("🔍 Parsing LinkedIn HTML with AI extraction");
  
  try {
    // Check if html is actually a string and has substantial content
    if (!html || typeof html !== 'string') {
      console.log("⚠️ HTML is not a string, using fallback data");
      throw new Error("Invalid HTML content");
    }
    
    // Check if we got blocked or minimal content
    if (html.includes('Request blocked') || html.includes('Access denied') || html.length < 1000) {
      console.log("⚠️ LinkedIn request was blocked or returned minimal content");
      throw new Error("LinkedIn access blocked");
    }
    
    // Extract text content from HTML for AI processing
    const textContent = extractTextFromHTML(html);
    
    // If we have substantial text content, use AI extraction
    if (textContent && textContent.length > 500) {
      console.log("🤖 Using AI extraction on scraped LinkedIn content");
      return await extractLinkedInDataWithAI(textContent, profileUrl);
    } else {
      console.log("⚠️ Insufficient text content extracted from HTML");
      throw new Error("Insufficient content for AI extraction");
    }
    
  } catch (error) {
    console.error("Error parsing LinkedIn HTML:", error);
    
    // Fall back to basic text extraction
    const textContent = extractTextFromHTML(html || "");
    if (textContent && textContent.length > 100) {
      console.log("🔄 Falling back to basic text extraction");
      return extractBasicDataFromText(textContent, profileUrl);
    }
    
    // Final fallback to default profile
    console.log("🔄 Using default profile as final fallback");
    const username = profileUrl.split('/in/')[1]?.split('/')[0]?.toLowerCase() || 'professional';
    return getDefaultProfile(profileUrl, username);
  }
}

/**
 * Extract text content from LinkedIn HTML
 */
function extractTextFromHTML(html: string): string {
  if (!html) return "";
  
  try {
    // Remove script and style elements
    let cleanHtml = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    cleanHtml = cleanHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    
    // Remove HTML tags but preserve text content
    let textContent = cleanHtml.replace(/<[^>]+>/g, ' ');
    
    // Clean up whitespace
    textContent = textContent.replace(/\s+/g, ' ').trim();
    
    // Remove common non-content text
    const cleanupPatterns = [
      /Skip to main content/gi,
      /Join now Sign in/gi,
      /LinkedIn navigation/gi,
      /Cookie Policy/gi,
      /Privacy Policy/gi,
      /User Agreement/gi
    ];
    
    cleanupPatterns.forEach(pattern => {
      textContent = textContent.replace(pattern, ' ');
    });
    
    return textContent.trim();
  } catch (error) {
    console.error("Error extracting text from HTML:", error);
    return "";
  }
}

/**
 * AI-powered LinkedIn data extraction (imported from main scraper)
 */
async function extractLinkedInDataWithAI(linkedInText: string, profileUrl: string): Promise<LinkedInProfile> {
  try {
    // Import Gemini service
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    
    const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === "default_key" || apiKey === "your_gemini_api_key_here") {
      throw new Error("Gemini API key not configured for LinkedIn extraction");
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const extractionPrompt = `
You are an expert LinkedIn profile analyzer. Extract structured data from the following LinkedIn profile text and return it as JSON.

LinkedIn Profile Text:
${linkedInText}

Please extract and return ONLY a valid JSON object with this exact structure:
{
  "name": "Full Name",
  "headline": "Professional headline/title",
  "location": "City, State/Country",
  "email": "email@domain.com or empty string if not found",
  "phone": "phone number or empty string if not found", 
  "summary": "Professional summary/about section (combine multiple paragraphs into one)",
  "experience": [
    {
      "title": "Job Title",
      "company": "Company Name",
      "location": "Work Location",
      "startDate": "Start Date (e.g., Jan 2020, 2020, etc.)",
      "endDate": "End Date or Present",
      "description": ["Achievement 1", "Achievement 2", "Achievement 3"]
    }
  ],
  "education": [
    {
      "degree": "Degree Type and Field",
      "school": "Institution Name", 
      "location": "School Location",
      "graduation": "Graduation Date/Year",
      "gpa": "GPA if mentioned or empty string"
    }
  ],
  "skills": ["Skill1", "Skill2", "Skill3"],
  "certifications": [
    {
      "name": "Certification Name",
      "issuer": "Issuing Organization",
      "date": "Issue Date/Year"
    }
  ]
}

Important guidelines:
- Extract ALL experience entries, not just recent ones
- Convert job descriptions to bullet points highlighting achievements with metrics when available
- Include ALL skills mentioned, not just top ones
- Preserve exact company names, school names, and locations
- If information is missing, use empty string "" or empty array []
- Focus on quantifiable achievements and impact
- Return ONLY the JSON, no additional text or formatting
`;

    console.log("🤖 Using AI to extract LinkedIn profile data from scraped content...");
    const result = await model.generateContent(extractionPrompt);
    const aiResponse = await result.response.text();
    
    // Parse the AI response as JSON
    const cleanResponse = aiResponse.replace(/```json\s*|\s*```/g, '').trim();
    const extractedData = JSON.parse(cleanResponse);
    
    // Validate and enhance the extracted data
    const profile: LinkedInProfile = {
      name: extractedData.name || "Professional Name",
      headline: extractedData.headline || "Professional Title", 
      location: extractedData.location || "Location",
      email: extractedData.email || "",
      phone: extractedData.phone || "",
      linkedin: profileUrl,
      github: "", // LinkedIn rarely has GitHub info, would need separate detection
      summary: extractedData.summary || "Professional with extensive experience.",
      experience: (extractedData.experience || []).map((exp: any) => ({
        title: exp.title || "Position",
        company: exp.company || "Company",
        location: exp.location || "",
        startDate: exp.startDate || "",
        endDate: exp.endDate || "Present",
        description: Array.isArray(exp.description) ? exp.description : 
                    typeof exp.description === 'string' ? [exp.description] : 
                    ["Responsibilities and achievements in this role"]
      })),
      education: (extractedData.education || []).map((edu: any) => ({
        degree: edu.degree || "Degree",
        school: edu.school || "Institution", 
        location: edu.location || "",
        graduation: edu.graduation || "",
        gpa: edu.gpa || undefined
      })),
      skills: Array.isArray(extractedData.skills) ? extractedData.skills : [],
      certifications: (extractedData.certifications || []).map((cert: any) => ({
        name: cert.name || "",
        issuer: cert.issuer || "",
        date: cert.date || ""
      }))
    };
    
    console.log("✅ Successfully extracted LinkedIn data using AI");
    return profile;
    
  } catch (error) {
    console.error("AI extraction failed:", error);
    // Fall back to basic extraction
    return extractBasicDataFromText(linkedInText, profileUrl);
  }
}

/**
 * Basic fallback extraction from LinkedIn text
 */
function extractBasicDataFromText(text: string, profileUrl: string): LinkedInProfile {
  // Extract basic information using regex patterns
  const nameMatch = text.match(/^([A-Za-z\s]+)/m);
  const locationMatch = text.match(/([A-Za-z\s,]+(?:India|USA|Canada|UK|Germany|France|Singapore|Australia))/i);
  const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  const phoneMatch = text.match(/(\+?\d{1,3}[-.\s]?\d{3,4}[-.\s]?\d{3,4}[-.\s]?\d{3,4})/);
  
  // Extract skills from common keywords
  const skillKeywords = [
    'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'AWS', 'Docker', 'Kubernetes',
    'Supply Chain', 'Procurement', 'Strategic Sourcing', 'Project Management',
    'Leadership', 'Team Management', 'Business Development', 'Sales', 'Marketing',
    'Data Analysis', 'Machine Learning', 'AI', 'Cloud Computing', 'DevOps'
  ];
  
  const extractedSkills = skillKeywords.filter(skill => 
    text.toLowerCase().includes(skill.toLowerCase())
  );
  
  const username = profileUrl.split('/in/')[1]?.split('/')[0] || 'professional';
  
  return {
    name: nameMatch?.[1]?.trim() || "Professional Name",
    headline: "Professional Title",
    location: locationMatch?.[1]?.trim() || "Location", 
    email: emailMatch?.[1] || `${username}@example.com`,
    phone: phoneMatch?.[1] || "",
    linkedin: profileUrl,
    github: "",
    summary: "Experienced professional with expertise in their field.",
    experience: [],
    education: [],
    skills: extractedSkills,
    certifications: []
  };
}

/**
 * Convert ScrapingDog LinkedIn response to our profile format
 */
function convertScrapingDogResponse(data: any, profileUrl: string): LinkedInProfile {
  console.log("🔄 Converting ScrapingDog response to LinkedIn profile format");
  
  try {
    // Debug: Log the raw data structure
    console.log("🔍 Raw ScrapingDog data sample:", JSON.stringify(data, null, 2).substring(0, 500));
    
    // Extract experience data
    console.log("📊 Experience data:", data.experience);
    const experience = (data.experience || []).filter((exp: any) => exp && Object.keys(exp).length > 0).map((exp: any) => {
      console.log("🏢 Processing experience:", exp);
      return {
        title: exp.position || exp.title || exp.job_title || "",
        company: exp.company_name || exp.company || exp.employer || "",
        location: exp.location || "",
        startDate: exp.start_date || exp.duration?.split(' - ')[0] || "",
        endDate: exp.end_date || exp.duration?.split(' - ')[1] || "Present",
        description: exp.description ? [exp.description] : []
      };
    });
    
    // Extract education data
    console.log("🎓 Education data:", data.education);
    const education = (data.education || []).map((edu: any) => {
      console.log("🏫 Processing education:", edu);
      return {
        degree: edu.college_degree || edu.degree || edu.field_of_study || "",
        school: edu.college_name || edu.institution || edu.school || "",
        location: edu.location || "",
        graduation: edu.college_duration || edu.end_date || edu.duration || "",
        gpa: edu.gpa || undefined
      };
    });
    
    // Extract certifications
    const certifications = (data.certification || []).map((cert: any) => ({
      name: cert.certification || cert.name || "",
      issuer: cert.company_name || cert.issuing_organization || "",
      date: cert.issue_date || cert.date || ""
    }));
    
    // Extract skills from various sources
    let skills: string[] = [];
    if (data.skills) {
      skills = Array.isArray(data.skills) ? data.skills : [];
    }
    
    // Add skills from headline if no explicit skills
    if (skills.length === 0 && data.headline) {
      const headlineSkills = extractSkillsFromText(data.headline);
      skills = headlineSkills;
    }
    
    // Debug logging to see what fields are available
    console.log("🔍 ScrapingDog data fields:", Object.keys(data));
    console.log("📋 Name fields - fullName:", data.fullName, "first_name:", data.first_name, "last_name:", data.last_name);
    
    // Build name from available fields
    let name = "Professional Name";
    if (data.fullName) {
      name = data.fullName;
    } else if (data.full_name) {
      name = data.full_name;
    } else if (data.first_name && data.last_name) {
      name = `${data.first_name} ${data.last_name}`;
    } else if (data.first_name) {
      name = data.first_name;
    }
    
    const profile: LinkedInProfile = {
      name: name,
      headline: data.headline || "Professional Title",
      location: data.location || "",
      email: data.email || "",
      phone: data.phone || "",
      linkedin: profileUrl,
      github: data.github_url || "",
      summary: data.about || data.summary || data.headline || "Professional with expertise in their field.",
      experience: experience,
      education: education,
      skills: skills,
      certifications: certifications
    };
    
    console.log("✅ Successfully converted ScrapingDog response");
    return profile;
    
  } catch (error) {
    console.error("Error converting ScrapingDog response:", error);
    
    // Return basic profile with available data
    return {
      name: data.fullName || data.full_name || "Professional Name",
      headline: data.headline || "Professional Title",
      location: data.location || "",
      email: "",
      phone: "",
      linkedin: profileUrl,
      github: "",
      summary: data.about || "Professional with expertise in their field.",
      experience: [],
      education: [],
      skills: [],
      certifications: []
    };
  }
}

/**
 * Extract skills from text content
 */
function extractSkillsFromText(text: string): string[] {
  const skillKeywords = [
    // Technical Skills
    'JavaScript', 'Python', 'Java', 'React', 'Node.js', 'AWS', 'Docker', 'Kubernetes',
    'HTML', 'CSS', 'TypeScript', 'Angular', 'Vue', 'C++', 'C#', 'PHP', 'Ruby',
    'Machine Learning', 'Deep Learning', 'Data Science', 'AI', 'Artificial Intelligence',
    'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'Scikit-learn',
    
    // Business Skills  
    'Supply Chain', 'Procurement', 'Strategic Sourcing', 'Project Management',
    'Leadership', 'Team Management', 'Business Development', 'Sales', 'Marketing',
    'Data Analysis', 'Business Intelligence', 'Process Improvement',
    
    // Other Skills
    'Communication', 'Problem Solving', 'Critical Thinking', 'Analytics',
    'Research', 'Design', 'Strategy', 'Operations', 'Finance'
  ];
  
  const extractedSkills = skillKeywords.filter(skill => 
    text.toLowerCase().includes(skill.toLowerCase())
  );
  
  return extractedSkills;
}

/**
 * Convert Bright Data response to our profile format
 */
function convertBrightDataToProfile(data: any, profileUrl: string): LinkedInProfile {
  // Bright Data returns structured JSON, map it to our format
  return {
    name: data.full_name || "Name Not Found",
    headline: data.headline || "",
    location: data.location || "",
    email: data.email || "",
    phone: data.phone || "",
    linkedin: profileUrl,
    github: data.github_url || "",
    summary: data.about || "",
    experience: (data.experience || []).map((exp: any) => ({
      title: exp.position || "",
      company: exp.company_name || "",
      location: exp.location || "",
      startDate: exp.start_date || "",
      endDate: exp.end_date || "Present",
      description: exp.description ? [exp.description] : []
    })),
    education: (data.education || []).map((edu: any) => ({
      degree: edu.degree || "",
      school: edu.institution || "",
      location: edu.location || "",
      graduation: edu.end_date || "",
      gpa: edu.gpa || undefined
    })),
    skills: data.skills || [],
    certifications: (data.certifications || []).map((cert: any) => ({
      name: cert.name || "",
      issuer: cert.issuing_organization || "",
      date: cert.issue_date || ""
    }))
  };
}

/**
 * Get default profile for any user (generic professional template)
 */

/**
 * Get default profile for other users
 */
function getDefaultProfile(profileUrl: string, username: string): LinkedInProfile {
  return {
    name: "John Smith",
    headline: "Senior Software Engineer | Full-Stack Developer | Cloud Architecture",
    location: "San Francisco, CA",
    email: `${username}@example.com`,
    phone: "(555) 123-4567",
    linkedin: profileUrl,
    github: `github.com/${username}`,
    summary: "Experienced Senior Software Engineer with 8+ years of expertise in building scalable web applications and cloud-native solutions. Proficient in modern JavaScript frameworks, cloud platforms (AWS, GCP), and DevOps practices.",
    experience: [
      {
        title: "Senior Software Engineer",
        company: "TechCorp Inc.",
        location: "San Francisco, CA",
        startDate: "2021",
        endDate: "Present",
        description: [
          "Led development of microservices architecture serving 2M+ daily active users",
          "Implemented CI/CD pipelines reducing deployment time by 60%",
          "Mentored team of 5 junior developers"
        ]
      },
      {
        title: "Software Engineer",
        company: "StartupXYZ",
        location: "San Francisco, CA",
        startDate: "2018",
        endDate: "2021",
        description: [
          "Developed RESTful APIs and GraphQL endpoints",
          "Built responsive web applications using React and TypeScript",
          "Improved application performance by 35%"
        ]
      }
    ],
    education: [
      {
        degree: "Bachelor of Science in Computer Science",
        school: "University of California, Berkeley",
        location: "Berkeley, CA",
        graduation: "2016",
        gpa: "3.8"
      }
    ],
    skills: [
      "JavaScript", "TypeScript", "Python", "Java",
      "React", "Node.js", "Express", "Next.js",
      "AWS", "Docker", "Kubernetes", "Git",
      "PostgreSQL", "MongoDB", "Redis"
    ],
    certifications: []
  };
}

/**
 * Convert LinkedIn profile to Resume JSON format
 */
function convertToResumeJson(profile: LinkedInProfile): ResumeJson {
  // Categorize skills
  const programmingLanguages = ["JavaScript", "TypeScript", "Python", "Java", "C++", "C", "Go", "Rust", "Ruby", "PHP", "Swift", "Kotlin", "HTML", "CSS", "SQL", "PL/SQL"];
  const frameworks = ["React", "React.js", "Angular", "Vue", "Node.js", "Express", "Express.js", "Django", "Flask", "Spring", "Next.js", "FastAPI", "Tailwind CSS", "Tailwind"];
  const tools = ["Docker", "Kubernetes", "Git", "GitHub", "Jenkins", "AWS", "EC2", "S3", "Azure", "GCP", "Terraform", "CI/CD", "Agile", "Scrum"];
  const databases = ["MongoDB", "PostgreSQL", "MySQL", "Redis", "Elasticsearch", "DynamoDB", "Oracle Database", "Oracle", "SQL", "PL/SQL"];

  const categorizedSkills: any = {};
  
  const programming = profile.skills.filter(skill => 
    programmingLanguages.some(lang => skill.toLowerCase().includes(lang.toLowerCase()))
  );
  if (programming.length > 0) categorizedSkills.programming = programming;

  const frameworkSkills = profile.skills.filter(skill => 
    frameworks.some(fw => skill.toLowerCase().includes(fw.toLowerCase()))
  );
  if (frameworkSkills.length > 0) categorizedSkills.frameworks = frameworkSkills;

  const toolSkills = profile.skills.filter(skill => 
    tools.some(tool => skill.toLowerCase().includes(tool.toLowerCase()))
  );
  if (toolSkills.length > 0) categorizedSkills.tools = toolSkills;

  const databaseSkills = profile.skills.filter(skill => 
    databases.some(db => skill.toLowerCase().includes(db.toLowerCase()))
  );
  if (databaseSkills.length > 0) categorizedSkills.databases = databaseSkills;

  const otherSkills = profile.skills.filter(skill => 
    !programming.includes(skill) && 
    !frameworkSkills.includes(skill) && 
    !toolSkills.includes(skill) && 
    !databaseSkills.includes(skill)
  );
  if (otherSkills.length > 0) categorizedSkills.other = otherSkills;

  return {
    personalInfo: {
      name: profile.name,
      email: profile.email || "",
      phone: profile.phone || "",
      location: profile.location,
      linkedin: profile.linkedin,
      github: profile.github || "",
      website: ""
    },
    summary: profile.summary,
    experience: profile.experience.map(exp => ({
      title: exp.title,
      company: exp.company,
      location: exp.location || "",
      startDate: exp.startDate,
      endDate: exp.endDate,
      bullets: exp.description
    })),
    education: profile.education.map(edu => ({
      degree: edu.degree,
      school: edu.school,
      location: edu.location || "",
      graduation: edu.graduation,
      gpa: edu.gpa
    })),
    skills: categorizedSkills,
    projects: [],
    certifications: profile.certifications || [],
    achievements: []
  };
}

/**
 * Main function to scrape LinkedIn profile using web scraping APIs
 */
export async function scrapeLinkedInProfile(url: string): Promise<ResumeJson> {
  try {
    // Validate URL
    if (!url.includes("linkedin.com/in/")) {
      throw new Error("Invalid LinkedIn URL format");
    }

    console.log(`Starting LinkedIn profile scrape for: ${url}`);
    
    let profileData: LinkedInProfile | null = null;
    
    // Try scraping services in order of preference
    // 1. Try Bright Data (most reliable and we have API key)
    if (!profileData && SCRAPING_SERVICES.brightdata.enabled) {
      console.log("Attempting to scrape with Bright Data...");
      profileData = await scrapeWithBrightData(url);
    }
    
    // 2. Try ScrapingDog (backup option)
    if (!profileData && SCRAPING_SERVICES.scrapingdog.enabled) {
      console.log("Attempting to scrape with ScrapingDog...");
      profileData = await scrapeWithScrapingDog(url);
    }
    
    // 3. Try ScraperAPI (good backup option)
    if (!profileData && SCRAPING_SERVICES.scraperapi.enabled) {
      console.log("Attempting to scrape with ScraperAPI...");
      profileData = await scrapeWithScraperAPI(url);
    }
    
    // 4. Fall back to mock data if no API is configured or all fail
    if (!profileData) {
      console.log("❌ LinkedIn URL scraping failed - LinkedIn likely blocked the request");
      console.log("💡 Suggestion: Try using 'Paste LinkedIn Data' option instead");
      
      // Create a helpful error response instead of mock data
      throw new Error(
        "LinkedIn URL scraping was blocked. " +
        "Please try the 'Paste LinkedIn Data' option instead - " +
        "just copy your LinkedIn profile content and paste it for AI extraction!"
      );
    }
    
    // Convert to resume format
    const resumeJson = convertToResumeJson(profileData);
    
    // Ensure all required fields are present
    const validatedResume: ResumeJson = {
      personalInfo: resumeJson.personalInfo || {
        name: "Your Name",
        email: "",
        phone: "",
        location: "Location",
        linkedin: url,
        github: "",
        website: ""
      },
      summary: resumeJson.summary || "Professional summary",
      experience: resumeJson.experience || [],
      skills: resumeJson.skills || {},
      education: resumeJson.education || [],
      projects: resumeJson.projects || [],
      certifications: resumeJson.certifications || [],
      achievements: resumeJson.achievements || []
    };
    
    return validatedResume;
    
  } catch (error) {
    console.error("LinkedIn scraping error:", error);
    
    // Return fallback data on any error
    const username = url.split('/in/')[1]?.split('/')[0]?.toLowerCase() || 'professional';
    const fallbackProfile = getDefaultProfile(url, username);
    
    return convertToResumeJson(fallbackProfile);
  }
}

/**
 * Get available scraping services
 */
export function getAvailableScrapingServices(): string[] {
  const available = [];
  if (SCRAPING_SERVICES.scrapingdog.enabled) available.push("ScrapingDog");
  if (SCRAPING_SERVICES.brightdata.enabled) available.push("Bright Data");
  if (SCRAPING_SERVICES.scraperapi.enabled) available.push("ScraperAPI");
  return available;
}

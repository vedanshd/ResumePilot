import { ResumeJson } from "@shared/schema";

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

// Common tech keywords for fallback
const COMMON_KEYWORDS = [
  // Programming languages
  'javascript', 'python', 'java', 'typescript', 'c++', 'c#', 'php', 'ruby', 'go', 'rust',
  // Frameworks
  'react', 'angular', 'vue', 'node.js', 'express', 'django', 'flask', 'spring', 'laravel',
  // Databases
  'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch', 'sql', 'nosql',
  // Cloud & DevOps
  'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'terraform', 'ansible',
  // Tools & Methods
  'git', 'agile', 'scrum', 'rest', 'api', 'microservices', 'ci/cd', 'testing'
];

function extractKeywords(text: string | undefined | null): Set<string> {
  if (!text || typeof text !== 'string') {
    return new Set<string>();
  }
  
  const words = text.toLowerCase()
    .replace(/[^\w\s\-\.]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);
  
  const keywords = new Set<string>();
  
  // Add individual words
  words.forEach(word => keywords.add(word));
  
  // Add common technical phrases
  const phrases = [
    'machine learning', 'data science', 'full stack', 'software engineering',
    'web development', 'mobile development', 'cloud computing', 'data analysis',
    'project management', 'quality assurance', 'user experience', 'database design'
  ];
  
  phrases.forEach(phrase => {
    if (text.toLowerCase().includes(phrase)) {
      keywords.add(phrase.replace(/\s+/g, ''));
    }
  });
  
  return keywords;
}

function calculateKeywordScore(resumeText: string | undefined | null, jdText: string | undefined | null): {
  score: number;
  matched: number;
  total: number;
  missing: string[];
} {
  const jdKeywords = extractKeywords(jdText);
  const resumeKeywords = extractKeywords(resumeText);
  
  // Filter to important keywords (length > 3 or in common list)
  const importantJDKeywords = Array.from(jdKeywords).filter(keyword => 
    keyword.length > 3 || COMMON_KEYWORDS.includes(keyword)
  );
  
  const matchedCount = importantJDKeywords.filter(keyword => 
    resumeKeywords.has(keyword)
  ).length;
  
  const missing = importantJDKeywords.filter(keyword => 
    !resumeKeywords.has(keyword)
  ).slice(0, 10); // Limit missing keywords
  
  const total = importantJDKeywords.length;
  const score = total > 0 ? Math.round((matchedCount / total) * 40) : 0;
  
  return { score, matched: matchedCount, total, missing };
}

function calculateQuantificationScore(resume: ResumeJson): {
  score: number;
  total: number;
  quantifiedBullets: number;
  totalBullets: number;
} {
  let totalBullets = 0;
  let quantifiedBullets = 0;
  
  // Check experience bullets
  resume.experience.forEach(exp => {
    exp.bullets.forEach(bullet => {
      totalBullets++;
      // Look for numbers, percentages, dollars, or specific metrics
      if (/\d+[%$]?|\$\d+|\d+\+?\s*(users?|customers?|projects?|team|people|million|thousand|k\b)/i.test(bullet)) {
        quantifiedBullets++;
      }
    });
  });
  
  const percentage = totalBullets > 0 ? quantifiedBullets / totalBullets : 0;
  const score = Math.round(percentage * 15);
  
  return { score, total: 15, quantifiedBullets, totalBullets };
}

function calculateFormattingScore(resume: ResumeJson): { score: number; total: number } {
  let score = 10; // Start with perfect score
  
  // Check for required sections
  if (!resume.personalInfo.name || !resume.personalInfo.email) score -= 2;
  if (!resume.summary || resume.summary.length < 50) score -= 1;
  if (resume.experience.length === 0) score -= 3;
  if (!resume.skills) score -= 2;
  
  // Check bullet points format
  resume.experience.forEach(exp => {
    exp.bullets.forEach(bullet => {
      if (bullet.length < 20 || bullet.length > 150) score -= 0.5;
    });
  });
  
  return { score: Math.max(0, Math.round(score)), total: 10 };
}

function calculateReadabilityScore(text: string): { score: number; total: number; gradeLevel: number } {
  // Simple readability calculation based on sentence and word length
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = text.split(/\s+/).filter(w => w.length > 0);
  const syllables = words.reduce((count, word) => {
    return count + Math.max(1, word.replace(/[^aeiouAEIOU]/g, '').length);
  }, 0);
  
  if (sentences.length === 0 || words.length === 0) {
    return { score: 5, total: 10, gradeLevel: 12 };
  }
  
  const avgSentenceLength = words.length / sentences.length;
  const avgSyllablesPerWord = syllables / words.length;
  
  // Simplified Flesch-Kincaid grade level
  const gradeLevel = 0.39 * avgSentenceLength + 11.8 * avgSyllablesPerWord - 15.59;
  
  // Score based on grade level (8-12 is ideal for professional documents)
  let readabilityScore;
  if (gradeLevel >= 8 && gradeLevel <= 12) {
    readabilityScore = 10;
  } else if (gradeLevel >= 6 && gradeLevel <= 14) {
    readabilityScore = 7;
  } else {
    readabilityScore = 4;
  }
  
  return { score: readabilityScore, total: 10, gradeLevel: Math.round(gradeLevel * 10) / 10 };
}

function generateSuggestions(breakdown: ATSBreakdown): string[] {
  const suggestions: string[] = [];
  
  if (breakdown.keywords.missing.length > 0) {
    suggestions.push(`Add missing keywords: ${breakdown.keywords.missing.slice(0, 3).join(', ')}`);
  }
  
  if (breakdown.quantification.score < 10) {
    const needed = breakdown.quantification.totalBullets - breakdown.quantification.quantifiedBullets;
    suggestions.push(`Add metrics to ${needed} more bullet points (%, $, #users)`);
  }
  
  if (breakdown.readability.gradeLevel > 12) {
    suggestions.push("Simplify sentence structure to improve readability");
  }
  
  if (breakdown.relevancy.score < 20) {
    suggestions.push("Better align experience descriptions with job requirements");
  }
  
  if (breakdown.formatting.score < 8) {
    suggestions.push("Improve resume structure and ensure all required sections are complete");
  }
  
  return suggestions.slice(0, 5); // Limit to top 5 suggestions
}

export async function computeATSScore(resume: ResumeJson, jdText: string): Promise<ATSResult> {
  // Convert resume to text for analysis, handling undefined fields
  const resumeText = [
    resume.personalInfo?.name || '',
    resume.personalInfo?.email || '',
    resume.summary || '',
    ...(resume.experience || []).flatMap(exp => [
      exp.title || '', 
      exp.company || '', 
      ...(exp.bullets || [])
    ]),
    ...Object.values(resume.skills || {}).flat().filter(Boolean),
    ...(resume.education || []).flatMap(edu => [
      edu.degree || '', 
      edu.school || ''
    ])
  ].filter(Boolean).join(' ');
  
  // Calculate individual scores
  const keywordData = calculateKeywordScore(resumeText, jdText);
  const quantificationData = calculateQuantificationScore(resume);
  const formattingData = calculateFormattingScore(resume);
  const readabilityData = calculateReadabilityScore(resumeText + ' ' + jdText);
  
  // Relevancy score (simplified - in real implementation would use embeddings)
  const relevancyScore = Math.min(25, Math.round(keywordData.score * 0.6 + 10));
  
  const breakdown: ATSBreakdown = {
    keywords: keywordData,
    relevancy: { score: relevancyScore, total: 25 },
    quantification: quantificationData,
    formatting: formattingData,
    readability: readabilityData
  };
  
  const overall = breakdown.keywords.score + 
                 breakdown.relevancy.score + 
                 breakdown.quantification.score + 
                 breakdown.formatting.score + 
                 breakdown.readability.score;
  
  const suggestions = generateSuggestions(breakdown);
  
  return { overall, breakdown, suggestions };
}

export async function computeATSScoreWithEmbeddings(
  resume: ResumeJson, 
  jdText: string, 
  resumeEmbedding?: number[], 
  jdEmbedding?: number[]
): Promise<ATSResult> {
  // Get base score
  const baseResult = await computeATSScore(resume, jdText);
  
  // If embeddings are available, enhance relevancy score
  if (resumeEmbedding && jdEmbedding) {
    const cosineSimilarity = calculateCosineSimilarity(resumeEmbedding, jdEmbedding);
    const enhancedRelevancyScore = Math.round(cosineSimilarity * 25);
    
    baseResult.breakdown.relevancy.score = enhancedRelevancyScore;
    baseResult.overall = baseResult.breakdown.keywords.score + 
                        enhancedRelevancyScore + 
                        baseResult.breakdown.quantification.score + 
                        baseResult.breakdown.formatting.score + 
                        baseResult.breakdown.readability.score;
  }
  
  return baseResult;
}

function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

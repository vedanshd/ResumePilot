import { ResumeJson } from '../types';

interface MockCoverLetterOptions {
  resume: ResumeJson;
  jobTitle: string;
  company: string;
  jobDescription?: string;
  tone?: 'professional' | 'friendly' | 'enthusiastic';
}

/**
 * Generates a mock cover letter when OpenAI API is unavailable
 * This is a fallback mechanism to ensure the application works even without API access
 */
export function generateMockCoverLetter(options: MockCoverLetterOptions): string {
  const { resume, jobTitle, jobDescription, tone = 'professional' } = options;
  const company = '[Company Name]'; // Always use placeholder
  
  // Extract key information from resume
  const name = resume.personalInfo?.name || '[Your Name]';
  const email = resume.personalInfo?.email || '[Your Email]';
  const phone = resume.personalInfo?.phone || '[Your Phone]';
  const location = resume.personalInfo?.location || '[Your Location]';
  
  // Get current role and experience
  const currentExperience = resume.experience?.[0];
  const currentRole = currentExperience?.title || 'Software Engineer';
  const currentCompany = currentExperience?.company || 'Current Company';
  const yearsOfExperience = calculateYearsOfExperience(resume.experience || []);
  
  // Extract key skills
  const allSkills = extractAllSkills(resume.skills || {});
  const topSkills = allSkills.slice(0, 5);
  
  // Extract key achievements
  const achievements = extractAchievements(resume.experience || []);
  
  // Generate opening based on tone
  const opening = generateOpening(tone, jobTitle, company, currentRole);
  
  // Generate body paragraphs
  const experienceParagraph = generateExperienceParagraph(
    yearsOfExperience,
    currentRole,
    currentCompany,
    achievements,
    topSkills
  );
  
  const skillsParagraph = generateSkillsParagraph(topSkills, jobTitle);
  
  const whyCompanyParagraph = generateWhyCompanyParagraph(company, jobTitle);
  
  // Generate closing based on tone
  const closing = generateClosing(tone, name);
  
  // Assemble the cover letter
  return `${name}
${email}
${phone}
${location}

${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}

Hiring Manager
${company}

Dear Hiring Manager,

${opening}

${experienceParagraph}

${skillsParagraph}

${whyCompanyParagraph}

${closing}

Sincerely,
${name}`;
}

// Helper functions

function calculateYearsOfExperience(experience: any[]): number {
  if (!experience || experience.length === 0) return 0;
  
  const firstJob = experience[experience.length - 1];
  const lastJob = experience[0];
  
  if (firstJob.startDate && lastJob.endDate) {
    const start = new Date(firstJob.startDate);
    const end = lastJob.endDate === 'Present' ? new Date() : new Date(lastJob.endDate);
    return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365));
  }
  
  return 5; // Default fallback
}

function extractAllSkills(skills: Record<string, string[]>): string[] {
  const allSkills: string[] = [];
  for (const category in skills) {
    if (Array.isArray(skills[category])) {
      allSkills.push(...skills[category]);
    }
  }
  return allSkills;
}

function extractAchievements(experience: any[]): string[] {
  const achievements: string[] = [];
  
  for (const job of experience.slice(0, 2)) { // Get from most recent 2 jobs
    if (job.achievements && Array.isArray(job.achievements)) {
      achievements.push(...job.achievements.slice(0, 2)); // Take top 2 from each
    }
  }
  
  // If no achievements, create generic ones
  if (achievements.length === 0) {
    achievements.push(
      'Led successful projects that improved team efficiency by 30%',
      'Collaborated with cross-functional teams to deliver high-quality solutions',
      'Implemented best practices that enhanced code quality and maintainability'
    );
  }
  
  return achievements.slice(0, 3);
}

function generateOpening(tone: string, jobTitle: string, company: string, currentRole: string): string {
  const openings = {
    professional: `I am writing to express my strong interest in the ${jobTitle} position at ${company}. With my extensive experience as a ${currentRole} and proven track record of delivering innovative solutions, I am confident that I would be a valuable addition to your team.`,
    
    friendly: `I was thrilled to discover the ${jobTitle} opening at ${company}! As a ${currentRole} who's passionate about creating impactful solutions, I believe I'd be a great fit for your team and would love to contribute to ${company}'s continued success.`,
    
    enthusiastic: `I am incredibly excited about the opportunity to join ${company} as a ${jobTitle}! My experience as a ${currentRole} has prepared me perfectly for this role, and I can't wait to bring my passion and expertise to your innovative team.`
  };
  
  return openings[tone] || openings.professional;
}

function generateExperienceParagraph(
  years: number,
  role: string,
  company: string,
  achievements: string[],
  skills: string[]
): string {
  const yearText = years > 0 ? `${years}+ years` : 'several years';
  
  return `Throughout my ${yearText} of experience in software development, I have consistently delivered high-impact results. In my current role as ${role} at ${company}, I have:

• ${achievements[0] || 'Developed and maintained scalable applications serving thousands of users'}
• ${achievements[1] || 'Improved system performance and reliability through optimization'}
• ${achievements[2] || 'Mentored team members and contributed to technical documentation'}

These experiences have honed my expertise in ${skills.slice(0, 3).join(', ')}, enabling me to tackle complex challenges and deliver solutions that drive business value.`;
}

function generateSkillsParagraph(skills: string[], jobTitle: string): string {
  if (skills.length === 0) {
    skills = ['JavaScript', 'React', 'Node.js', 'Python', 'AWS'];
  }
  
  return `My technical skill set aligns perfectly with the requirements for the ${jobTitle} role. I bring deep expertise in ${skills.slice(0, 3).join(', ')}, along with proficiency in ${skills.slice(3, 5).join(' and ')}. I am committed to staying current with emerging technologies and best practices, ensuring that I can contribute cutting-edge solutions to your team.`;
}

function generateWhyCompanyParagraph(company: string, jobTitle: string): string {
  return `What particularly excites me about ${company} is your commitment to innovation and excellence in technology. Your company's reputation for fostering a collaborative environment where engineers can grow and make meaningful contributions aligns perfectly with my career goals. I am eager to bring my problem-solving abilities and technical expertise to the ${jobTitle} role and contribute to ${company}'s continued success.`;
}

function generateClosing(tone: string, name: string): string {
  const closings = {
    professional: `I would welcome the opportunity to discuss how my background, skills, and enthusiasm can contribute to your team's success. Thank you for considering my application. I look forward to the possibility of speaking with you further about this exciting opportunity.`,
    
    friendly: `I'd love to chat more about how I can contribute to your team! I'm really excited about this opportunity and would be thrilled to discuss my experiences and ideas with you. Thanks so much for considering my application – I look forward to hearing from you!`,
    
    enthusiastic: `I am incredibly excited about the possibility of joining your team and can't wait to contribute my skills and passion to your projects! I would absolutely love the opportunity to discuss this role further and share more about how I can help drive success at your company. Thank you for your consideration!`
  };
  
  return closings[tone] || closings.professional;
}

export default generateMockCoverLetter;

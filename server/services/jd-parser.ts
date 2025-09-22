interface ParsedJD {
  title: string;
  company: string;
  location?: string;
  type?: string;
  summary: string;
  requirements: string[];
  responsibilities: string[];
  skills: string[];
  benefits?: string[];
  salary?: string;
}

export function parseJobDescription(text: string, providedTitle?: string, providedCompany?: string): ParsedJD {
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  let title = providedTitle || extractTitle(text);
  let company = providedCompany || extractCompany(text);
  
  const sections = identifySections(lines);
  
  return {
    title,
    company,
    location: extractLocation(text),
    type: extractJobType(text),
    summary: extractSummary(lines, sections),
    requirements: extractRequirements(lines, sections),
    responsibilities: extractResponsibilities(lines, sections),
    skills: extractSkills(lines, sections),
    benefits: extractBenefits(lines, sections),
    salary: extractSalary(text)
  };
}

function extractTitle(text: string): string {
  // Look for common job title patterns
  const titlePatterns = [
    /(?:job title|position|role):\s*(.+)/i,
    /(?:^|\n)([A-Z][A-Za-z\s]+(?:engineer|developer|manager|analyst|specialist|coordinator|director|lead))/,
    /(?:hiring|seeking|looking for)\s+(?:a\s+)?(.+?)(?:\s+at|\s+in|\s+for|\s+to|\n|$)/i
  ];
  
  for (const pattern of titlePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return "Position";
}

function extractCompany(text: string): string {
  // Look for company name patterns
  const companyPatterns = [
    /(?:company|employer|organization):\s*(.+)/i,
    /(?:at|@)\s+([A-Z][A-Za-z\s&.,]+?)(?:\s+(?:is|seeks|looking|hiring)|$)/,
    /(?:^|\n)([A-Z][A-Za-z\s&.,]{2,30})\s+(?:is\s+)?(?:hiring|seeking|looking for)/
  ];
  
  for (const pattern of companyPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  return "Company";
}

function extractLocation(text: string): string | undefined {
  const locationPattern = /(?:location|based in|office in):\s*(.+?)(?:\n|$)/i;
  const match = text.match(locationPattern);
  return match ? match[1].trim() : undefined;
}

function extractJobType(text: string): string | undefined {
  const typePatterns = [
    /\b(full[- ]?time|part[- ]?time|contract|temporary|intern|internship|freelance|remote)\b/i
  ];
  
  for (const pattern of typePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].toLowerCase().replace(/-/g, ' ');
    }
  }
  
  return undefined;
}

function identifySections(lines: string[]): Record<string, number[]> {
  const sections: Record<string, number[]> = {
    requirements: [],
    responsibilities: [],
    skills: [],
    benefits: [],
    summary: []
  };
  
  let currentSection = 'summary';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();
    
    if (line.includes('requirement') || line.includes('qualification') || line.includes('must have')) {
      currentSection = 'requirements';
    } else if (line.includes('responsibilit') || line.includes('duties') || line.includes('role') || line.includes('you will')) {
      currentSection = 'responsibilities';
    } else if (line.includes('skill') || line.includes('technology') || line.includes('experience with')) {
      currentSection = 'skills';
    } else if (line.includes('benefit') || line.includes('offer') || line.includes('perks')) {
      currentSection = 'benefits';
    } else if (lines[i].startsWith('•') || lines[i].startsWith('-') || lines[i].startsWith('*') || /^\d+\./.test(lines[i])) {
      sections[currentSection].push(i);
    } else if (lines[i].length > 50 && !line.includes(':')) {
      sections[currentSection].push(i);
    }
  }
  
  return sections;
}

function extractSummary(lines: string[], sections: Record<string, number[]>): string {
  const summaryLines = sections.summary.map(i => lines[i]);
  if (summaryLines.length === 0) {
    // Take first few non-bullet lines as summary
    const nonBulletLines = lines.filter(line => 
      !line.startsWith('•') && !line.startsWith('-') && !line.startsWith('*') && 
      !/^\d+\./.test(line) && line.length > 30
    ).slice(0, 3);
    return nonBulletLines.join(' ');
  }
  return summaryLines.join(' ');
}

function extractRequirements(lines: string[], sections: Record<string, number[]>): string[] {
  return sections.requirements.map(i => cleanBulletPoint(lines[i])).filter(req => req.length > 10);
}

function extractResponsibilities(lines: string[], sections: Record<string, number[]>): string[] {
  return sections.responsibilities.map(i => cleanBulletPoint(lines[i])).filter(resp => resp.length > 10);
}

function extractSkills(lines: string[], sections: Record<string, number[]>): string[] {
  const skillLines = sections.skills.map(i => cleanBulletPoint(lines[i]));
  const skills: string[] = [];
  
  // Extract individual skills from skill lines
  skillLines.forEach(line => {
    // Look for comma-separated skills
    if (line.includes(',')) {
      const parts = line.split(',').map(s => s.trim()).filter(s => s.length > 2);
      skills.push(...parts);
    } else {
      skills.push(line);
    }
  });
  
  // Also extract skills from requirements and responsibilities
  const allText = [...extractRequirements(lines, sections), ...extractResponsibilities(lines, sections)].join(' ');
  const commonSkills = [
    'JavaScript', 'Python', 'Java', 'TypeScript', 'React', 'Node.js', 'SQL', 'AWS', 'Docker',
    'Kubernetes', 'Git', 'REST', 'API', 'HTML', 'CSS', 'MongoDB', 'PostgreSQL', 'Redis',
    'Express', 'Angular', 'Vue', 'Django', 'Flask', 'Spring', 'GraphQL', 'Microservices'
  ];
  
  commonSkills.forEach(skill => {
    if (allText.toLowerCase().includes(skill.toLowerCase()) && !skills.some(s => s.toLowerCase().includes(skill.toLowerCase()))) {
      skills.push(skill);
    }
  });
  
  return skills.filter(skill => skill.length > 1);
}

function extractBenefits(lines: string[], sections: Record<string, number[]>): string[] | undefined {
  const benefits = sections.benefits.map(i => cleanBulletPoint(lines[i])).filter(benefit => benefit.length > 5);
  return benefits.length > 0 ? benefits : undefined;
}

function extractSalary(text: string): string | undefined {
  const salaryPatterns = [
    /\$[\d,]+(?:\s*-\s*\$[\d,]+)?(?:\s*(?:per\s+year|annually|\/year))?/,
    /[\d,]+k?(?:\s*-\s*[\d,]+k?)?\s*(?:per\s+year|annually|USD|dollars)/i,
    /salary:\s*([^\n]+)/i
  ];
  
  for (const pattern of salaryPatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }
  
  return undefined;
}

function cleanBulletPoint(text: string): string {
  return text.replace(/^[•\-\*\d+\.\s]+/, '').trim();
}

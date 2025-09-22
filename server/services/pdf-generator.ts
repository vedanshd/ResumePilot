import { ResumeJson } from "@shared/schema";

// Simple PDF-like structure for ATS-compatible format
interface PDFDocument {
  content: any[];
  styles: Record<string, any>;
  defaultStyle: any;
}

export function generateATSFriendlyPDF(resume: ResumeJson): PDFDocument {
  const content: any[] = [];
  
  // Header with contact info
  content.push({
    text: resume.personalInfo.name,
    style: 'header',
    margin: [0, 0, 0, 10]
  });
  
  const contactInfo = [
    resume.personalInfo.email,
    resume.personalInfo.phone,
    resume.personalInfo.location
  ].filter(Boolean).join(' | ');
  
  content.push({
    text: contactInfo,
    style: 'contact',
    margin: [0, 0, 0, 20]
  });
  
  if (resume.personalInfo.linkedin) {
    content.push({
      text: `LinkedIn: ${resume.personalInfo.linkedin}`,
      style: 'contact',
      margin: [0, 0, 0, 20]
    });
  }
  
  // Professional Summary
  if (resume.summary) {
    content.push({
      text: 'PROFESSIONAL SUMMARY',
      style: 'sectionHeader',
      margin: [0, 20, 0, 10]
    });
    
    content.push({
      text: resume.summary,
      style: 'bodyText',
      margin: [0, 0, 0, 20]
    });
  }
  
  // Technical Skills
  if (resume.skills) {
    content.push({
      text: 'TECHNICAL SKILLS',
      style: 'sectionHeader',
      margin: [0, 20, 0, 10]
    });
    
    const skillSections = [
      { label: 'Programming Languages', skills: resume.skills.programming },
      { label: 'Frameworks & Libraries', skills: resume.skills.frameworks },
      { label: 'Tools & Technologies', skills: resume.skills.tools },
      { label: 'Other Skills', skills: resume.skills.other }
    ].filter(section => section.skills && section.skills.length > 0);
    
    skillSections.forEach((section, index) => {
      content.push({
        text: [
          { text: `${section.label}: `, style: 'skillLabel' },
          { text: section.skills.join(', '), style: 'skillList' }
        ],
        margin: [0, 0, 0, 5]
      });
    });
    
    content.push({ text: '', margin: [0, 15, 0, 0] }); // spacing
  }
  
  // Professional Experience
  if (resume.experience && resume.experience.length > 0) {
    content.push({
      text: 'PROFESSIONAL EXPERIENCE',
      style: 'sectionHeader',
      margin: [0, 20, 0, 10]
    });
    
    resume.experience.forEach((exp, index) => {
      // Job title and company
      content.push({
        text: [
          { text: `${exp.title}`, style: 'jobTitle' },
          { text: ` | ${exp.company}`, style: 'companyName' }
        ],
        margin: [0, 0, 0, 2]
      });
      
      // Dates
      content.push({
        text: `${exp.startDate} - ${exp.endDate}`,
        style: 'dateRange',
        margin: [0, 0, 0, 8]
      });
      
      // Achievements/bullets
      if (exp.bullets && exp.bullets.length > 0) {
        exp.bullets.forEach(bullet => {
          content.push({
            text: `• ${bullet}`,
            style: 'bulletPoint',
            margin: [20, 0, 0, 4]
          });
        });
      }
      
      if (index < resume.experience.length - 1) {
        content.push({ text: '', margin: [0, 15, 0, 0] });
      }
    });
  }
  
  // Education
  if (resume.education && resume.education.length > 0) {
    content.push({
      text: 'EDUCATION',
      style: 'sectionHeader',
      margin: [0, 25, 0, 10]
    });
    
    resume.education.forEach((edu, index) => {
      content.push({
        text: [
          { text: edu.degree, style: 'degreeTitle' },
          { text: ` | ${edu.school}`, style: 'schoolName' }
        ],
        margin: [0, 0, 0, 2]
      });
      
      const eduDetails = [];
      if (edu.year) eduDetails.push(edu.year);
      if (edu.gpa) eduDetails.push(`GPA: ${edu.gpa}`);
      
      if (eduDetails.length > 0) {
        content.push({
          text: eduDetails.join(' | '),
          style: 'educationDetails',
          margin: [0, 0, 0, 8]
        });
      }
      
      if (index < resume.education.length - 1) {
        content.push({ text: '', margin: [0, 10, 0, 0] });
      }
    });
  }
  
  return {
    content,
    styles: {
      header: {
        fontSize: 20,
        bold: true,
        alignment: 'center'
      },
      contact: {
        fontSize: 11,
        alignment: 'center'
      },
      sectionHeader: {
        fontSize: 12,
        bold: true
      },
      bodyText: {
        fontSize: 11,
        lineHeight: 1.3
      },
      skillLabel: {
        fontSize: 11,
        bold: true
      },
      skillList: {
        fontSize: 11
      },
      jobTitle: {
        fontSize: 12,
        bold: true
      },
      companyName: {
        fontSize: 11
      },
      dateRange: {
        fontSize: 10,
        italics: true
      },
      bulletPoint: {
        fontSize: 11,
        lineHeight: 1.3
      },
      degreeTitle: {
        fontSize: 11,
        bold: true
      },
      schoolName: {
        fontSize: 11
      },
      educationDetails: {
        fontSize: 10,
        italics: true
      }
    },
    defaultStyle: {
      fontSize: 11,
      font: 'Helvetica'
    }
  };
}

export function generateCoverLetterPDF(content: string, recipientInfo?: {
  company?: string;
  position?: string;
  date?: string;
}): PDFDocument {
  const pdfContent: any[] = [];
  
  // Date
  pdfContent.push({
    text: recipientInfo?.date || new Date().toLocaleDateString(),
    style: 'date',
    margin: [0, 0, 0, 20]
  });
  
  // Recipient info (if provided)
  if (recipientInfo?.company || recipientInfo?.position) {
    const recipientText = [
      recipientInfo.position && `Hiring Manager`,
      recipientInfo.company && recipientInfo.company
    ].filter(Boolean).join('\n');
    
    pdfContent.push({
      text: recipientText,
      style: 'recipient',
      margin: [0, 0, 0, 20]
    });
  }
  
  // Cover letter content
  const paragraphs = content.split('\n\n').filter(p => p.trim());
  
  paragraphs.forEach((paragraph, index) => {
    pdfContent.push({
      text: paragraph.trim(),
      style: 'paragraph',
      margin: [0, 0, 0, 15]
    });
  });
  
  return {
    content: pdfContent,
    styles: {
      date: {
        fontSize: 11,
        alignment: 'right'
      },
      recipient: {
        fontSize: 11
      },
      paragraph: {
        fontSize: 11,
        lineHeight: 1.4,
        alignment: 'justify'
      }
    },
    defaultStyle: {
      fontSize: 11,
      font: 'Helvetica'
    }
  };
}

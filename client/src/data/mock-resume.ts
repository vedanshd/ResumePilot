export const mockResumeData = {
  personalInfo: {
    name: "Jake Ryan",
    email: "jake@su.edu",
    phone: "123-456-7890",
    location: "Boston, MA",
    linkedin: "linkedin.com/in/jake",
    github: "github.com/jake"
  },
  summary: "Passionate software engineer with 3+ years of experience in developing scalable web applications and RESTful APIs. Proven track record of leading cross-functional teams and delivering high-quality software solutions on time. Expertise in modern JavaScript frameworks, cloud technologies, and agile methodologies.",
  education: [
    {
      degree: "Bachelor of Science in Computer Science",
      school: "Southwestern University",
      location: "Georgetown, TX",
      graduation: "May 2021",
      gpa: "3.9/4.0",
      honors: ["Dean's List", "Academic Excellence Award"]
    }
  ],
  experience: [
    {
      title: "Software Engineer",
      company: "Tech Solutions Inc.",
      location: "Boston, MA",
      startDate: "June 2021",
      endDate: "Present",
      bullets: [
        "Developed and maintained 5+ microservices handling 2M+ daily requests with 99.9% uptime",
        "Led a team of 4 engineers to redesign the payment processing system, reducing transaction time by 40%",
        "Implemented automated testing pipelines that increased code coverage from 45% to 85%",
        "Collaborated with product managers to define requirements and deliver 15+ new features",
        "Mentored 3 junior developers and conducted 20+ code reviews weekly"
      ]
    },
    {
      title: "Software Engineering Intern",
      company: "Innovation Labs",
      location: "Austin, TX",
      startDate: "May 2020",
      endDate: "August 2020",
      bullets: [
        "Built a real-time dashboard using React and WebSocket that visualized data for 1000+ users",
        "Optimized database queries resulting in 60% reduction in API response time",
        "Developed RESTful APIs using Node.js and Express serving 10K+ requests daily",
        "Participated in agile ceremonies and contributed to sprint planning sessions"
      ]
    },
    {
      title: "Undergraduate Research Assistant",
      company: "Southwestern University",
      location: "Georgetown, TX",
      startDate: "January 2020",
      endDate: "May 2021",
      bullets: [
        "Researched machine learning algorithms for natural language processing applications",
        "Published 2 papers in peer-reviewed conferences on sentiment analysis",
        "Developed Python scripts to automate data collection and preprocessing, saving 10+ hours weekly"
      ]
    }
  ],
  skills: {
    programming: ["JavaScript", "TypeScript", "Python", "Java", "SQL", "HTML/CSS"],
    frameworks: ["React", "Node.js", "Express", "Django", "Spring Boot", "Next.js"],
    tools: ["Git", "Docker", "Kubernetes", "AWS", "MongoDB", "PostgreSQL", "Redis"],
    other: ["Agile/Scrum", "REST APIs", "Microservices", "CI/CD", "Unit Testing", "System Design"]
  },
  projects: [
    {
      name: "E-Commerce Platform",
      description: "Full-stack e-commerce application with React, Node.js, and MongoDB",
      bullets: [
        "Implemented secure payment processing handling $100K+ in transactions",
        "Achieved 95% customer satisfaction rating from 500+ users",
        "Reduced page load time by 50% through code optimization and caching"
      ],
      technologies: ["React", "Node.js", "MongoDB", "Stripe API"],
      link: "github.com/jake/ecommerce"
    },
    {
      name: "Task Management System",
      description: "Collaborative project management tool for remote teams",
      bullets: [
        "Designed RESTful API serving 50K+ API calls daily",
        "Implemented real-time notifications using WebSocket",
        "Deployed on AWS with auto-scaling capabilities"
      ],
      technologies: ["Vue.js", "Express", "PostgreSQL", "AWS"],
      link: "github.com/jake/taskmanager"
    }
  ],
  certifications: [
    {
      name: "AWS Certified Solutions Architect",
      issuer: "Amazon Web Services",
      date: "2022"
    },
    {
      name: "Google Cloud Professional Developer",
      issuer: "Google",
      date: "2023"
    }
  ],
  achievements: [
    "Winner of HackMIT 2020 - Built an AI-powered study assistant used by 1000+ students",
    "Open source contributor with 500+ GitHub stars across various projects",
    "Speaker at ReactConf 2022 - 'Building Scalable React Applications'"
  ]
};

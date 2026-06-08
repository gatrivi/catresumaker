import { ResumeData } from "../types.ts";

export const SAMPLE_RESUME: ResumeData = {
  id: "profile-1",
  label: "Software Engineer Profile",
  updatedAt: new Date().toISOString(),
  personalInfo: {
    name: "Alex Sterling",
    title: "Senior Full-Stack Engineer",
    email: "alex.sterling@devmail.com",
    phone: "(555) 342-9981",
    website: "https://sterling-dev.io",
    location: "San Francisco, CA",
    summary: "Driven Full-Stack Engineer with 5+ years of experience specializing in high-scale React, Node.js microservices, and automated Cloud native environments. Passionate about system latency optimization and crafting fluid, accessible user interfaces."
  },
  education: [
    {
      id: "edu-1",
      institution: "State University of California",
      degree: "B.S. in Computer Science & Engineering",
      location: "Double Major with Honors",
      dates: "2016 - 2020",
      description: "GPA: 3.85/4.0. Core areas: Algorithms, Distributed Systems, Compiler Design."
    }
  ],
  experience: [
    {
      id: "exp-1",
      company: "InnovateTech Solutions",
      title: "Senior Software Engineer",
      location: "San Francisco, CA",
      dates: "Jan 2022 - Present",
      bullets: [
        "Architected core asynchronous search indexes in Node.js, reducing global query latency by 42% for over 2M active monthly users.",
        "Led a frontend migration of 14 complex client dashboards to React 18, enhancing accessibility compliance scores from 74% to 99%.",
        "Mentored 4 mid-level engineers on state-management patterns, CI/CD pipelines, and writing robust integration tests.",
        "Formulated customizable container orchestration recipes in Kubernetes, cutting deployment warm-up times by 15%."
      ],
      current: true
    },
    {
      id: "exp-2",
      company: "CloudBound Systems",
      title: "Full-Stack Developer",
      location: "Austin, TX",
      dates: "June 2020 - Dec 2021",
      bullets: [
        "Designed and maintained 12+ persistent RESTful API endpoints utilizing Express.js, handling over 140,000 hourly transactions securely.",
        "Integrated third-party payment processing microservices via Stripe, resulting in a streamlined checkout funnel and a 12% boost in conversions.",
        "Implemented Redis caching strategies for database calls, dropping recurrent server memory spikes by 30% during traffic surges."
      ],
      current: false
    }
  ],
  projects: [
    {
      id: "proj-1",
      name: "Omni-Query Analytics",
      description: "Enterprise data visualization and metric aggregation portal.",
      technologies: ["React", "TypeScript", "D3.js", "Express", "TailwindCSS"],
      bullets: [
        "Constructed custom D3 charting extensions to render real-time telemetry pipelines containing up to 50,000 data points smoothly.",
        "Structured a fluid, fully secure API proxy pipeline utilizing Express to protect external database keys and eliminate CORS bottlenecks."
      ],
      url: "https://github.com/alex-sterling/omni-query"
    }
  ],
  skills: [
    {
      id: "skill-1",
      category: "Languages",
      items: ["TypeScript", "JavaScript (ES6+)", "Python", "SQL (PostgreSQL)", "HTML5/CSS3"]
    },
    {
      id: "skill-2",
      category: "Frameworks & UI",
      items: ["React", "Express.js", "Node.js", "Tailwind CSS", "Next.js", "Redux Toolkit"]
    },
    {
      id: "skill-3",
      category: "DevOps & Tools",
      items: ["Docker", "Kubernetes", "AWS (S3, EC2)", "Git/GitHub Actions", "Jest", "Vite"]
    }
  ],
  languages: ["English (Native)", "Spanish (Conversational)"],
  certifications: ["AWS Certified Solutions Architect", "Scrum Alliance Certified Developer"]
};

// Simple templates
export const TEMPLATES = [
  { id: "ats-classic", name: "ATS Classic", description: "Standard, clean single-column structure optimized to score maximum readability on screening bots." },
  { id: "modern-serif", name: "Modern Editorial", description: "Elegant serif display headers and spacious columns for a polished editorial layout." },
  { id: "clean-minimal", name: "Slate Minimal", description: "Contemporary layout with subtle slate accents, minimalist divider lines, and balanced geometry." },
  { id: "tech-mono", name: "Terminal Mono", description: "Technical, monospace layout featuring brutalist structural borders, perfect for engineers." }
];

export interface PersonalInfo {
  name: string;
  title: string;
  email: string;
  phone: string;
  website: string;
  location: string;
  summary: string;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  location: string;
  dates: string;
  description: string;
}

export interface Experience {
  id: string;
  company: string;
  title: string;
  location: string;
  dates: string;
  bullets: string[];
  current: boolean;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  bullets: string[];
  url?: string;
}

export interface SkillCategory {
  id: string;
  category: string;
  items: string[];
}

export interface WorkLogEntry {
  id: string;
  date: string;
  content: string;
  status: 'pending' | 'integrated' | 'raw';
  integratedAt?: string;
  suggestedChanges?: {
    section: 'experience' | 'skills' | 'projects';
    targetId: string;
    description: string;
    bulletIndex?: number;
    newValue: string;
  }[];
}

export interface ResumeData {
  id: string;
  label: string;
  updatedAt: string;
  personalInfo: PersonalInfo;
  education: Education[];
  experience: Experience[];
  projects: Project[];
  skills: SkillCategory[];
  languages: string[];
  certifications: string[];
}

export interface ResumeTemplate {
  id: 'ats-classic' | 'modern-serif' | 'clean-minimal' | 'tech-mono';
  name: string;
  description: string;
}

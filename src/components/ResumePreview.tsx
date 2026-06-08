import { ResumeData } from "../types.ts";
import { Mail, Phone, Globe, MapPin, ExternalLink } from "lucide-react";

interface ResumePreviewProps {
  data: ResumeData;
  templateId: 'ats-classic' | 'modern-serif' | 'clean-minimal' | 'tech-mono';
}

export default function ResumePreview({ data, templateId }: ResumePreviewProps) {
  const { personalInfo, education, experience, projects, skills, languages, certifications } = data;

  // Set typography based on template choice
  const getTypography = () => {
    switch (templateId) {
      case "modern-serif":
        return {
          container: "font-serif text-slate-800",
          headerTitle: "font-serif text-4xl font-semibold text-slate-950 tracking-tight",
          sectionTitle: "font-serif text-lg font-bold text-slate-900 border-b border-rose-100 pb-1 uppercase tracking-wider",
          bodyText: "font-serif text-sm text-slate-700 leading-relaxed",
          metaText: "font-serif text-xs text-slate-500 italic",
          boldText: "font-bold text-slate-900",
        };
      case "tech-mono":
        return {
          container: "font-mono text-zinc-900",
          headerTitle: "font-mono text-3xl font-bold uppercase text-zinc-950 tracking-widest",
          sectionTitle: "font-mono text-base font-bold text-zinc-950 border-double border-b-4 border-zinc-950 pb-1 uppercase",
          bodyText: "font-mono text-xs text-zinc-800 leading-relaxed",
          metaText: "font-mono text-[10px] text-zinc-600 uppercase",
          boldText: "font-bold text-zinc-950",
        };
      case "clean-minimal":
        return {
          container: "font-sans text-neutral-800",
          headerTitle: "font-sans text-4xl font-extrabold text-neutral-900 tracking-tight",
          sectionTitle: "font-sans text-xs font-semibold text-sky-700 tracking-widest uppercase border-l-4 border-sky-600 pl-2 py-0.5",
          bodyText: "font-sans text-xs text-neutral-600 leading-relaxed",
          metaText: "font-sans text-[11px] text-neutral-400 font-medium",
          boldText: "font-semibold text-neutral-900",
        };
      case "ats-classic":
      default:
        return {
          container: "font-sans text-black",
          headerTitle: "font-sans text-3xl font-bold tracking-tight text-center text-black uppercase",
          sectionTitle: "font-sans text-sm font-bold text-black border-b border-black pb-0.5 uppercase tracking-wide",
          bodyText: "font-sans text-xs text-neutral-800 leading-relaxed",
          metaText: "font-sans text-xs text-neutral-500",
          boldText: "font-bold text-black",
        };
    }
  };

  const style = getTypography();

  return (
    <div
      id="ats-print-resume"
      className={`print-only-resume bg-white w-full max-w-[800px] min-h-[1050px] mx-auto p-8 sm:p-12 shadow-sm border border-neutral-100/50 ${style.container} flex flex-col gap-6 select-text`}
    >
      {/* Header Panel */}
      <header className={`flex flex-col gap-2 ${templateId === 'ats-classic' ? 'items-center text-center' : ''}`}>
        <div className="flex flex-col">
          <h1 className={style.headerTitle} id="resume-display-name">
            {personalInfo.name || "Your Name"}
          </h1>
          <p className={`text-base font-medium ${templateId === 'tech-mono' ? 'text-zinc-700' : 'text-neutral-600'} mt-1`}>
            {personalInfo.title || "Professional Title"}
          </p>
        </div>

        {/* Contact Strip */}
        <div className={`flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-neutral-600 mt-2 ${templateId === 'ats-classic' ? 'justify-center border-t border-b border-neutral-150 py-2 w-full' : ''}`}>
          {personalInfo.email && (
            <span className="flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 opacity-60 shrink-0" />
              <span>{personalInfo.email}</span>
            </span>
          )}
          {personalInfo.phone && (
            <span className="flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 opacity-60 shrink-0" />
              <span>{personalInfo.phone}</span>
            </span>
          )}
          {personalInfo.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 opacity-60 shrink-0" />
              <span>{personalInfo.location}</span>
            </span>
          )}
          {personalInfo.website && (
            <span className="flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 opacity-60 shrink-0" />
              <a href={personalInfo.website} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-0.5">
                {personalInfo.website.replace(/^https?:\/\//i, '')}
                <ExternalLink className="w-2.5 h-2.5 opacity-50 inline-block no-print" />
              </a>
            </span>
          )}
        </div>

        {personalInfo.summary && (
          <p className={`${style.bodyText} mt-2 text-justify italic`}>
            {personalInfo.summary}
          </p>
        )}
      </header>

      {/* Experience Section */}
      {experience && experience.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className={style.sectionTitle}>Professional Experience</h2>
          <div className="flex flex-col gap-4">
            {experience.map((exp) => (
              <div key={exp.id} className="flex flex-col gap-1 page-break-avoid">
                <div className="flex justify-between items-start flex-wrap gap-1">
                  <div>
                    <span className={`${style.boldText} text-sm`}>{exp.title}</span>
                    <span className="text-neutral-500 mx-1.5">|</span>
                    <span className="text-sm font-medium text-neutral-700">{exp.company}</span>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className={`${style.boldText} text-xs`}>{exp.dates}</span>
                    {exp.location && <span className={style.metaText}>{exp.location}</span>}
                  </div>
                </div>

                {exp.bullets && exp.bullets.length > 0 && (
                  <ul className="list-disc pl-5 mt-1 flex flex-col gap-1 text-xs">
                    {exp.bullets.map((bullet, idx) => (
                      <li key={idx} className={`${style.bodyText} leading-relaxed`}>
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projects Section */}
      {projects && projects.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className={style.sectionTitle}>Key Projects</h2>
          <div className="flex flex-col gap-4">
            {projects.map((proj) => (
              <div key={proj.id} className="flex flex-col gap-1 page-break-avoid">
                <div className="flex justify-between items-start flex-wrap gap-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-sm">{proj.name}</span>
                    {proj.url && (
                      <a href={proj.url} target="_blank" rel="noopener noreferrer" className="text-neutral-400 hover:text-neutral-700 inline-flex items-center gap-0.5 text-[10px] uppercase tracking-normal font-mono transition-colors no-print">
                        [Link] <ExternalLink className="w-2" />
                      </a>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {proj.technologies && proj.technologies.map((tech, idx) => (
                      <span key={idx} className="bg-neutral-100 text-neutral-700 text-[10px] px-1.5 py-0.5 rounded font-mono">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
                <p className={`${style.bodyText} text-xs leading-relaxed italic`}>
                  {proj.description}
                </p>
                {proj.bullets && proj.bullets.length > 0 && (
                  <ul className="list-disc pl-5 mt-1 flex flex-col gap-1 text-xs">
                    {proj.bullets.map((bullet, idx) => (
                      <li key={idx} className={`${style.bodyText} leading-relaxed`}>
                        {bullet}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education Section */}
      {education && education.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className={style.sectionTitle}>Education</h2>
          <div className="flex flex-col gap-3">
            {education.map((edu) => (
              <div key={edu.id} className="flex justify-between items-start flex-wrap gap-2 page-break-avoid">
                <div className="flex flex-col">
                  <span className={`${style.boldText} text-sm`}>{edu.institution}</span>
                  <span className="text-xs text-neutral-700 font-medium">{edu.degree}</span>
                  {edu.description && <p className={`${style.bodyText} text-xs italic mt-0.5`}>{edu.description}</p>}
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className={`${style.boldText} text-xs`}>{edu.dates}</span>
                  {edu.location && <span className={style.metaText}>{edu.location}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills Section */}
      {skills && skills.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className={style.sectionTitle}>Technical Skills</h2>
          <div className="flex flex-col gap-2">
            {skills.map((skillGroup) => (
              <div key={skillGroup.id} className="grid grid-cols-1 md:grid-cols-4 gap-1 text-xs page-break-avoid">
                <span className={`${style.boldText} text-xs uppercase pr-2`}>
                  {skillGroup.category}:
                </span>
                <span className={`${style.bodyText} md:col-span-3 text-neutral-800`}>
                  {skillGroup.items.join(", ")}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Footer Languages / Certifications Split */}
      {(languages.length > 0 || certifications.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2 pt-2 border-t border-neutral-100 page-break-avoid font-sans">
          {languages.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className={`${style.boldText} text-xs uppercase tracking-wider`}>Languages</span>
              <p className={style.bodyText}>{languages.join(", ")}</p>
            </div>
          )}
          {certifications.length > 0 && (
            <div className="flex flex-col gap-1">
              <span className={`${style.boldText} text-xs uppercase tracking-wider`}>Certifications</span>
              <ul className="list-disc pl-4 flex flex-col gap-0.5">
                {certifications.map((cert, idx) => (
                  <li key={idx} className={`${style.bodyText} text-xs`}>{cert}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

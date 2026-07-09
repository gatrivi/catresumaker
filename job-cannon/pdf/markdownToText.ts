export function markdownToText(markdown: string): string {
  const md = markdown.replace(/\r\n/g, "\n");

  // Convert markdown links: [text](url) -> text: url
  let out = md.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, a, b) => `${a}: ${b}`);

  // Remove code fences but keep inner content.
  out = out.replace(/```[\s\S]*?\n([\s\S]*?)```/g, (_m, inner) => inner);

  // Remove inline code markers.
  out = out.replace(/`([^`]+)`/g, "$1");

  // Headings: keep text, drop '#'
  out = out.replace(/^#{1,6}\s+/gm, "");

  // Blockquotes: drop '>'
  out = out.replace(/^\s*>\s?/gm, "");

  // Horizontal rules: drop
  out = out.replace(/^\s*---+\s*$/gm, "");

  // Lists: keep content, drop leading markers.
  out = out.replace(/^\s*[-*+]\s+/gm, "");
  out = out.replace(/^\s*\d+\.\s+/gm, "");

  // Emphasis: drop * and _
  out = out.replace(/(\*\*|__)(.*?)\1/g, "$2");
  out = out.replace(/(\*|_)(.*?)\1/g, "$2");

  // Collapse excessive blank lines.
  out = out.replace(/\n{4,}/g, "\n\n\n");

  return out.trim() + "\n";
}


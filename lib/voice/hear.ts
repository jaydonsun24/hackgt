function preserveCase(source: string, replacement: string): string {
  if (source.length <= 1) return replacement;
  if (source === source.toUpperCase()) return replacement.toUpperCase();
  if (source[0] && source[0] === source[0].toUpperCase()) {
    return replacement[0]!.toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

function fixMail(text: string): string {
  return text.replace(/(^|[^A-Za-z0-9])mail(?=$|[^A-Za-z0-9])/gi, (match) => {
    const lead = /[^A-Za-z0-9]/.test(match[0] ?? "") ? match[0] : "";
    const word = match.slice(lead.length);
    return `${lead}${preserveCase(word, "male")}`;
  });
}

/** Standalone "H" before a number is almost always spoken "age". */
function fixAge(text: string): string {
  return text.replace(/(^|[^A-Za-z0-9])[Hh](\s*)(\d{1,3})(?=\D|$)/g, (match, lead: string, space: string, digits: string, offset: number, whole: string) => {
    const prefix = lead || "";
    const atStart = offset + prefix.length === 0 || /^\s*$/.test(whole.slice(0, offset + prefix.length));
    const gap = space || " ";
    return `${prefix}${atStart ? "Age" : "age"}${gap}${digits}`;
  });
}

export function heardWords(text: string): string {
  return fixAge(fixMail(text));
}

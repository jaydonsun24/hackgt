import type { Handout, HandoutRequest, HandoutSection } from "../contracts";
import { env } from "../env";
import { STANDARD_DISCLAIMER, mockHandout, mockIllustrationUrl } from "../mock/fixtures";
import { handoutCopy } from "./handout-copy";
import { grokJson } from "./grok";
import { illustrate } from "./illustrate";

const SYSTEM = `You write a patient handout for someone considering a clinical trial. Return one JSON object:
{"title":"","sections":[{"heading":"","body":""}],"questionsToAsk":[""],"disclaimer":"","illustrationPrompt":""}
Rules:
- Write at about a 6th-grade reading level unless another reading level is requested.
- Write the title, sections, questions, and disclaimer in the requested language.
- illustrationPrompt must be English.
- Be warm and free of jargon. Explain any medical word you must use.
- Never promise benefit, cure, or that the person will qualify.
- Say clearly that joining is voluntary and that they can say no.
- Include 3 to 5 sections covering what a trial is, why the doctor mentioned this one, where it is and how often, and cost questions.
- Include 3 to 5 questions the patient can ask.
- The disclaimer says this is not medical advice, a trial is research, it may not help, and participation is voluntary.
- illustrationPrompt describes a friendly flat illustration with no text, no letters, no needles, and no blood.`;

function sectionsFrom(value: unknown): HandoutSection[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 5).flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const heading = typeof row.heading === "string" ? row.heading.trim() : "";
    const body = typeof row.body === "string" ? row.body.trim() : "";
    if (!heading || !body) return [];
    return [{ heading, body }];
  });
}

function questionsFrom(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function safeArt(url: string | undefined, enabled: boolean | undefined): string | undefined {
  if (!enabled) return undefined;
  return url;
}

function templateHandout(req: HandoutRequest): Handout {
  const copy = handoutCopy(req.language);
  const city = req.ranked.trial.nearestSite
    ? `${req.ranked.trial.nearestSite.city}${req.ranked.trial.nearestSite.state ? `, ${req.ranked.trial.nearestSite.state}` : ""}`
    : "";
  const miles = req.ranked.trial.nearestSite?.distanceMiles;
  const distance = miles != null ? copy.distance(Math.round(miles)) : "";
  const code = req.language.toLowerCase().split("-")[0];
  const siteFallback: Record<string, string> = {
    en: "the study site",
    es: "el centro del estudio",
    vi: "trung tâm nghiên cứu",
    ko: "연구 기관",
    zh: "研究中心",
    ht: "sant etid la",
  };
  const place = city || siteFallback[code] || siteFallback.en;
  const condition = req.criteria.condition || "the condition in the note";
  const fill = (text: string) => text.replaceAll("{condition}", condition).replaceAll("{place}", place).replaceAll("{distance}", distance);
  return {
    title: copy.title,
    language: req.language,
    sections: [
      { heading: copy.whatHeading, body: copy.whatBody },
      { heading: copy.whyHeading, body: fill(copy.whyBody) },
      { heading: copy.whereHeading, body: fill(copy.whereBody) },
      { heading: copy.costHeading, body: copy.costBody },
    ],
    questionsToAsk: [...copy.questions],
    disclaimer: req.language.toLowerCase().startsWith("en") ? STANDARD_DISCLAIMER : copy.disclaimer,
    illustrationUrl: mockIllustrationUrl,
  };
}

export async function generateHandout(req: HandoutRequest): Promise<Handout> {
  if (env.mockAi) {
    const lungSpanish = req.language.toLowerCase().startsWith("es") && req.ranked.trial.nctId === "DEMO-0001";
    const handout = lungSpanish
      ? {
          ...mockHandout,
          sections: mockHandout.sections.map((section) => ({ ...section })),
          questionsToAsk: [...mockHandout.questionsToAsk],
        }
      : templateHandout(req);
    return { ...handout, language: req.language, illustrationUrl: safeArt(handout.illustrationUrl, req.withIllustration) };
  }

  try {
    const site = req.ranked.trial.nearestSite;
    const parsed = await grokJson<Record<string, unknown>>({
      system: SYSTEM,
      temperature: 0.4,
      user: JSON.stringify({
        language: req.language,
        readingLevel: req.readingLevel ?? 6,
        condition: req.criteria.condition,
        trialTitle: req.ranked.trial.title,
        nctId: req.ranked.trial.nctId,
        city: site?.city ?? null,
        state: site?.state ?? null,
        distanceMiles: site?.distanceMiles ?? null,
        summary: req.ranked.summary,
      }),
    });
    const sections = sectionsFrom(parsed.sections);
    const questions = questionsFrom(parsed.questionsToAsk);
    if (sections.length === 0 || questions.length === 0) {
      throw new Error("The handout could not be written. Try again.");
    }
    const title = typeof parsed.title === "string" && parsed.title.trim() ? parsed.title.trim() : "A study your doctor mentioned";
    const disclaimer = typeof parsed.disclaimer === "string" && parsed.disclaimer.trim()
      ? parsed.disclaimer.trim()
      : STANDARD_DISCLAIMER;
    const illustrationPrompt = typeof parsed.illustrationPrompt === "string" ? parsed.illustrationPrompt.trim() : "";
    let illustrationUrl: string | undefined;
    if (req.withIllustration) {
      const prompt = `Friendly flat illustration, no text, no letters, no needles, no blood, no medical procedures. ${
        illustrationPrompt || "A warm rural clinic exterior and two people talking with a clinician."
      }`;
      try {
        illustrationUrl = await illustrate(prompt);
      } catch {
        illustrationUrl = undefined;
      }
    }
    return { title, language: req.language, sections, questionsToAsk: questions, disclaimer, illustrationUrl };
  } catch {
    const fallback = templateHandout(req);
    return { ...fallback, language: req.language, illustrationUrl: safeArt(fallback.illustrationUrl, req.withIllustration) };
  }
}

import fs from "fs";
import path from "path";
import type { Handout, HandoutRequest, MatchResponse } from "../contracts";
import { matchDemoKey } from "./queries";

function fileFor(name: string): string {
  return path.join(process.cwd(), "data", "demo-cache", name);
}

export function readMatchCache(text: string): MatchResponse | null {
  const key = matchDemoKey(text);
  if (!key) return null;
  const file = fileFor(`${key.toLowerCase()}.json`);
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as MatchResponse;
  } catch {
    return null;
  }
}

export function readHandoutCache(req: HandoutRequest): Handout | null {
  const file = fileFor("a-handout-es.json");
  if (!fs.existsSync(file)) return null;
  try {
    const saved = JSON.parse(fs.readFileSync(file, "utf8")) as {
      nctId?: string;
      language?: string;
      handout?: Handout;
    };
    if (!saved.handout || !saved.nctId || !saved.language) return null;
    if (!req.language.toLowerCase().startsWith(saved.language.toLowerCase())) return null;
    if (req.ranked.trial.nctId.toUpperCase() !== saved.nctId.toUpperCase()) return null;
    return saved.handout;
  } catch {
    return null;
  }
}

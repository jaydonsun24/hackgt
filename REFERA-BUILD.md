# Refera: Complete Build Spec (single builder, Cursor)

> **How to use this file**
> 1. Create an empty folder, open it in **Cursor**, and save this file there as `SPEC.md`.
> 2. In Cursor's agent chat (Agent mode), pick a **Grok** model. Building with Cursor + Grok is part of the SpaceXAI prize requirements.
> 3. Paste the **kickoff prompt** for Phase 0 (below). When a phase is done and its checks pass, paste the next phase's kickoff prompt. Commit between phases.
> 4. Do the **Human checklist** in parallel. Those are things an AI can't do for you.

---

## Kickoff prompts (paste one at a time into Cursor)

**Phase 0**
```
Read SPEC.md fully before doing anything. You are building Refera, following it exactly. Do Phase 0 only. Follow every rule in the "Rules for the AI" section. When Phase 0's "Done when" checks all pass, stop and give me a short summary plus anything I need to do manually.
```

**Phases 1–7** (change the number each time)
```
Re-read SPEC.md, including the "Rules for the AI" and "Contracts" sections. Do Phase N only. Run `npm run check` before finishing. When Phase N's "Done when" checks all pass, stop and give me a short summary, anything I need to do manually, and any problems you couldn't solve.
```

**If something breaks**
```
Re-read SPEC.md. Something is broken: <describe it / paste the error>. Find the root cause, fix it without changing the contracts, keep mock mode working, run `npm run check`, and tell me what was wrong.
```

---

## Human checklist (do these yourself, in parallel)

- [ ] **Now:** get an **xAI API key**. Cursor Pro gives Grok *inside the editor only*; the running app needs its own key. Ask the SpaceXAI table for Grok credits. You need it by **Phase 2**.
- [ ] **Now:** open **Notability Pro** and do your planning there. Paste the project idea and sketch the screens. Take **2 or more screenshots** for Devpost (Notability prize).
- [ ] **During Phase 2:** take a screenshot of Cursor with a Grok model selected mid-build (SpaceXAI write-up).
- [ ] **Saturday:** visit the **Impiricus** table or workshop. Ask what they'd love to see and get a rep's name to mention at judging.
- [ ] **Sleep:** take a 3–4 hour nap at some point Saturday morning. A rested demo beats one more feature.
- [ ] **By 7:30 AM Sunday:** submit on Devpost (see the Phase 7 checklist). The deadline is 8 AM.

## Timeline

| Target | Phase |
|---|---|
| ~3:00 AM Sat | Phase 0: setup, contracts, mocks, runs in the browser |
| ~5:00 AM | Phase 1: real trial data |
| *sleep* | |
| ~12:00 PM | Phase 2: Grok extraction + ranking. **Minimum demo exists at this point.** |
| ~4:00 PM | Phase 3: full UI |
| ~7:00 PM | Phase 4: voice, handout, Grok Imagine |
| ~10:00 PM | Phase 5: Equity Lens + Sponsor Dashboard |
| **11:00 PM** | **Phase 6: demo cache + polish. FEATURE FREEZE.** |
| 3–5 AM Sun | Phase 7: video + Devpost |
| **7:30 AM** | **Submitted** |

If you fall behind, **cut in this order:** Grok Voice → Grok Imagine → Sponsor Dashboard → Equity Lens. Never cut Phases 0–3.

---

## What Refera is

**One line:** a voice-first clinical trial finder for doctors at rural and underserved clinics.

**Flow:**
1. The doctor speaks or types a de-identified patient note plus the clinic ZIP.
2. **Grok** extracts trial-relevant facts: condition, age, stage, prior treatments, biomarkers.
3. Refera searches **ClinicalTrials.gov** for recruiting trials within driving distance.
4. **Grok** ranks the trials by eligibility fit, with criterion-by-criterion reasons.
5. Refera reads a short summary aloud.
6. The doctor gets a printable **referral packet**. The patient gets a **handout** in their language with a **Grok Imagine** illustration.
7. **Equity Lens:** the clinic county's CDC Social Vulnerability Index and the distance to the nearest match.
8. **Sponsor Dashboard:** simulated referral stats. This is the "who pays" story.

**Why it matters:** patients at small or rural clinics are rarely offered trials because their doctors have no time to search. Trial sponsors struggle to recruit diverse patients. Refera turns a 30-minute search into 30 seconds.

**Prizes we're targeting (every feature maps to one):**
- **A Marina's Mission (Social Good track):** equitable trial access, shown by the Equity Lens.
- **Impiricus** (judged on HCP impact, originality, technical execution, commercial fit): a new *voice* channel with **no SMS**, doctors as trial referrers, real data, and the Sponsor Dashboard.
- **SpaceXAI:** built in Cursor, using Grok models, Grok Imagine and Grok Voice.
- **Notability:** screenshots of planning in Notability Pro.
- **Create-X:** a checkbox at submission.

**Out of scope:** logins, a database, storing any patient data, EHR integration.

---

## Rules for the AI (follow every phase)

1. **Don't change the Contracts section's types** once Phase 0 creates them. If a change is truly needed, stop and ask me.
2. **Mock mode must always work.** With `MOCK_AI=1` and `MOCK_DATA=1`, the whole app runs on fixtures with no network. Every function with a real implementation keeps its mock branch.
3. **Verify external APIs; don't guess.** Before coding against ClinicalTrials.gov or xAI, check the current docs or make a real test request. Never invent endpoints, fields, or model names.
4. **Never invent medical facts.** Only show real NCT IDs with links. Drop any trial the model returns that wasn't in the search results. A missing patient fact is "unclear", never "met".
5. **Privacy:** never store or log patient text or extracted criteria server-side. The UI says "De-identified input only. Nothing is stored."
6. **Secrets stay server-side.** The xAI key is only used in API routes and server code, never shipped to the browser.
7. **`npm run check` must pass** at the end of every phase. Commit after each phase with a clear message.
8. **Never break the demo.** If a real integration fails at runtime, fall back gracefully (to mock or cached data, or a hidden optional feature) rather than crashing.
9. Stay inside the current phase. Note ideas for later phases instead of building them.

---

## Contracts (create exactly this in Phase 0 as `lib/contracts.ts`)

```ts
// FROZEN after Phase 0. Ask before changing.

export interface MatchRequest {
  text: string;            // de-identified note or transcript
  zip?: string;            // clinic ZIP; may also be extracted from text
  radiusMiles?: number;
  patientLanguage?: string; // BCP-47, e.g. "en", "es"
}

export type Sex = "male" | "female" | "any";

export interface PatientCriteria {
  condition: string;
  conditionSynonyms: string[];
  age?: number;
  sex?: Sex;
  stage?: string;
  priorTreatments: string[];
  keyFindings: string[];   // biomarkers, ECOG, key labs, comorbidities
  zip?: string;
  radiusMiles: number;
  patientLanguage: string;
}

export interface TrialSite {
  facility: string; city: string; state: string; zip?: string;
  lat?: number; lon?: number; distanceMiles?: number;
  contactName?: string; contactPhone?: string; contactEmail?: string;
}

export interface Trial {
  nctId: string; title: string; phases: string[]; sponsor?: string;
  conditions: string[]; eligibilityText: string;
  minAge?: string; maxAge?: string; sex?: Sex;
  nearestSite?: TrialSite; sites: TrialSite[];  // closest first
  url: string;                                  // https://clinicaltrials.gov/study/<nctId>
}

export type CheckStatus = "met" | "unclear" | "not_met";
export interface CriterionCheck { criterion: string; status: CheckStatus; note: string; }

export type Verdict = "likely" | "possible" | "unlikely";
export interface RankedTrial {
  trial: Trial; score: number; /* 0-100 */ verdict: Verdict;
  summary: string; checks: CriterionCheck[];
}

export interface GeoPoint {
  zip: string; lat: number; lon: number;
  city?: string; state?: string; county?: string; countyFips?: string;
}

export interface EquitySnapshot {
  county: string; state: string;
  sviOverall?: number;       // 0-1, higher = more vulnerable
  sviLabel: string;
  nearestMatchMiles?: number;
  note: string;
  isIllustrative: boolean;   // true when from fixtures
}

export interface SponsorRegionStat { region: string; referrals: number; highSviShare: number; }
export interface SponsorStats { regions: SponsorRegionStat[]; totalReferrals: number; isIllustrative: true; }

export interface MatchResponse {
  criteria: PatientCriteria;
  results: RankedTrial[];    // best first, max 5
  searchedCount: number;
  readback: string;          // 2-4 sentences spoken aloud
  equity?: EquitySnapshot;
  mocked: { ai: boolean; data: boolean };
  timingsMs: Record<string, number>;
}

export interface HandoutRequest {
  ranked: RankedTrial; criteria: PatientCriteria;
  language: string; readingLevel?: number; withIllustration?: boolean;
}
export interface HandoutSection { heading: string; body: string; }
export interface Handout {
  title: string; language: string; sections: HandoutSection[];
  questionsToAsk: string[]; illustrationUrl?: string; disclaimer: string;
}

export interface ApiError { error: string; stage?: string; }
```

**Voice interface** (`lib/voice/index.ts`):
```ts
export interface VoiceEngine {
  isSupported(): boolean;
  startListening(h: { onPartial?: (t: string) => void; onFinal: (t: string) => void; onError?: (e: string) => void }, lang?: string): void;
  stopListening(): void;
  speak(text: string, lang?: string): Promise<void>;
  stopSpeaking(): void;
}
```

**API routes**
- `POST /api/match`: MatchRequest → MatchResponse | ApiError
- `POST /api/handout`: HandoutRequest → Handout | ApiError
- `GET /api/sponsor-stats`: SponsorStats

**Demo queries** (used for testing, the example chips, and the demo cache):
- **A (lung):** `58 year old man, stage III non-small cell lung cancer, EGFR negative, finished carboplatin and pemetrexed two months ago, ECOG 1. Clinic ZIP 31709. Patient prefers Spanish.`
- **B (diabetes):** `62 year old woman, type 2 diabetes, HbA1c 9.1 on metformin, BMI 34. ZIP 30303.`
- **C (breast):** `47 year old woman, stage II HER2-positive breast cancer, newly diagnosed, no treatment yet. ZIP 31401. Prefers English.`

---

## Phase 0: Setup, contracts, mocks

**Build:**
1. A Next.js 15 app (App Router) with TypeScript strict + Tailwind. Add `tsx` as a dev dependency. Scripts: `dev`, `build`, `typecheck` (`tsc --noEmit`), `check` (`tsc --noEmit && next build`).
2. `lib/contracts.ts`, exactly as in the Contracts section.
3. `lib/env.ts` exporting `env`:
   - `mockAi` (`MOCK_AI !== "0"`), `mockData` (`MOCK_DATA !== "0"`)
   - `xaiKey`, `xaiBaseUrl` (default `https://api.x.ai/v1`), `xaiTextModel`, `xaiImageModel`
   - `ctgovBaseUrl` (default `https://clinicaltrials.gov/api/v2`), `defaultRadiusMiles` (default 75)
   Plus `.env.example` listing these, with `MOCK_AI=1`, `MOCK_DATA=1`, and a comment that Cursor Pro does not provide an xAI API key. Copy it to `.env.local`. `.gitignore` must include `.env.local`.
4. `lib/mock/fixtures.ts` with realistic fake data typed by the contracts:
   - `DEMO_QUERIES` (A, B, C above)
   - `mockCriteria` for query A
   - `mockGeo` (Americus, GA, Sumter County, FIPS 13261, approximate lat/lon)
   - 3 `mockTrials` with IDs `DEMO-0001`..`DEMO-0003` and `url: "#demo"`. **Never use real-looking NCT IDs in mocks.**
   - `mockRanked` (one each of likely, possible, unlikely, with 2–4 checks)
   - `mockReadback`, `mockEquity` (isIllustrative true), `mockSponsorStats` (4 Georgia regions), and `mockHandout` in Spanish
5. Module stubs. Each function returns fixtures in mock mode and otherwise throws `"not implemented"`:
   - `lib/ai/extract.ts` → `extractCriteria(req)`
   - `lib/ai/rank.ts` → `rankTrials(criteria, trials)`
   - `lib/ai/readback.ts` → `writeReadback(criteria, ranked)`
   - `lib/ai/handout.ts` → `generateHandout(req)`
   - `lib/data/geo.ts` → `geocodeZip(zip)`
   - `lib/data/trials.ts` → `searchTrials(criteria, geo)`
   - `lib/data/equity.ts` → `getEquitySnapshot(geo, nearestMatchMiles?)`
   - `lib/data/sponsor.ts` → `getSponsorStats()`
6. API routes:
   - `/api/match` pipeline: extract → geocode(criteria.zip) → search → rank → readback → equity(geo, results[0]?.trial.nearestSite?.distanceMiles). It records `timingsMs` per stage and returns `ApiError {stage}` on failure.
   - `/api/handout` and `/api/sponsor-stats`.
7. A placeholder `app/page.tsx`: textarea prefilled with query A, a ZIP input, and a button that POSTs `/api/match` and shows the raw JSON.
8. A `README.md` covering what Refera is and how to run it.
9. `git init` and commit.

**Done when:** `npm run check` passes. With `npm run dev`, the placeholder page returns mock JSON from `/api/match`.

---

## Phase 1: Real trial data (ClinicalTrials.gov + geocoding)

**Build:**
1. **Verify the API first.** Make one real request:
   `GET {ctgovBaseUrl}/studies?query.cond=lung+cancer&filter.overallStatus=RECRUITING&filter.geo=distance(32.07,-84.23,75mi)&pageSize=5`
   Save it to `data/sample-ctgov.json` and map fields from the *actual* structure. Check the docs for the `fields` parameter to trim the payload.
2. `geocodeZip(zip)`: use **bundled static data in `data/`**, with no runtime geocoding API.
   - Use the Census ZCTA Gazetteer for lat/lon, plus a ZIP→county-FIPS crosswalk (Census ZCTA-to-county relationship file).
   - Trim it to Georgia plus a few ZIPs from other states, stored as compact JSON keyed by ZIP.
   - Return null for unknown ZIPs.
3. `searchTrials(criteria, geo)`:
   - Query parameters: `query.cond` = condition (OR-joined synonyms), `filter.overallStatus=RECRUITING`, `filter.geo=distance(lat,lon,Rmi)`, pageSize 30.
   - Map each result to `Trial`, normalizing sex (ALL→"any") and setting `url` to the study page.
   - Sites: keep recruiting sites only (if that field exists), computing haversine `distanceMiles`. Keep those within the radius, closest first, max 5 per trial, and set `nearestSite`.
   - Drop trials with no site in range. Sort trials by nearest distance.
   - 10s timeout. On 0 results, retry once with just the main condition. With null geo, search without the geo filter.
4. `/api/match` hardening:
   - Validate the body: text 10–4000 chars, radius clamped to 10–300. Return 400 on bad input.
   - If geocoding fails, continue without geo rather than failing.
   - Never log the request text.
5. `scripts/test-data.ts`: geocode 31709, 30303 and 31401; search all 3 demo conditions; print counts, the nearest 3 trials with distances.

**Done when:** with `MOCK_DATA=0 MOCK_AI=1`, `/api/match` returns **real** recruiting trials near 31709 with sensible distances. `npm run check` passes.

---

## Phase 2: Grok extraction + ranking

*Needs `XAI_API_KEY`, `XAI_TEXT_MODEL` in `.env.local`. Look up current model names in the xAI docs.*

**Build:**
1. `lib/ai/grok.ts`: `grokJson<T>({ system, user, temperature? })`.
   - xAI is OpenAI-compatible: `POST {xaiBaseUrl}/chat/completions` with a Bearer key. Use JSON output mode (check the docs for the current syntax).
   - If the model wraps JSON in prose, extract the outermost `{…}`.
   - 20s timeout, one retry on 5xx or timeout, and a clear error message.
2. `extractCriteria(req)`:
   - The system prompt extracts **only stated** trial-relevant facts from a de-identified note. Unknown = null or [], and it never invents facts.
   - `condition` is the plain clinical term; `conditionSynonyms` are common search terms.
   - Normalize to the contract (arrays default to [], sex defaults to "any").
   - `req.zip` and `req.patientLanguage` override extracted values. The radius defaults to `env.defaultRadiusMiles`.
3. `rankTrials(criteria, trials)`:
   - With more than 20 trials, pre-filter to 20 by keyword overlap.
   - Make ONE call with the criteria plus each trial's nctId, title, eligibilityText (≤3000 chars), ages and sex.
   - The model returns per trial: score 0–100, verdict, a 1–2 sentence summary for the doctor, and 3–6 decisive checks.
   - Be conservative: a missing fact is "unclear".
   - **Hallucination guard:** drop results whose nctId isn't in the input, and attach the original `Trial` object.
   - Clamp scores, sort descending, max 5. Empty input returns [] without calling Grok.
4. `writeReadback(criteria, ranked)`:
   - A deterministic template of 2–4 spoken sentences: the count, the best match + city + distance, and what to confirm (from "unclear" checks).
   - With 0 results, suggest a wider radius.
5. `scripts/test-ai.ts`: run all 3 demo queries through extract → search → rank → readback against real APIs and print the results.

**Done when:** with `MOCK_AI=0 MOCK_DATA=0`, all 3 demo queries return real, sensibly ranked trials with reasons. `npm run check` passes. **This is the minimum viable demo.**

---

## Phase 3: Full UI

**Design direction:**
- Calm, clinical and trustworthy: off-white background, deep teal primary, one restrained accent, generous spacing, Inter via `next/font`.
- Verdict colors: likely = green, possible = amber, unlikely = gray. **Always pair color with a text label or icon.**
- Accessible contrast, visible focus states, keyboard usable, responsive down to 375px.
- No stock photos. Simple inline SVG icons. Render all text safely, with no `dangerouslySetInnerHTML`.

**Build:**
1. **Shell:**
   - Header with the "Refera" wordmark, the tagline "Clinical trials for every clinic", and a link to `/sponsor`.
   - Footer with the privacy line.
   - A small "Demo data" badge when `mocked.ai` or `mocked.data` is true.
2. **Query panel:**
   - A textarea, a ZIP input, a radius select (25/50/75/150, default 75), and a patient language select (English, Spanish, Vietnamese, Korean, Chinese, Haitian Creole as BCP-47 codes).
   - A "Find trials" button.
   - "Try an example" chips for demo queries A, B and C.
   - Leave a spot for the mic button (Phase 4).
3. **Loading:** a stepped indicator ("Understanding note → Searching trials → Checking eligibility") advancing on a timer.
   **Errors:** a friendly card showing `stage`, with a Retry button.
4. **Results:**
   - "What we heard" chips from the extracted criteria.
   - A readback banner with the text.
   - A `TrialCard` per result:
     - Verdict badge + score, title, phase, sponsor.
     - Nearest site city + distance, and the summary.
     - An expandable checklist (✓ met / ? unclear / ✗ not met, with notes).
     - The NCT ID linking to `url` in a new tab. For `#demo` URLs, show "Demo trial" instead.
     - Contact info.
     - "Referral packet" and "Patient handout" buttons (the handout is wired up in Phase 4).
   - An empty state for 0 results, and a footnote "Searched N trials in X.Xs".
5. **Referral packet:**
   - A modal with a one-page print layout: header and date, trial + NCT ID + URL, nearest site + contact.
   - A confirm-criteria checklist with checkboxes, a "Patient facts (de-identified)" section, and a clinician name/signature line.
   - "Print / Save PDF" uses `window.print()`, with `@media print` CSS that prints only the packet.

**Done when:** in mock mode, the full visual flow works (example chip → results → packet prints). With mocks off, it works on real data. `npm run check` passes.

---

## Phase 4: Voice, patient handout, Grok Imagine

**Build:**
1. **Browser voice** (`lib/voice/browser.ts`, implementing `VoiceEngine`):
   - The Web Speech API (`SpeechRecognition`/`webkitSpeechRecognition` with interim results) plus `speechSynthesis`, picking a natural voice for the language.
   - Provide `getVoiceEngine()` in `lib/voice/index.ts` and a `useVoice()` hook exposing state, the live transcript, and errors.
   - If unsupported (e.g. Firefox), hide the mic; typing still works.
2. **Mic in the UI:**
   - A big round press-to-talk button that pulses while listening, streaming the transcript into the textarea.
   - Auto-submit when capture ends, with a 1s cancel window.
   - The readback is spoken once automatically, with mute, stop and replay controls.
3. **Handout backend** (`generateHandout` + `/api/handout`):
   - Written in the requested language at a grade 6 reading level by default. Warm and jargon-free. It never promises benefit and says participation is voluntary.
   - Returns: title, 3–5 sections (what a trial is, why your doctor mentioned this one, where and how often, cost questions), 3–5 questions to ask, and a disclaimer.
   - Also returns an English `illustrationPrompt`: a friendly flat illustration with no text, needles or blood.
4. **Grok Imagine** (`lib/ai/illustrate.ts`):
   - Check the xAI docs for the image endpoint, the model (`XAI_IMAGE_MODEL`), and the response shape.
   - Return a URL or data URL. On **any** failure return undefined, never throw.
   - Only called when `withIllustration` is set.
5. **Handout UI:**
   - A modal that POSTs `/api/handout` with the patient's language and `withIllustration: true`.
   - Shows a skeleton while loading, then the illustration, sections, questions and disclaimer.
   - A language switcher (regenerates), "Read aloud" in that language, and printing like the packet.
6. **Stretch: Grok Voice. Hard limit of 1 hour.**
   - Check the xAI docs for the voice API and implement `lib/voice/grok.ts` against `VoiceEngine`.
   - Any key or token minting goes through a server route under `app/api/voice/`; the key never reaches the browser.
   - Switch engines with `NEXT_PUBLIC_VOICE_ENGINE=grok|browser`, with the browser engine as the fallback.
   - If it isn't working within an hour, stop, remove any half-built pieces, and report back.

**Done when:** the mic works in Chrome. The readback is spoken. The Spanish handout for demo query A renders with an illustration (or gracefully without one). `npm run check` passes.

---

## Phase 5: Equity Lens + Sponsor Dashboard

**Build:**
1. **`getEquitySnapshot`:**
   - Bundle the CDC/ATSDR SVI **county** CSV (most recent release) into `data/`. Georgia rows only, trimmed to FIPS, county, state and `RPL_THEMES`.
   - Look up by `countyFips`, treating -999 as missing.
   - Labels: ≥0.75 "High vulnerability (top 25% nationally)", ≥0.5 "Moderate–high vulnerability", otherwise "Lower vulnerability".
   - `note` is one plain sentence combining vulnerability and distance.
   - `isIllustrative` is false with real data. Fall back to the fixture if the lookup fails.
2. **Equity Lens card** next to the results:
   - County + state, SVI as a 0–100 percentile meter with its label, the distance to the nearest match, and the note.
   - An "Illustrative data" tag when applicable.
3. **`getSponsorStats`:**
   - Simulated but plausible and **deterministic** (seeded).
   - 5–6 Georgia regions with 20–150 referrals each. `highSviShare` should be higher for rural regions. Always `isIllustrative: true`.
4. **`/sponsor` page:**
   - Stat tiles: total referrals, % from high-vulnerability counties, regions covered.
   - Horizontal bars of referrals by region with the high-SVI share shown inside each bar, in pure CSS/SVG.
   - A prominent **"Simulated data for demonstration"** label.
   - The line: "Sponsors pay per qualified referral from clinics they can't otherwise reach."

**Done when:** demo query A shows a real SVI for Sumter County, and the sponsor page renders. `npm run check` passes.

---

## Phase 6: Demo insurance + polish (then FEATURE FREEZE)

**Build:**
1. **Demo cache:**
   - `scripts/build-demo-cache.ts` runs the **real** pipeline on queries A, B and C and saves full `MatchResponse`s plus the query A Spanish handout to `data/demo-cache/`.
   - In `/api/match` and `/api/handout`: when the request has the header `x-refera-demo: 1` and the input matches a cached query, serve the cache.
   - A subtle "Demo mode" toggle in the UI sends that header. It's insurance against the expo Wi-Fi.
2. **Polish:**
   - Page title and meta description, and a favicon (a simple teal path/marker mark).
   - No console errors, and a Lighthouse accessibility score of 90 or higher.
   - Check the layout at 375px and 1440px.
3. **Deploy to Vercel:**
   - Give me the exact steps, including which env vars to set there.
   - Set `MOCK_AI=0` and `MOCK_DATA=0` in production.
4. **README:** a project description, how it works, the tech stack, data sources with years, and how to run it.

**Done when:** all 3 demo queries work on the deployed URL, both live and in demo mode. `npm run check` passes. **Stop adding features after this.**

---

## Phase 7: Submission prep (Devpost + video)

Ask the AI to draft these, then edit them yourself:
```
Re-read SPEC.md and the codebase. Draft our Devpost write-up in markdown (Inspiration, What it does, How we built it, Challenges, Accomplishments, What we learned, What's next). Include explicit sections for each prize we're entering: Impiricus (address HCP impact, originality, technical execution, commercial fit by name; state that it uses no SMS), SpaceXAI (list exactly which Grok models/products and Cursor were used — only claim what the code actually uses), A Marina's Mission, and Notability. List data sources with years. Keep it honest: simulated sponsor data must be labeled simulated.
```

**Devpost checklist**
- [ ] Track: **A Marina's Mission**
- [ ] Challenges: **Impiricus, SpaceXAI, Notability**
- [ ] **Notability:** add the tag, a short note on how you used it, and 2+ screenshots
- [ ] **SpaceXAI:** a Cursor screenshot, with the Grok products used named in the write-up
- [ ] **Create-X:** tick the interest box
- [ ] A 2–3 min demo video (record with demo mode ON)
- [ ] Links to the public GitHub repo and the deployed site
- [ ] **Submit by 7:30 AM**

**Demo script (about 2 min)**
1. **Hook, 15s:** "A doctor in Americus, Georgia has a lung cancer patient out of standard options, and no time to search for trials."
2. **Live voice query, 45s:** results appear, and Refera reads back the top match.
3. **Outputs, 30s:** the referral packet, then the Spanish handout with its illustration.
4. **Equity Lens + Sponsor Dashboard, 20s:** why it matters, and who pays.
5. **Close, 10s:** "Refera turns every underserved clinic into a trial on-ramp."

**At the expo:** turn demo mode on. Lead with the patient story, not the tech. Tell Impiricus judges the commercial model in one sentence. Mention the Impiricus rep you met.

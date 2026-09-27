# Refera

Refera is a voice-first clinical trial finder for doctors at rural and underserved clinics. A doctor speaks or types a de-identified note and a clinic ZIP. Refera pulls recruiting studies from ClinicalTrials.gov within driving distance, checks them against the note, and reads back the closest match. The doctor can print a referral packet. The patient can get a short handout in their language.

Nothing about the patient is stored. There is no login and no database.

## How it works

1. The note is turned into trial-relevant facts: condition, age, stage, prior treatments, and biomarkers. Missing facts stay missing.
2. The clinic ZIP is looked up in bundled Census data. No live geocoding service is called.
3. ClinicalTrials.gov is searched for recruiting studies near that point.
4. The studies are ranked with reasons. Any trial id that was not in the search results is dropped.
5. A short readback is spoken aloud.
6. The referral packet and the patient handout can be printed. The handout illustration is optional and is skipped if image generation fails.
7. Equity Lens shows the clinic county's CDC Social Vulnerability Index and the distance to the nearest match.
8. The sponsor page shows simulated referral numbers. Those numbers are not real clinic activity.

## Tech stack

- Next.js 15 (App Router) and TypeScript
- Tailwind CSS
- ClinicalTrials.gov API v2
- xAI API, OpenAI-compatible: `grok-4.6` for extraction, ranking, and handouts; `grok-imagine-image-2.0` for the handout illustration
- Grok text-to-speech (`POST /v1/tts`, voice `rex`) speaks the readback and the handout when `XAI_API_KEY` is set. Hold to talk sends the recording to Grok speech-to-text (`POST /v1/stt`). The recording is not stored. If the key is missing or either call fails, the browser voice speaks and the browser speech engine transcribes instead.

`NEXT_PUBLIC_VOICE_ENGINE=browser` keeps both listening and speaking in the browser.

## Data sources

- **ClinicalTrials.gov API v2**, live recruiting studies. A sample response is in `data/sample-ctgov.json` (lung cancer, recruiting, 75 miles from 32.07, -84.23, page size 5).
- **U.S. Census Bureau 2024 Gazetteer**, ZCTA internal points for latitude and longitude.
- **U.S. Census Bureau 2020 ZCTA-to-county relationship file**, primary county by land area. The bundled file is Georgia plus a few ZIPs outside Georgia (`data/zips.json`).
- **CDC/ATSDR Social Vulnerability Index 2022**, U.S. county ranking, Georgia rows only (`data/svi-ga-2022.csv`). The overall rank is `RPL_THEMES`. A value of -999 is treated as missing. Sumter County, Georgia (FIPS 13261) is 0.9631 in this file.

Sponsor dashboard figures are simulated and labeled as simulated.

## Run it

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`MOCK_AI=1` and `MOCK_DATA=1` are the defaults, so the app runs with fixtures and no network. Cursor Pro does not provide an xAI API key. The running app needs its own key from [console.x.ai](https://console.x.ai).

Live data, still with fixture ranking:

```bash
MOCK_DATA=0 MOCK_AI=1 npm run dev
```

Live data and live Grok:

```bash
MOCK_DATA=0 MOCK_AI=0 npm run dev
```

Set `XAI_API_KEY` in `.env.local` first. The key is only used in server code.

Checks:

```bash
npm run check
MOCK_DATA=0 npx tsx scripts/test-data.ts
MOCK_AI=0 MOCK_DATA=0 npx tsx scripts/test-ai.ts
```

`scripts/test-data.ts` forces real geocoding and ClinicalTrials.gov. `scripts/test-ai.ts` also calls Grok and exits if the key is missing.

## Demo mode

Demo mode is the checkbox in the header. It sends `x-refera-demo: 1`. If the note matches one of the three saved examples and `data/demo-cache/` has been built, the API replays that saved response instead of calling the network.

Build the cache once, with a key and the network:

```bash
npx tsx scripts/build-demo-cache.ts
```

That writes match results for the three examples and a Spanish handout for the lung example.

## Deploy on Vercel

1. Push the repository to GitHub.
2. Import the project at [vercel.com/new](https://vercel.com/new). Framework preset: Next.js. Do not override the build command (`next build`).
3. Before the first deploy, set these environment variables. Then redeploy if you add them later, because Next.js reads them on the server at runtime and also during the build.

| Name | Production value |
|---|---|
| `MOCK_AI` | `0` |
| `MOCK_DATA` | `0` |
| `XAI_API_KEY` | your xAI key |
| `XAI_BASE_URL` | `https://api.x.ai/v1` |
| `XAI_TEXT_MODEL` | `grok-4.6` |
| `XAI_IMAGE_MODEL` | `grok-imagine-image-2.0` |
| `CTGOV_BASE_URL` | `https://clinicaltrials.gov/api/v2` |
| `DEFAULT_RADIUS_MILES` | `75` |
| `NEXT_PUBLIC_VOICE_ENGINE` | `grok` |
| `XAI_VOICE_ID` | `rex` |

4. Optional, and worth doing before the expo: run `npx tsx scripts/build-demo-cache.ts` locally and commit `data/demo-cache/*.json`. Demo mode on the deployed site only works if those files are in the deployment.
5. Open the deployed URL. Run the three example chips with Demo mode off, then again with Demo mode on.

## Privacy

The interface says: De-identified input only. Nothing is stored. Do not type names, addresses, phone numbers, or medical record numbers. The server does not write the note to a database or to the log.

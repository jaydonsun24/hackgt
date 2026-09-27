# Refera

Clinical trial matching for rural clinics. A doctor types or dictates a de-identified note and the clinic ZIP. Refera searches ClinicalTrials.gov for recruiting studies within driving distance, checks each one against the note, and reads back the best match. From there you can print a referral packet or a patient handout in the patient's language.

No login and no database. Notes aren't stored.

Built at HackGT 2026 with Next.js 15, Tailwind, anime.js, and xAI Grok.

## Running it

```bash
npm install
npm run dev
```

It runs on fixtures by default, so you don't need keys or network. To use real services, copy `.env.example` to `.env.local` and change:

- `MOCK_DATA=0` searches ClinicalTrials.gov live (free).
- `MOCK_AI=0` uses Grok for note extraction, ranking, and handouts. Needs `XAI_API_KEY`.
- `NEXT_PUBLIC_VOICE_ENGINE=browser` keeps speech in the browser instead of Grok text-to-speech and speech-to-text.

With `MOCK_AI=1`, notes that aren't one of the samples go through a rule-based parser instead of Grok.

Demo mode (the checkbox in the header) replays saved responses for the three sample notes, for when the Wi-Fi is bad. Build the cache once with a key: `npx tsx scripts/build-demo-cache.ts`, then commit `data/demo-cache/`.

`npm run check` runs the type check and a production build.

## Data

- ClinicalTrials.gov API v2
- Census 2024 Gazetteer and the 2020 ZCTA-to-county file, bundled in `data/zips.json` (Georgia, Vienna VA, and a few other ZIPs)
- CDC/ATSDR Social Vulnerability Index 2022, Georgia counties plus Fairfax County, VA, in `data/svi-2022.csv`

The sponsor dashboard numbers are simulated.

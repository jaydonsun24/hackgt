# Refera — Devpost draft

Edit this before you submit. Do not claim Grok Voice. It is not in the build.

## Inspiration

Patients at small and rural clinics are rarely offered a clinical trial. Their doctors do not have half an hour to search. Sponsors, at the same time, struggle to recruit outside large academic centers. Refera is a 30-second path from a de-identified note to a nearby recruiting study.

## What it does

A doctor speaks or types a de-identified note plus a clinic ZIP. Refera extracts only the facts that were stated, searches ClinicalTrials.gov for recruiting studies within driving distance, and ranks them with a checklist. It reads a short summary aloud. The doctor can print a referral packet. The patient can get a plain-language handout, including Spanish for the lung example, with an illustration when image generation is available.

Equity Lens shows the county's CDC Social Vulnerability Index and how far the nearest match is. The sponsor page shows **simulated** referral volume and makes the payment story explicit: sponsors pay per qualified referral from clinics they can't otherwise reach.

There is no SMS, no login, and no stored patient note.

## How we built it

Next.js 15 and TypeScript in Cursor. Trial search uses the ClinicalTrials.gov API v2. ZIP coordinates and county FIPS come from the Census Bureau 2024 Gazetteer and the 2020 ZCTA-to-county relationship file, bundled so the app does not call a geocoder at runtime. County vulnerability is the CDC/ATSDR Social Vulnerability Index 2022 (`RPL_THEMES`), Georgia counties only.

Text steps call the xAI chat completions API (`https://api.x.ai/v1/chat/completions`) with model `grok-4.6` and JSON output: extraction, ranking, and the patient handout. The illustration calls `https://api.x.ai/v1/images/generations` with model `grok-imagine-image-2.0`. If that call fails, the handout still renders.

The microphone and the spoken readback use the browser Web Speech API. `MOCK_AI=1` and `MOCK_DATA=1` run the whole app on fixtures. Demo mode replays a saved response when the expo network is bad.

## Challenges

Clinical trial eligibility is easy to overstate. The ranker is instructed that a missing fact is unclear, never met, and any trial id the model returns that was not in the search results is discarded. Mock trials use `DEMO-` ids, never real-looking NCT ids.

Public listings are long, sites drop in and out of recruiting, and a rural ZIP can be an hour from the nearest open site. The Equity Lens is there so that distance is part of the answer, not a footnote.

## Accomplishments that we're proud of

A doctor in Americus can go from a lung-cancer note to a ranked list, a printable referral packet, and a Spanish handout without an EHR integration. The same flow runs offline on fixtures, which makes the demo survivable on bad Wi-Fi.

## What we learned

The useful product is not a longer search page. It is a short, spoken answer plus a packet the next person can act on. Social vulnerability only matters if it sits next to a real mile count.

## What's next

A coordinator workflow, site-confirmed eligibility, and coverage of more states in the bundled ZIP file. Not in this build: accounts, a database, EHR write-back, SMS, or Grok Voice.

## Prizes

### Impiricus

- **HCP impact:** the user is the doctor. The output is a referral packet and a patient handout, not a consumer search result.
- **Originality:** a voice-first trial finder with no SMS. The doctor dictates a de-identified note and gets a spoken readback.
- **Technical execution:** live ClinicalTrials.gov recruiting studies, Census geography, CDC SVI, and Grok ranking with a hallucination check on trial ids.
- **Commercial fit:** sponsors pay per qualified referral from clinics they can't otherwise reach. The sponsor dashboard is simulated and labeled simulated.
- Refera does **not** use SMS.

### SpaceXAI

Built in Cursor. The running app calls:

- `grok-4.6` through the xAI chat completions API for extraction, ranking, and handouts
- `grok-imagine-image-2.0` through the xAI image generations API for the handout illustration

The microphone and readback use the browser Web Speech API. Grok Voice is not used.

### A Marina's Mission

The point of the product is trial access outside large centers. Equity Lens shows the clinic county on the CDC/ATSDR Social Vulnerability Index 2022 and the miles to the nearest recruiting match. For the Americus example that county is Sumter County, Georgia.

### Notability

Planning was done in Notability Pro. Add the Notability tag, a short note on how you used it, and at least two screenshots on Devpost. Those screenshots are not in the repo.

### Create-X

Tick the interest box at submission.

## Data sources

- ClinicalTrials.gov API v2 (live)
- U.S. Census Bureau, 2024 Gazetteer, ZCTA national file
- U.S. Census Bureau, 2020 ZCTA-to-county relationship file
- CDC/ATSDR Social Vulnerability Index 2022, U.S. county file, Georgia rows, field `RPL_THEMES`

## Demo script

1. A doctor in Americus, Georgia has a lung cancer patient out of standard options, and no time to search for trials.
2. Speak or paste the lung example. Results appear, and Refera reads back the top match.
3. Open the referral packet, then the Spanish handout.
4. Show Equity Lens, then the sponsor dashboard: why it matters, and who pays.
5. Refera turns every underserved clinic into a trial on-ramp.

Turn Demo mode on at the expo.

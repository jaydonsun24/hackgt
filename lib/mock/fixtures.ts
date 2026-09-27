import type {
  EquitySnapshot,
  GeoPoint,
  Handout,
  PatientCriteria,
  RankedTrial,
  SponsorStats,
  Trial,
  TrialSite,
} from "../contracts";
import { DEMO_QUERIES } from "../demo/queries";

export { DEMO_QUERIES };

const illustrationSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360">
  <rect width="640" height="360" fill="#f4f1ea"/>
  <circle cx="530" cy="78" r="34" fill="#e7c27a"/>
  <rect x="64" y="168" width="210" height="128" rx="18" fill="#0e4d56"/>
  <rect x="92" y="196" width="48" height="36" rx="6" fill="#f4f1ea"/>
  <rect x="156" y="196" width="48" height="36" rx="6" fill="#f4f1ea"/>
  <rect x="124" y="248" width="40" height="48" rx="6" fill="#d7efe8"/>
  <circle cx="390" cy="214" r="26" fill="#d08a5a"/>
  <rect x="364" y="244" width="52" height="68" rx="22" fill="#0e4d56"/>
  <circle cx="470" cy="220" r="26" fill="#c4a484"/>
  <rect x="444" y="250" width="52" height="62" rx="22" fill="#1f6f78"/>
  <path d="M48 300c80-28 150-28 230 0" fill="none" stroke="#c4b49a" stroke-width="8" stroke-linecap="round"/>
</svg>`;

export const mockIllustrationUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(illustrationSvg)}`;

export const mockGeo: GeoPoint = {
  zip: "31709",
  lat: 32.046416,
  lon: -84.149578,
  city: "Americus",
  state: "GA",
  county: "Sumter",
  countyFips: "13261",
};

export const mockGeoAtlanta: GeoPoint = {
  zip: "30303",
  lat: 33.752845,
  lon: -84.390226,
  city: "Atlanta",
  state: "GA",
  county: "Fulton",
  countyFips: "13121",
};

export const mockGeoSavannah: GeoPoint = {
  zip: "31401",
  lat: 32.068296,
  lon: -81.092835,
  city: "Savannah",
  state: "GA",
  county: "Chatham",
  countyFips: "13051",
};

export const mockCriteria: PatientCriteria = {
  condition: "non-small cell lung cancer",
  conditionSynonyms: ["NSCLC", "lung cancer"],
  age: 58,
  sex: "male",
  stage: "III",
  priorTreatments: ["carboplatin", "pemetrexed"],
  keyFindings: ["EGFR negative", "ECOG 1"],
  zip: "31709",
  radiusMiles: 75,
  patientLanguage: "es",
};

export const mockCriteriaDiabetes: PatientCriteria = {
  condition: "type 2 diabetes",
  conditionSynonyms: ["type 2 diabetes mellitus", "T2DM"],
  age: 62,
  sex: "female",
  priorTreatments: ["metformin"],
  keyFindings: ["HbA1c 9.1", "BMI 34"],
  zip: "30303",
  radiusMiles: 75,
  patientLanguage: "en",
};

export const mockCriteriaBreast: PatientCriteria = {
  condition: "HER2-positive breast cancer",
  conditionSynonyms: ["breast cancer", "HER2 positive breast cancer"],
  age: 47,
  sex: "female",
  stage: "II",
  priorTreatments: [],
  keyFindings: ["HER2-positive", "newly diagnosed"],
  zip: "31401",
  radiusMiles: 75,
  patientLanguage: "en",
};

function site(partial: TrialSite): TrialSite {
  return partial;
}

export const mockTrials: Trial[] = [
  {
    nctId: "DEMO-0001",
    title: "Demo study of a stage III non-small cell lung cancer regimen after platinum chemotherapy",
    phases: ["Phase 2"],
    sponsor: "Refera Demo Sponsor",
    conditions: ["Non-small cell lung cancer", "Stage III lung cancer"],
    eligibilityText:
      "Inclusion: adults 18 years or older with stage III non-small cell lung cancer, ECOG 0 or 1, EGFR any status. Prior carboplatin or pemetrexed is allowed. Exclusion: a required washout after chemotherapy is confirmed by the site.",
    minAge: "18 Years",
    sex: "any",
    url: "#demo",
    nearestSite: site({
      facility: "Refera Demo Cancer Center",
      city: "Albany",
      state: "GA",
      zip: "31701",
      lat: 31.578507,
      lon: -84.155741,
      distanceMiles: 32.3,
      contactName: "Demo Study Coordinator",
      contactPhone: "(229) 555-0148",
      contactEmail: "coordinator@demo.refera.local",
    }),
    sites: [
      site({
        facility: "Refera Demo Cancer Center",
        city: "Albany",
        state: "GA",
        zip: "31701",
        lat: 31.578507,
        lon: -84.155741,
        distanceMiles: 32.3,
        contactName: "Demo Study Coordinator",
        contactPhone: "(229) 555-0148",
        contactEmail: "coordinator@demo.refera.local",
      }),
    ],
  },
  {
    nctId: "DEMO-0002",
    title: "Demo immunotherapy study for previously treated lung cancer",
    phases: ["Phase 3"],
    sponsor: "Demo Coastal Research",
    conditions: ["Lung cancer", "Non-small cell lung cancer"],
    eligibilityText:
      "Inclusion: adults with non-small cell lung cancer. Measurable disease and a fresh biopsy may be required. Biomarker rules are listed only in the full protocol.",
    minAge: "18 Years",
    maxAge: "80 Years",
    sex: "any",
    url: "#demo",
    nearestSite: site({
      facility: "Demo Regional Research Site",
      city: "Macon",
      state: "GA",
      zip: "31201",
      lat: 32.840695,
      lon: -83.632402,
      distanceMiles: 62.6,
      contactName: "Alex Morgan",
      contactPhone: "(478) 555-0194",
      contactEmail: "research@demo.refera.local",
    }),
    sites: [
      site({
        facility: "Demo Regional Research Site",
        city: "Macon",
        state: "GA",
        zip: "31201",
        lat: 32.840695,
        lon: -83.632402,
        distanceMiles: 62.6,
        contactName: "Alex Morgan",
        contactPhone: "(478) 555-0194",
        contactEmail: "research@demo.refera.local",
      }),
    ],
  },
  {
    nctId: "DEMO-0003",
    title: "Demo study limited to EGFR-positive metastatic lung cancer",
    phases: ["Phase 2"],
    sponsor: "Demo Metro Trials",
    conditions: ["EGFR-positive non-small cell lung cancer"],
    eligibilityText:
      "Inclusion: stage IV non-small cell lung cancer with a documented EGFR mutation, ECOG 0 only. Exclusion: EGFR negative or unknown. Prior platinum chemotherapy is not allowed.",
    minAge: "18 Years",
    sex: "any",
    url: "#demo",
    nearestSite: site({
      facility: "Demo Columbus Trial Clinic",
      city: "Columbus",
      state: "GA",
      zip: "31901",
      lat: 32.460976,
      lon: -84.987709,
      distanceMiles: 56.7,
      contactName: "Jordan Lee",
      contactPhone: "(706) 555-0116",
      contactEmail: "columbus@demo.refera.local",
    }),
    sites: [
      site({
        facility: "Demo Columbus Trial Clinic",
        city: "Columbus",
        state: "GA",
        zip: "31901",
        lat: 32.460976,
        lon: -84.987709,
        distanceMiles: 56.7,
        contactName: "Jordan Lee",
        contactPhone: "(706) 555-0116",
        contactEmail: "columbus@demo.refera.local",
      }),
    ],
  },
];

export const mockTrialsDiabetes: Trial[] = [
  {
    nctId: "DEMO-1001",
    title: "Demo study of additional therapy for type 2 diabetes on metformin",
    phases: ["Phase 3"],
    sponsor: "Refera Demo Sponsor",
    conditions: ["Type 2 diabetes mellitus"],
    eligibilityText:
      "Inclusion: adults with type 2 diabetes, HbA1c above 7.5, already taking metformin. BMI is recorded but a cutoff is not fully stated in this excerpt.",
    minAge: "18 Years",
    maxAge: "75 Years",
    sex: "any",
    url: "#demo",
    nearestSite: site({
      facility: "Demo Atlanta Metabolic Clinic",
      city: "Atlanta",
      state: "GA",
      zip: "30303",
      lat: 33.752845,
      lon: -84.390226,
      distanceMiles: 0.4,
      contactName: "Demo Coordinator",
      contactPhone: "(404) 555-0172",
      contactEmail: "atlanta@demo.refera.local",
    }),
    sites: [
      site({
        facility: "Demo Atlanta Metabolic Clinic",
        city: "Atlanta",
        state: "GA",
        zip: "30303",
        lat: 33.752845,
        lon: -84.390226,
        distanceMiles: 0.4,
        contactName: "Demo Coordinator",
        contactPhone: "(404) 555-0172",
        contactEmail: "atlanta@demo.refera.local",
      }),
    ],
  },
  {
    nctId: "DEMO-1002",
    title: "Demo lifestyle-plus-medicine study for type 2 diabetes",
    phases: ["Phase 2"],
    sponsor: "Demo Piedmont Research",
    conditions: ["Type 2 diabetes"],
    eligibilityText: "Inclusion: type 2 diabetes. Insulin use and recent HbA1c rules are only partly described here.",
    minAge: "40 Years",
    sex: "any",
    url: "#demo",
    nearestSite: site({
      facility: "Demo Decatur Research Office",
      city: "Decatur",
      state: "GA",
      zip: "30030",
      lat: 33.7748,
      lon: -84.2963,
      distanceMiles: 6.2,
      contactName: "Sam Patel",
      contactPhone: "(404) 555-0133",
      contactEmail: "decatur@demo.refera.local",
    }),
    sites: [
      site({
        facility: "Demo Decatur Research Office",
        city: "Decatur",
        state: "GA",
        zip: "30030",
        lat: 33.7748,
        lon: -84.2963,
        distanceMiles: 6.2,
        contactName: "Sam Patel",
        contactPhone: "(404) 555-0133",
        contactEmail: "decatur@demo.refera.local",
      }),
    ],
  },
];

export const mockTrialsBreast: Trial[] = [
  {
    nctId: "DEMO-2001",
    title: "Demo study for newly diagnosed stage II HER2-positive breast cancer",
    phases: ["Phase 3"],
    sponsor: "Refera Demo Sponsor",
    conditions: ["HER2-positive breast cancer"],
    eligibilityText:
      "Inclusion: adults with stage II HER2-positive breast cancer and no prior systemic therapy for this cancer. Heart function must be confirmed by the site.",
    minAge: "18 Years",
    sex: "any",
    url: "#demo",
    nearestSite: site({
      facility: "Demo Savannah Oncology Clinic",
      city: "Savannah",
      state: "GA",
      zip: "31401",
      lat: 32.068296,
      lon: -81.092835,
      distanceMiles: 1.2,
      contactName: "Demo Coordinator",
      contactPhone: "(912) 555-0188",
      contactEmail: "savannah@demo.refera.local",
    }),
    sites: [
      site({
        facility: "Demo Savannah Oncology Clinic",
        city: "Savannah",
        state: "GA",
        zip: "31401",
        lat: 32.068296,
        lon: -81.092835,
        distanceMiles: 1.2,
        contactName: "Demo Coordinator",
        contactPhone: "(912) 555-0188",
        contactEmail: "savannah@demo.refera.local",
      }),
    ],
  },
  {
    nctId: "DEMO-2002",
    title: "Demo study that requires prior treatment for breast cancer",
    phases: ["Phase 2"],
    sponsor: "Demo Harbor Trials",
    conditions: ["Breast cancer"],
    eligibilityText: "Inclusion: metastatic breast cancer after at least one prior regimen. HER2 status must be confirmed.",
    minAge: "18 Years",
    sex: "female",
    url: "#demo",
    nearestSite: site({
      facility: "Demo Hilton Head Research Site",
      city: "Hilton Head Island",
      state: "SC",
      zip: "29926",
      lat: 32.2163,
      lon: -80.7526,
      distanceMiles: 22.4,
      contactName: "Riley Chen",
      contactPhone: "(843) 555-0160",
      contactEmail: "harbor@demo.refera.local",
    }),
    sites: [
      site({
        facility: "Demo Hilton Head Research Site",
        city: "Hilton Head Island",
        state: "SC",
        zip: "29926",
        lat: 32.2163,
        lon: -80.7526,
        distanceMiles: 22.4,
        contactName: "Riley Chen",
        contactPhone: "(843) 555-0160",
        contactEmail: "harbor@demo.refera.local",
      }),
    ],
  },
];

export const mockRanked: RankedTrial[] = [
  {
    trial: mockTrials[0],
    score: 86,
    verdict: "likely",
    summary: "Stage, age, ECOG, and prior platinum therapy line up with the public listing. Confirm the chemotherapy washout with the site.",
    checks: [
      { criterion: "Stage III non-small cell lung cancer", status: "met", note: "The listing includes stage III non-small cell lung cancer." },
      { criterion: "Age 58", status: "met", note: "58 is within the listed adult age range." },
      { criterion: "Prior carboplatin and pemetrexed", status: "met", note: "Prior platinum chemotherapy is allowed." },
      { criterion: "Time since last chemotherapy", status: "unclear", note: "Confirm the required wait after carboplatin and pemetrexed." },
    ],
  },
  {
    trial: mockTrials[1],
    score: 61,
    verdict: "possible",
    summary: "The condition overlaps, but biopsy and biomarker rules are not clear from the excerpt.",
    checks: [
      { criterion: "Non-small cell lung cancer", status: "met", note: "Lung cancer is listed." },
      { criterion: "Measurable disease or a new biopsy", status: "unclear", note: "The note does not say whether a new biopsy is available." },
      { criterion: "Biomarker requirements", status: "unclear", note: "EGFR-negative status is known, and the protocol excerpt does not state the rule." },
    ],
  },
  {
    trial: mockTrials[2],
    score: 22,
    verdict: "unlikely",
    summary: "The listing asks for EGFR-positive stage IV disease and ECOG 0, which conflicts with this note.",
    checks: [
      { criterion: "EGFR mutation positive", status: "not_met", note: "The note says EGFR negative." },
      { criterion: "Stage IV only", status: "not_met", note: "The note says stage III." },
      { criterion: "ECOG 0 only", status: "not_met", note: "The note says ECOG 1." },
    ],
  },
];

export const mockRankedDiabetes: RankedTrial[] = [
  {
    trial: mockTrialsDiabetes[0],
    score: 84,
    verdict: "likely",
    summary: "Type 2 diabetes treated with metformin and an HbA1c of 9.1 fit the public listing. Confirm BMI limits with the site.",
    checks: [
      { criterion: "Type 2 diabetes", status: "met", note: "The listing is for type 2 diabetes." },
      { criterion: "Metformin", status: "met", note: "Current metformin is allowed." },
      { criterion: "HbA1c 9.1", status: "met", note: "9.1 is above the listed 7.5 threshold." },
      { criterion: "BMI 34", status: "unclear", note: "A BMI cutoff is not stated in the excerpt." },
    ],
  },
  {
    trial: mockTrialsDiabetes[1],
    score: 58,
    verdict: "possible",
    summary: "The condition matches, and insulin history plus the exact HbA1c rule still need a coordinator.",
    checks: [
      { criterion: "Type 2 diabetes", status: "met", note: "Diabetes is listed." },
      { criterion: "Recent HbA1c rule", status: "unclear", note: "The excerpt does not give the full lab rule." },
      { criterion: "Insulin use", status: "unclear", note: "The note does not mention insulin." },
    ],
  },
];

export const mockRankedBreast: RankedTrial[] = [
  {
    trial: mockTrialsBreast[0],
    score: 88,
    verdict: "likely",
    summary: "Newly diagnosed stage II HER2-positive disease matches. The site still has to confirm heart function.",
    checks: [
      { criterion: "Stage II HER2-positive breast cancer", status: "met", note: "Stage and HER2 status match the listing." },
      { criterion: "No treatment yet", status: "met", note: "The listing wants no prior systemic therapy." },
      { criterion: "Heart function", status: "unclear", note: "The note does not include an ejection fraction." },
    ],
  },
  {
    trial: mockTrialsBreast[1],
    score: 30,
    verdict: "unlikely",
    summary: "This listing wants prior treatment for metastatic disease, and the note says treatment has not started.",
    checks: [
      { criterion: "Prior regimen", status: "not_met", note: "The note says no treatment yet." },
      { criterion: "Metastatic disease", status: "unclear", note: "The note says stage II, not metastatic." },
      { criterion: "HER2 status", status: "unclear", note: "HER2-positive is stated, and this excerpt still says to confirm it." },
    ],
  },
];

export const mockReadback =
  "I found 3 trials that may fit this non-small cell lung cancer note. The closest match is in Albany, Georgia, about 32 miles away. Before referring, confirm the required wait after carboplatin and pemetrexed.";

export const mockEquity: EquitySnapshot = {
  county: "Sumter",
  state: "Georgia",
  sviOverall: 0.9631,
  sviLabel: "High vulnerability (top 25% nationally)",
  nearestMatchMiles: 32.3,
  note: "Sumter County, Georgia is in the highest quarter of U.S. counties on the CDC Social Vulnerability Index (2022), and the nearest match is 32 miles away.",
  isIllustrative: true,
};

export const mockSponsorStats: SponsorStats = {
  isIllustrative: true,
  totalReferrals: 419,
  regions: [
    { region: "Southwest Georgia", referrals: 84, highSviShare: 0.81 },
    { region: "Southeast Georgia", referrals: 63, highSviShare: 0.74 },
    { region: "Central Georgia", referrals: 57, highSviShare: 0.69 },
    { region: "North Georgia", referrals: 41, highSviShare: 0.62 },
    { region: "Coastal Georgia", referrals: 48, highSviShare: 0.58 },
    { region: "Metro Atlanta", referrals: 126, highSviShare: 0.34 },
  ],
};

export const mockHandout: Handout = {
  title: "Un estudio clínico que su médico quiere que usted conozca",
  language: "es",
  illustrationUrl: mockIllustrationUrl,
  sections: [
    {
      heading: "Qué es un estudio clínico",
      body: "Un estudio clínico es una investigación. Sirve para aprender si un tratamiento es seguro y útil. No es la misma atención de todos los días. Participar es su decisión. Usted puede decir que no, y su cuidado habitual puede seguir.",
    },
    {
      heading: "Por qué su médico mencionó este estudio",
      body: "Su médico vio un estudio para personas con cáncer de pulmón de células no pequeñas. Puede coincidir con algunos datos de su nota. Eso no significa que sea la mejor opción para usted. Tampoco significa que le vaya a ayudar. El equipo del estudio tiene que revisar si usted califica.",
    },
    {
      heading: "Dónde queda y cada cuánto",
      body: "En esta lista de demostración, el lugar más cercano está en Albany, Georgia, a unas 32 millas. El equipo le dirá cuántas visitas necesita y cuánto duran. Pregunte si hay un lugar más cerca de su casa.",
    },
    {
      heading: "Preguntas sobre el costo",
      body: "Pregunte qué se paga y qué no: el tratamiento, las pruebas, el viaje y el estacionamiento. Pida la respuesta por escrito antes de decidir. Nadie debe prometerle que el estudio le va a beneficiar.",
    },
  ],
  questionsToAsk: [
    "¿Para qué es este estudio, en palabras simples?",
    "¿Qué tendría que hacer y cuántas veces?",
    "¿Qué riesgos hay?",
    "¿Qué costo tendría para mí o para mi familia?",
    "¿Puedo salirme del estudio cuando quiera?",
  ],
  disclaimer:
    "Este folleto es información general. No es un consejo médico. Un estudio clínico es investigación. Puede que no le ayude. Participar es voluntario. Hable con su médico antes de decidir.",
};

export const STANDARD_DISCLAIMER =
  "This handout is general information, not medical advice. A clinical trial is research. It may not help you. Joining is voluntary. Talk with your doctor before you decide.";

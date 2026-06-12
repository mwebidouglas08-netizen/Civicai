// Local persistence layer. CivicAI runs fully client-side by default —
// reports persist in the browser via localStorage. This keeps the app
// deployable as a static site (e.g. Vercel) with zero backend required,
// while leaving a clean seam (see lib/api.js) to swap in a real API later.

const STORAGE_KEY = "civicai_cases_v1";
const DAY = 86400000;

export function loadCases() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedCases();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return seedCases();
    return parsed;
  } catch {
    return seedCases();
  }
}

export function saveCases(cases) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
  } catch {
    // storage unavailable (e.g. private browsing) — fail silently
  }
}

export function resetCases() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
  return seedCases();
}

/**
 * Find an existing open case that matches a new report by category and
 * approximate location (same locality string, case-insensitive), to
 * power the community clustering / aggregation feature.
 */
export function findCluster(cases, category, locality) {
  const norm = (s) => (s || "").trim().toLowerCase();
  return cases.find(
    (c) => c.category === category && norm(c.locality) === norm(locality) && c.status !== "resolved"
  );
}

/** Compute a community pressure score bump when a new report joins a cluster */
export function bumpPressure(currentScore) {
  return Math.min(99, Math.round(currentScore + (100 - currentScore) * 0.12 + 2));
}

/** Demo seed data so the dashboard isn't empty on first load. Uses generic, illustrative locations. */
export function seedCases() {
  const now = Date.now();
  return [
    {
      id: "CV-100481",
      category: "water",
      locality: "Riverside District",
      country: "",
      coords: { lat: null, lng: null, x: 22, y: 62 },
      title: { en: "Burst water main flooding the main road for over a week" },
      memberCount: 14,
      pressure: 91,
      status: "review",
      createdAt: now - 18 * DAY,
      lastUpdate: now - 12 * DAY,
      urgency: "high",
      members: ["Resident A", "Resident B", "Resident C", "+11 more"],
      letter: null,
      escalated: true,
      lang: "en",
      description: "A water main on the main road has burst and has been flooding the street for over a week, making it impassable for pedestrians and vehicles.",
    },
    {
      id: "CV-100502",
      category: "infrastructure",
      locality: "North Bridge Area",
      country: "",
      coords: { lat: null, lng: null, x: 58, y: 28 },
      title: { en: "Collapsed footbridge over the river — children at risk" },
      memberCount: 27,
      pressure: 97,
      status: "acknowledged",
      createdAt: now - 9 * DAY,
      lastUpdate: now - 2 * DAY,
      urgency: "high",
      members: ["Resident A", "Resident B", "Resident C", "+24 more"],
      letter: null,
      escalated: false,
      lang: "en",
      description: "The footbridge connecting the residential area to the school across the river has collapsed. Children cross the river bed daily to reach school, putting them at serious risk.",
    },
    {
      id: "CV-100455",
      category: "power",
      locality: "Eastside",
      country: "",
      coords: { lat: null, lng: null, x: 70, y: 34 },
      title: { en: "Recurring blackouts every evening for 3 weeks" },
      memberCount: 8,
      pressure: 64,
      status: "submitted",
      createdAt: now - 4 * DAY,
      lastUpdate: now - 4 * DAY,
      urgency: "medium",
      members: ["Resident A", "Resident B", "+6 more"],
      letter: null,
      escalated: false,
      lang: "en",
      description: "Power has gone out every evening between 6pm and 11pm for the past three weeks, affecting small businesses and households across the neighborhood.",
    },
    {
      id: "CV-100390",
      category: "waste",
      locality: "Market Quarter",
      country: "",
      coords: { lat: null, lng: null, x: 80, y: 52 },
      title: { en: "Uncollected garbage piling up near the primary school" },
      memberCount: 19,
      pressure: 78,
      status: "review",
      createdAt: now - 22 * DAY,
      lastUpdate: now - 15 * DAY,
      urgency: "medium",
      members: ["Resident A", "Resident B", "+17 more"],
      letter: null,
      escalated: true,
      lang: "en",
      description: "Garbage has not been collected for over three weeks and is now piling up directly outside the entrance to the primary school, creating a health hazard for children.",
    },
    {
      id: "CV-100420",
      category: "safety",
      locality: "Old Town",
      country: "",
      coords: { lat: null, lng: null, x: 88, y: 70 },
      title: { en: "Unlit street corner with repeated muggings reported" },
      memberCount: 11,
      pressure: 82,
      status: "acknowledged",
      createdAt: now - 7 * DAY,
      lastUpdate: now - 1 * DAY,
      urgency: "high",
      members: ["Resident A", "Resident B", "+9 more"],
      letter: null,
      escalated: false,
      lang: "en",
      description: "The street light at the corner of Old Town's main intersection has been broken for over a month. Several residents have reported being mugged at this corner after dark.",
    },
    {
      id: "CV-100511",
      category: "corruption",
      locality: "Civic Center",
      country: "",
      coords: { lat: null, lng: null, x: 46, y: 78 },
      title: { en: "Officials demanding bribes for housing permit approvals" },
      memberCount: 6,
      pressure: 55,
      status: "submitted",
      createdAt: now - 2 * DAY,
      lastUpdate: now - 2 * DAY,
      urgency: "high",
      members: ["Anonymous", "Anonymous", "+4 more"],
      letter: null,
      escalated: false,
      lang: "en",
      description: "Multiple residents applying for housing permits at the local civic center have been asked to pay unofficial 'processing fees' before their applications are accepted.",
    },
    {
      id: "CV-100375",
      category: "infrastructure",
      locality: "West End",
      country: "",
      coords: { lat: null, lng: null, x: 14, y: 38 },
      title: { en: "Massive pothole damaging vehicles on the main transit route" },
      memberCount: 23,
      pressure: 88,
      status: "resolved",
      createdAt: now - 40 * DAY,
      lastUpdate: now - 5 * DAY,
      urgency: "medium",
      members: ["Resident A", "Resident B", "+21 more"],
      letter: null,
      escalated: false,
      lang: "en",
      description: "A pothole over a meter wide has formed on the main transit route, damaging tires and suspensions on the buses and matatus that use this road daily.",
    },
    {
      id: "CV-100466",
      category: "water",
      locality: "Hillside",
      country: "",
      coords: { lat: null, lng: null, x: 62, y: 18 },
      title: { en: "No piped water for 2 weeks — residents buying from vendors at high cost" },
      memberCount: 31,
      pressure: 95,
      status: "review",
      createdAt: now - 16 * DAY,
      lastUpdate: now - 10 * DAY,
      urgency: "high",
      members: ["Resident A", "Resident B", "Resident C", "+28 more"],
      letter: null,
      escalated: true,
      lang: "en",
      description: "The piped water supply to Hillside has been cut off for two weeks with no explanation. Residents are now forced to buy water from private vendors at significantly inflated prices.",
    },
    {
      id: "CV-100620",
      category: "health",
      locality: "Lakeview",
      country: "",
      coords: { lat: null, lng: null, x: 35, y: 48 },
      title: { en: "Stagnant water near homes is breeding mosquitoes, malaria cases rising" },
      memberCount: 9,
      pressure: 67,
      status: "submitted",
      createdAt: now - 3 * DAY,
      lastUpdate: now - 3 * DAY,
      urgency: "high",
      members: ["Resident A", "Resident B", "+7 more"],
      letter: null,
      escalated: false,
      lang: "en",
      description: "A drainage channel near the Lakeview housing blocks has been blocked for months and now forms a stagnant pool. Several households report a sharp rise in mosquito bites and suspected malaria cases.",
    },
  ];
}

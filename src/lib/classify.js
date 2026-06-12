// Lightweight multilingual classifier.
// In a production deployment this would be replaced by an LLM call
// (see src/lib/aiClient.js for the hook point), but this local heuristic
// keeps the app fully functional offline / without an API key.

const KEYWORD_MAP = [
  {
    cat: "water",
    words: [
      "water", "pipe", "leak", "sewage", "drain", "flood", "burst main", "no water",
      "eau", "fuite", "égout", "inond", "canalisation", "pas d'eau",
      "ماء", "مياه", "تسريب", "صرف", "أنبوب", "انقطاع المياه",
      "agua", "tubería", "fuga", "alcantarill", "inunda",
      "água", "cano", "vazamento", "esgoto", "inunda",
      "maji", "bomba", "vuja", "maji taka", "mafuriko",
    ],
  },
  {
    cat: "power",
    words: [
      "power", "electric", "blackout", "transformer", "outage", "no electricity",
      "électric", "courant", "panne", "transformateur",
      "كهرباء", "انقطاع التيار", "محول",
      "electric", "apagón", "transformador", "luz",
      "elétric", "energia", "transformador", "falta de luz",
      "umeme", "stima", "transfoma",
    ],
  },
  {
    cat: "safety",
    words: [
      "unsafe", "crime", "mugg", "attack", "dark", "street light", "robbery", "assault",
      "sécurité", "agress", "éclairage", "vol", "danger",
      "أمان", "سرقة", "اعتداء", "ظلام", "إضاءة الشارع",
      "inseguro", "robo", "asalto", "alumbrado", "iluminación",
      "insegur", "roubo", "assalto", "iluminação",
      "usalama", "wizi", "shambulio", "giza", "taa za barabarani",
    ],
  },
  {
    cat: "corruption",
    words: [
      "bribe", "corrupt", "official demand", "extort", "kickback",
      "pot-de-vin", "corrup", "détournement",
      "رشو", "فساد", "ابتزاز",
      "soborno", "corrup", "extorsi",
      "suborno", "corrup", "propina",
      "rushwa", "ufisadi", "kutaka pesa",
    ],
  },
  {
    cat: "waste",
    words: [
      "garbage", "trash", "waste", "dump", "rubbish", "uncollected",
      "déchet", "ordure", "poubelle", "décharge",
      "قمامة", "نفايات", "زبالة", "مكب",
      "basura", "residuo", "vertedero",
      "lixo", "resíduo", "entulho",
      "takataka", "uchafu", "jaa",
    ],
  },
  {
    cat: "health",
    words: [
      "health", "clinic", "hospital", "disease", "outbreak", "pollut", "mosquito", "contamina",
      "santé", "clinique", "hôpital", "maladie", "pollu", "moustique",
      "صحة", "عيادة", "مستشفى", "مرض", "تلوث", "بعوض",
      "salud", "clínica", "hospital", "enfermedad", "contamina", "mosquito",
      "saúde", "clínica", "hospital", "doença", "poluição", "mosquito",
      "afya", "kliniki", "hospitali", "ugonjwa", "uchafuzi", "mbu",
    ],
  },
  {
    cat: "infrastructure",
    words: [
      "road", "pothole", "bridge", "footbridge", "collapse", "construction", "sidewalk", "traffic light",
      "route", "nid-de-poule", "pont", "effondr", "trottoir", "feu de circulation",
      "طريق", "حفرة", "جسر", "انهيار", "رصيف", "إشارة مرور",
      "carretera", "bache", "puente", "derrumb", "acera", "semáforo",
      "estrada", "buraco", "ponte", "desmoron", "calçada", "semáforo",
      "barabara", "shimo", "daraja", "anguka", "njia ya watembea",
    ],
  },
];

const URGENT_WORDS = [
  "danger", "child", "children", "collapse", "urgent", "emergency", "injur", "death", "die", "fire", "explod",
  "enfant", "danger", "urgence", "effondr", "blessé", "incendie", "explos",
  "خطر", "طفل", "أطفال", "انهيار", "طارئ", "إصاب", "وفاة", "حريق", "انفجار",
  "peligro", "niño", "niños", "derrumb", "urgente", "emergencia", "herid", "muerte", "incendio", "explos",
  "perigo", "criança", "crianças", "desmoron", "urgente", "emergência", "feri", "morte", "incêndio", "explos",
  "hatari", "mtoto", "watoto", "anguka", "haraka", "dharura", "jeraha", "kifo", "moto", "mlipuko",
];

/**
 * Classify free-text report content into a category and urgency level.
 * @param {string} text
 * @returns {{ category: string, urgency: 'high'|'medium'|'low' }}
 */
export function classifyText(text) {
  const lower = (text || "").toLowerCase();
  let best = "infrastructure";
  let bestScore = 0;
  for (const { cat, words } of KEYWORD_MAP) {
    const score = words.reduce((acc, w) => acc + (lower.includes(w.toLowerCase()) ? 1 : 0), 0);
    if (score > bestScore) {
      bestScore = score;
      best = cat;
    }
  }
  const isUrgent = URGENT_WORDS.some((w) => lower.includes(w.toLowerCase()));
  const urgency = isUrgent ? "high" : (lower.length > 140 ? "medium" : "medium");
  return { category: best, urgency };
}

/** Generate a short, displayable case title from raw report text */
export function summarize(text, maxLen = 90) {
  const trimmed = (text || "").trim().replace(/\s+/g, " ");
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen - 1).trim() + "…";
}

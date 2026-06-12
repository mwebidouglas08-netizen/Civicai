import { AlertTriangle, Droplet, Construction, ShieldAlert, Lightbulb, Trash2, HeartPulse } from "lucide-react";

// Generic authority names per category, per language.
// These are deliberately generic ("local water utility", "municipal roads
// department") so the letter is meaningful anywhere in the world.
// When a user provides a country/city, the authority line is prefixed
// with that locality so the letter reads as addressed to "the [Dept] of [City]".
export const CATEGORIES = {
  water: {
    icon: Droplet, color: "#2E6E8E", labelKey: "filter_water",
    authority: {
      en: "Water & Sanitation Authority",
      fr: "Service de l'eau et de l'assainissement",
      ar: "هيئة المياه والصرف الصحي",
      es: "Autoridad de Agua y Saneamiento",
      pt: "Autoridade de Água e Saneamento",
      sw: "Mamlaka ya Maji na Usafi wa Mazingira",
    },
  },
  infrastructure: {
    icon: Construction, color: "#D9A441", labelKey: "filter_infra",
    authority: {
      en: "Department of Roads & Public Works",
      fr: "Service des routes et des travaux publics",
      ar: "إدارة الطرق والأشغال العامة",
      es: "Departamento de Carreteras y Obras Públicas",
      pt: "Departamento de Estradas e Obras Públicas",
      sw: "Idara ya Barabara na Kazi za Umma",
    },
  },
  safety: {
    icon: ShieldAlert, color: "#C1432F", labelKey: "filter_safety",
    authority: {
      en: "Public Safety Office",
      fr: "Bureau de la sécurité publique",
      ar: "مكتب السلامة العامة",
      es: "Oficina de Seguridad Pública",
      pt: "Gabinete de Segurança Pública",
      sw: "Ofisi ya Usalama wa Umma",
    },
  },
  corruption: {
    icon: AlertTriangle, color: "#7C3AED", labelKey: "filter_corruption",
    authority: {
      en: "Anti-Corruption / Ethics Commission",
      fr: "Commission anti-corruption / de l'éthique",
      ar: "هيئة مكافحة الفساد / النزاهة",
      es: "Comisión Anticorrupción / de Ética",
      pt: "Comissão Anticorrupção / de Ética",
      sw: "Tume ya Kupambana na Ufisadi / Maadili",
    },
  },
  power: {
    icon: Lightbulb, color: "#E0A106", labelKey: "filter_power",
    authority: {
      en: "Electricity Distribution Authority",
      fr: "Office de distribution d'électricité",
      ar: "هيئة توزيع الكهرباء",
      es: "Autoridad de Distribución Eléctrica",
      pt: "Autoridade de Distribuição de Eletricidade",
      sw: "Mamlaka ya Usambazaji wa Umeme",
    },
  },
  waste: {
    icon: Trash2, color: "#6B8F71", labelKey: "filter_waste",
    authority: {
      en: "Waste Management Department",
      fr: "Service de gestion des déchets",
      ar: "إدارة إدارة النفايات",
      es: "Departamento de Gestión de Residuos",
      pt: "Departamento de Gestão de Resíduos",
      sw: "Idara ya Usimamizi wa Taka",
    },
  },
  health: {
    icon: HeartPulse, color: "#2E8E72", labelKey: "filter_health",
    authority: {
      en: "Public Health & Environment Office",
      fr: "Bureau de la santé publique et de l'environnement",
      ar: "مكتب الصحة العامة والبيئة",
      es: "Oficina de Salud Pública y Medio Ambiente",
      pt: "Gabinete de Saúde Pública e Ambiente",
      sw: "Ofisi ya Afya ya Umma na Mazingira",
    },
  },
};

export const CATEGORY_KEYS = Object.keys(CATEGORIES);

/** Build a locality-aware authority name, e.g. "Water & Sanitation Authority — Lagos, Nigeria" */
export function authorityFor(category, lang, locality) {
  const base = CATEGORIES[category].authority[lang] || CATEGORIES[category].authority.en;
  if (locality && locality.trim()) {
    return `${base} — ${locality.trim()}`;
  }
  return base;
}

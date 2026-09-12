import type { Question } from "./engine";

export type ExamGroup = "normativa" | "seguretat" | "senyals";
// Autoescola Olímpica's exam composition, supplied with the requirements.
export const EXAM_QUOTAS: Record<ExamGroup, number> = {
  normativa: 15,
  seguretat: 10,
  senyals: 15,
};

// The export has topic tags, not the school's three exam-group labels.
const categories: Record<string, { label: string; icon: string; group: ExamGroup }> = {
  ACCIDENT: { icon: "🚑", label: "Accidents et premiers secours", group: "seguretat" },
  ALCOHOL: { icon: "🍷", label: "Alcool et drogues", group: "seguretat" },
  ANIMALS: { icon: "🐾", label: "Animaux", group: "normativa" },
  ATTITUDE: { icon: "🤝", label: "Attitude au volant", group: "seguretat" },
  BICYCLE: { icon: "🚲", label: "Vélos", group: "normativa" },
  CHILDREN: { icon: "🧒", label: "Enfants", group: "seguretat" },
  DIMENSIONS: { icon: "📏", label: "Dimensions des véhicules", group: "normativa" },
  DISTANCE: { icon: "↔️", label: "Distances de sécurité", group: "seguretat" },
  DOCUMENTATION: { icon: "📄", label: "Documents et permis", group: "normativa" },
  EMERGENCY: { icon: "🚨", label: "Situations d’urgence", group: "seguretat" },
  ENVIRONMENT: { icon: "🌿", label: "Environnement et écoconduite", group: "seguretat" },
  FATIGUE: { icon: "😴", label: "Fatigue et vigilance", group: "seguretat" },
  HIGHWAY: { icon: "🛣️", label: "Autoroutes", group: "normativa" },
  LANES: { icon: "🛤️", label: "Voies de circulation", group: "normativa" },
  LIGHTS: { icon: "💡", label: "Éclairage", group: "normativa" },
  LOAD: { icon: "📦", label: "Chargement", group: "normativa" },
  MAINTENANCE: { icon: "🔧", label: "Entretien du véhicule", group: "seguretat" },
  MANEUVER: { icon: "🔄", label: "Manœuvres", group: "normativa" },
  MOTORCYCLE: { icon: "🏍️", label: "Motos", group: "normativa" },
  OVERTAKING: { icon: "🚗", label: "Dépassements", group: "normativa" },
  PARKING: { icon: "🅿️", label: "Stationnement", group: "normativa" },
  PEDESTRIANS: { icon: "🚶", label: "Piétons", group: "normativa" },
  PENALTIES: { icon: "⚖️", label: "Infractions et sanctions", group: "normativa" },
  PRIORITY: { icon: "⚠️", label: "Priorités", group: "normativa" },
  RAILWAY: { icon: "🚆", label: "Passages à niveau", group: "normativa" },
  ROUNDABOUT: { icon: "🔁", label: "Ronds-points", group: "normativa" },
  SAFETY: { icon: "🛡️", label: "Sécurité routière", group: "seguretat" },
  SIGNALING: { icon: "🚦", label: "Signalisation et avertissements", group: "normativa" },
  SIGNS: { icon: "🛑", label: "Panneaux", group: "senyals" },
  SPEED: { icon: "⏱️", label: "Vitesse", group: "normativa" },
  STOPPING: { icon: "✋", label: "Arrêt", group: "normativa" },
  TUNNEL: { icon: "🚇", label: "Tunnels", group: "normativa" },
  VEHICLE: { icon: "🚘", label: "Véhicule et poste de conduite", group: "seguretat" },
  WEATHER: { icon: "🌧️", label: "Météo et adhérence", group: "seguretat" },
};

export const questionCategory = (q: Question) => q.category || "OTHER";
export const categoryIcon = (category: string) => categories[category]?.icon ?? "📚";
export const categoryLabel = (category: string) =>
  categories[category]?.label ?? (category === "OTHER" ? "Autres questions" : category);

export function filterCategories(bank: Question[], selected: ReadonlySet<string>): Question[] {
  return bank.filter(q => selected.has(questionCategory(q)));
}

export function examGroup(q: Question): ExamGroup {
  const category = categories[questionCategory(q)];
  if (!category) throw new Error(`Catégorie d’examen inconnue : ${questionCategory(q)}`);
  // Sign interpretation is often tagged SPEED, PRIORITY, LIGHTS, etc.
  // SIGNALING also includes drivers' indicators/horns, which stay normativa.
  const text = q.question.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/\b(?:aquest(?:a|s|es)? senyal(?:s|itzacio)?|senyal(?:s)? de|semafor(?:s)?|marques? viari(?:a|es)|agent(?:s)?(?: de(?: la)?)? (?:circulacio|transit))\b/.test(text)
    || (q.category === "SIGNALING" && /\bagent\b/.test(text))) return "senyals";
  return category.group;
}

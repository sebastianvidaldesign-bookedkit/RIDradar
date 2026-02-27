const SPANISH_SIGNALS = [
  // Characters unique to Spanish
  "ñ", "¿", "¡",
  // Accented words common in this domain
  "cómo", "música", "músico", "también", "artístico", "electrónico",
  "independiente", "necesito", "dónde", "qué", "artículo",
  // Spanish-only keywords from classifiers
  "conseguir", "fechas", "recital", "recitales", "cantante", "rapero",
  "productor musical", "sello discográfico", "tocar en vivo",
  "armar un epk", "hacer un epk", "crear un epk", "armo mi epk",
  "kit de prensa", "dossier artístico", "carpeta de prensa",
  "material de prensa", "urgente", "mañana", "esta semana",
  "el promotor pide", "me pidieron", "cuanto antes",
  "cómo hago", "cómo puedo", "cómo armo", "cómo creo",
  "alguien sabe", "alguien conoce", "qué me recomiendan",
  "consejos para", "ayuda con", "busco",
];

export function detectLanguage(title: string, content: string): "en" | "es" {
  const text = `${title} ${content}`.toLowerCase();
  for (const signal of SPANISH_SIGNALS) {
    if (text.includes(signal)) return "es";
  }
  return "en";
}

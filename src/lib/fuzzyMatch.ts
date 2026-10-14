import type { Ingredient } from '../types';

/**
 * Client-side fuzzy string similarity score (0.0 to 1.0).
 * Handles exact matches, containment, and word-level overlap.
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.85;

  const words1 = s1.split(/\s+/).filter((w) => w.length > 1);
  const words2 = s2.split(/\s+/).filter((w) => w.length > 1);
  const common = words1.filter((w) => words2.some((w2) => w2.includes(w) || w.includes(w2)));
  if (words1.length > 0 && common.length > 0) {
    return Math.min(0.9, (common.length / Math.max(words1.length, words2.length)) * 0.85);
  }

  return 0.0;
}

/**
 * Matches an extracted raw name against registered provisions using bilingual (English / Telugu) fuzzy matching.
 */
export function findBestIngredientMatch(
  rawName: string,
  provisions: Ingredient[]
): { ingredient: Ingredient | null; confidence: number } {
  let bestIng: Ingredient | null = null;
  let bestScore = 0;

  for (const ing of provisions) {
    let score = calculateSimilarity(rawName, ing.name);
    if (ing.name_telugu) {
      const teScore = calculateSimilarity(rawName, ing.name_telugu);
      if (teScore > score) score = teScore;
    }

    if (score > bestScore) {
      bestScore = score;
      bestIng = ing;
    }
  }

  return {
    ingredient: bestScore >= 0.35 ? bestIng : null,
    confidence: bestScore,
  };
}

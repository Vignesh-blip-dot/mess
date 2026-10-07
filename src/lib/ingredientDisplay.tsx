import React from 'react';
import { Ingredient } from '../types';

/**
 * Returns a formatted text string like "Toor Dal (కందిపప్పు)" or "Toor Dal" if no Telugu name.
 */
export function formatIngredientName(name?: string | null, nameTelugu?: string | null): string {
  const safeName = (name || '').trim();
  const safeTelugu = (nameTelugu || '').trim();
  if (!safeName && !safeTelugu) return '';
  if (!safeTelugu) return safeName;
  if (!safeName) return safeTelugu;
  // If the name already includes the Telugu name, don't duplicate
  if (safeName.includes(safeTelugu)) return safeName;
  return `${safeName} (${safeTelugu})`;
}

/**
 * Resolves an ingredient by ID and returns "English (Telugu)" or just the fallback.
 */
export function getIngredientFullName(
  ingredientId: string,
  ingredientsList: Ingredient[],
  fallbackName?: string
): string {
  const found = ingredientsList.find(
    (i) => i.ingredient_id === ingredientId || String((i as any).id) === ingredientId
  );
  if (found) {
    return formatIngredientName(found.name, found.name_telugu);
  }
  return fallbackName || ingredientId;
}

/**
 * Resolves Telugu name for a given ingredient ID
 */
export function getIngredientTeluguName(
  ingredientId: string,
  ingredientsList: Ingredient[]
): string | null {
  const found = ingredientsList.find(
    (i) => i.ingredient_id === ingredientId || String((i as any).id) === ingredientId
  );
  return found?.name_telugu?.trim() || null;
}

/**
 * Rich React component to display English name and Telugu name side-by-side
 */
export function IngredientNameDisplay({
  name,
  nameTelugu,
  className = '',
  englishClassName = 'font-semibold text-[#131715]',
  teluguClassName = 'text-[#59635e] font-normal text-xs ml-1.5',
}: {
  name?: string | null;
  nameTelugu?: string | null;
  className?: string;
  englishClassName?: string;
  teluguClassName?: string;
}) {
  const safeName = (name || '').trim();
  const safeTelugu = (nameTelugu || '').trim();

  if (!safeName && !safeTelugu) return null;

  return (
    <span className={`inline-flex items-baseline flex-wrap gap-x-1 ${className}`}>
      <span className={englishClassName}>{safeName || safeTelugu}</span>
      {safeTelugu && safeName !== safeTelugu && !safeName.includes(safeTelugu) && (
        <span className={teluguClassName}>({safeTelugu})</span>
      )}
    </span>
  );
}

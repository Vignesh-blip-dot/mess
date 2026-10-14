import { describe, it, expect } from 'vitest';
import { calculateSimilarity, findBestIngredientMatch } from '../lib/fuzzyMatch';
import type { Ingredient } from '../types';

describe('OCR & Usage Fuzzy Matching', () => {
  it('exact match returns 1.0', () => {
    expect(calculateSimilarity('Sona Masoori Rice', 'Sona Masoori Rice')).toBe(1.0);
    expect(calculateSimilarity('Toor Dal', 'toor dal')).toBe(1.0);
  });

  it('substring match returns 0.85', () => {
    expect(calculateSimilarity('Sona Masoori', 'Sona Masoori Rice')).toBe(0.85);
    expect(calculateSimilarity('Sunflower Oil', 'Oil')).toBe(0.85);
  });

  it('Telugu name exact match returns 1.0', () => {
    expect(calculateSimilarity('కందిపప్పు', 'కందిపప్పు')).toBe(1.0);
  });

  it('unrelated items return 0.0', () => {
    expect(calculateSimilarity('Chicken', 'Rice')).toBe(0.0);
    expect(calculateSimilarity('Tomato', 'Salt')).toBe(0.0);
  });

  it('empty strings return 0.0', () => {
    expect(calculateSimilarity('', 'Rice')).toBe(0.0);
    expect(calculateSimilarity('Rice', '')).toBe(0.0);
  });
});

describe('findBestIngredientMatch', () => {
  const sampleIngredients: Ingredient[] = [
    {
      ingredient_id: 'ing-1',
      name: 'Sona Masoori Rice',
      name_telugu: 'బియ్యం',
      category: 'provisions',
      unit: 'kg',
      current_stock: 120,
      current_price: 52,
      active: true,
      tracks_usage: true,
    },
    {
      ingredient_id: 'ing-2',
      name: 'Toor Dal',
      name_telugu: 'కందిపప్పు',
      category: 'provisions',
      unit: 'kg',
      current_stock: 40,
      current_price: 165,
      active: true,
      tracks_usage: true,
    },
    {
      ingredient_id: 'ing-3',
      name: 'Sunflower Oil',
      name_telugu: 'నూనె',
      category: 'provisions',
      unit: 'L',
      current_stock: 60,
      current_price: 135,
      active: true,
      tracks_usage: true,
    },
  ];

  it('matches English ingredient names with high confidence', () => {
    const match = findBestIngredientMatch('Sona Masoori', sampleIngredients);
    expect(match.ingredient).not.toBeNull();
    expect(match.ingredient?.ingredient_id).toBe('ing-1');
    expect(match.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('matches Telugu ingredient names seamlessly', () => {
    const match = findBestIngredientMatch('కందిపప్పు', sampleIngredients);
    expect(match.ingredient).not.toBeNull();
    expect(match.ingredient?.ingredient_id).toBe('ing-2');
    expect(match.confidence).toBe(1.0);
  });

  it('returns null when confidence is below 0.35 threshold', () => {
    const match = findBestIngredientMatch('Washing Powder Soap', sampleIngredients);
    expect(match.ingredient).toBeNull();
  });
});

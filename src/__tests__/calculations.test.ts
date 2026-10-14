import { describe, it, expect } from 'vitest';

describe('Weighted Average Price Calculation', () => {
  const round2 = (val: number) => Math.round(val * 100) / 100;

  it('calculates correctly for new purchases with existing stock', () => {
    const oldStock = 100;
    const oldPrice = 50;
    const addedQty = 50;
    const addedCost = 3000;
    const newStock = oldStock + addedQty;
    const currentVal = oldStock * oldPrice;
    const newPrice = round2((currentVal + addedCost) / newStock);

    expect(newStock).toBe(150);
    expect(newPrice).toBe(53.33); // (5000 + 3000) / 150 = 53.33
  });

  it('handles initial zero stock edge case gracefully', () => {
    const oldStock = 0;
    const oldPrice = 0;
    const addedQty = 25;
    const addedCost = 1350;
    const newStock = oldStock + addedQty;
    const newPrice = newStock > 0 ? round2(((oldStock * oldPrice) + addedCost) / newStock) : 0;

    expect(newStock).toBe(25);
    expect(newPrice).toBe(54); // 1350 / 25 = 54
  });

  it('preserves existing price when added quantity is zero', () => {
    const oldStock = 40;
    const oldPrice = 62.5;
    const addedQty = 0;
    const addedCost = 0;
    const newStock = oldStock + addedQty;
    const newPrice = newStock > 0 && addedQty > 0
      ? round2(((oldStock * oldPrice) + addedCost) / newStock)
      : oldPrice;

    expect(newPrice).toBe(62.5);
  });
});

describe('Coordinator Grace Period Rules', () => {
  function getCoordinatorAccess(todayStr: string, dutyStart: string, dutyEnd: string): 'edit' | 'grace' | 'view' {
    if (dutyStart <= todayStr && todayStr <= dutyEnd) {
      return 'edit';
    }
    const endDate = new Date(dutyEnd);
    const graceEnd = new Date(endDate.getTime() + 15 * 86400000).toISOString().split('T')[0];
    if (dutyEnd < todayStr && todayStr <= graceEnd) {
      return 'grace';
    }
    return 'view';
  }

  it('grants "edit" during active duty assignment', () => {
    expect(getCoordinatorAccess('2026-10-14', '2026-10-01', '2026-10-31')).toBe('edit');
    expect(getCoordinatorAccess('2026-10-01', '2026-10-01', '2026-10-31')).toBe('edit');
    expect(getCoordinatorAccess('2026-10-31', '2026-10-01', '2026-10-31')).toBe('edit');
  });

  it('grants "grace" within 15 days following duty completion', () => {
    expect(getCoordinatorAccess('2026-10-05', '2026-09-01', '2026-09-30')).toBe('grace');
    expect(getCoordinatorAccess('2026-10-15', '2026-09-01', '2026-09-30')).toBe('grace');
  });

  it('restricts to "view" once the 15-day grace period has passed', () => {
    expect(getCoordinatorAccess('2026-10-16', '2026-09-01', '2026-09-30')).toBe('view');
    expect(getCoordinatorAccess('2026-11-01', '2026-09-01', '2026-09-30')).toBe('view');
  });
});

describe('Packaging Unit Conversion', () => {
  const round3 = (val: number) => Math.round(val * 1000) / 1000;

  it('converts multi-unit packages to base inventory correctly', () => {
    const bags = 2;
    const bagMultiplier = 25; // 25kg bag
    expect(bags * bagMultiplier).toBe(50);

    const tins = 3;
    const tinMultiplier = 15; // 15L tin
    expect(tins * tinMultiplier).toBe(45);

    const loosePackets = 1.5;
    const packetMultiplier = 0.5; // 500g packet
    expect(round3(loosePackets * packetMultiplier)).toBe(0.75);
  });
});

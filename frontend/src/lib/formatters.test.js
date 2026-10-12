import { describe, expect, it } from 'vitest';
import {
  contratExpire,
  formatDuration,
  formatMAD,
  formatMADCompact,
  formatDate,
  formatNumber,
  joursRestants,
} from './formatters';

const daysFromNow = (offset) => {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
};

describe('formatNumber', () => {
  it('formats thousands with the fr-FR separator', () => {
    expect(formatNumber(1500)).toMatch(/^1[\s\u202f\u00a0]500$/);
  });

  it('falls back to 0 for invalid input', () => {
    expect(formatNumber('abc')).toBe('0');
    expect(formatNumber(undefined)).toBe('0');
  });
});

describe('formatMAD', () => {
  it('appends the currency suffix by default', () => {
    expect(formatMAD(0)).toMatch(/0,00\sDH$/);
  });

  it('can drop the suffix and the decimals', () => {
    expect(formatMAD(1500, { withSuffix: false, decimals: 0 })).toMatch(/^1[\s\u202f\u00a0]500$/);
  });
});

describe('formatMADCompact', () => {
  it('uses a compact unit from 10 000 upwards', () => {
    expect(formatMADCompact(15000)).toMatch(/k\sDH$/i);
  });

  it('keeps the full amount below the threshold', () => {
    expect(formatMADCompact(1500)).toMatch(/^1[\s\u202f\u00a0]500,00\sDH$/);
  });
});

describe('formatDate', () => {
  it('formats a date without time', () => {
    expect(formatDate('2026-10-12T12:00:00Z')).toBe('12/10/2026');
  });

  it('renders an em dash for empty values', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate('not-a-date')).toBe('—');
  });
});

describe('formatDuration', () => {
  it('pluralises days', () => {
    expect(formatDuration(1)).toBe('1 jour');
    expect(formatDuration(3)).toBe('3 jours');
  });
});

describe('joursRestants', () => {
  it('is 0 on the expiry day itself', () => {
    expect(joursRestants(new Date())).toBe(0);
  });

  it('is negative once the date has passed', () => {
    expect(joursRestants(daysFromNow(-3))).toBe(-3);
  });

  it('is positive while the contract is still valid', () => {
    expect(joursRestants(daysFromNow(10))).toBe(10);
  });

  it('is null without a date', () => {
    expect(joursRestants(null)).toBeNull();
    expect(joursRestants('')).toBeNull();
  });
});

describe('contratExpire', () => {
  it('never expires when no date is configured', () => {
    expect(contratExpire(null)).toBe(false);
    expect(contratExpire(undefined)).toBe(false);
  });

  it('stays valid on the expiry day', () => {
    expect(contratExpire(new Date())).toBe(false);
  });

  it('expires the day after', () => {
    expect(contratExpire(daysFromNow(-1))).toBe(true);
  });
});

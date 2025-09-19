import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
  formatCurrency,
  formatDate,
  formatDeltaIndicator,
  formatPercentage
} from '../src/utils/formatters.js';

describe('formatCurrency', () => {
  it('formats currency in pt-BR by default', () => {
    const formatted = formatCurrency(1234.56);
    assert.ok(formatted.includes('R$'));
    assert.ok(formatted.includes('1.234,56'));
  });

  it('returns fallback for invalid numbers', () => {
    const formatted = formatCurrency('invalid', { fallback: '--' });
    assert.equal(formatted, '--');
  });
});

describe('formatDate', () => {
  const reference = new Date('2024-01-10T12:00:00Z');
  let originalNow: () => number;

  beforeEach(() => {
    originalNow = Date.now;
    Date.now = () => reference.getTime();
  });

  afterEach(() => {
    Date.now = originalNow;
  });

  it('formats absolute dates using locale defaults', () => {
    const formatted = formatDate('2024-01-10T12:00:00Z');
    assert.ok(formatted.includes('2024'));
    assert.ok(formatted.toLowerCase().includes('jan'));
    assert.ok(/10/.test(formatted));
  });

  it('formats relative dates when requested', () => {
    const formatted = formatDate('2024-01-08T12:00:00Z', { relative: true });
    assert.ok(formatted.length > 0);
    assert.ok(/dia|ontem|há/.test(formatted.toLowerCase()));
  });
});

describe('formatPercentage', () => {
  it('formats standard percentages from whole numbers', () => {
    assert.equal(formatPercentage(5), '5,00%');
  });

  it('formats normalized ratios when requested', () => {
    assert.equal(formatPercentage(0.125, { normalized: true, fractionDigits: 1 }), '12,5%');
  });
});

describe('formatDeltaIndicator', () => {
  it('formats positive deltas with trend indicator', () => {
    const result = formatDeltaIndicator(5, { showSign: true });
    assert.equal(result.trend, 'positive');
    assert.equal(result.text, '▲ +5,00%');
  });

  it('formats negative deltas respecting unit overrides', () => {
    const result = formatDeltaIndicator(-12.5, { unit: 'bps', fractionDigits: 1 });
    assert.equal(result.trend, 'negative');
    assert.equal(result.text, '▼ 12,5 bps');
  });

  it('handles neutral deltas', () => {
    const result = formatDeltaIndicator(0);
    assert.equal(result.trend, 'neutral');
    assert.ok(result.text.includes('—'));
  });
});

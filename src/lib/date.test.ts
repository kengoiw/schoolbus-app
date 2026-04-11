import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isAfterDeadline, todayJst, formatJst } from './date';

describe('Date Utilities (JST)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('todayJst', () => {
    it('returns correct JST today string even from UTC perspective', () => {
      // 2026-04-10T14:00:00.000Z (UTC) は JSTで 2026-04-10 23:00
      vi.setSystemTime(new Date('2026-04-10T14:00:00.000Z'));
      expect(todayJst()).toBe('2026-04-10');

      // 2026-04-10T15:00:00.000Z (UTC) は JSTで 2026-04-11 00:00
      vi.setSystemTime(new Date('2026-04-10T15:00:00.000Z'));
      expect(todayJst()).toBe('2026-04-11');
    });
  });

  describe('formatJst', () => {
    it('formats date correctly in JST timezone', () => {
      const dbDate = new Date('2026-04-10T14:30:00.000Z'); // UTC
      expect(formatJst(dbDate, 'YYYY-MM-DD HH:mm')).toBe('2026-04-10 23:30');
    });
  });

  describe('isAfterDeadline', () => {
    it('returns true if time is strictly past the deadline', () => {
      // 2026-04-10 07:31 JST = 2026-04-09T22:31:00Z
      vi.setSystemTime(new Date('2026-04-09T22:31:00Z'));
      const deadlineAt = new Date('2026-04-09T22:30:00Z'); // 締切: 07:30 JST (前日22:30 UTC)
      expect(isAfterDeadline(deadlineAt)).toBe(true);
    });

    it('returns false if time is before the deadline', () => {
      // 2026-04-10 07:29 JST
      vi.setSystemTime(new Date('2026-04-09T22:29:00Z'));
      const deadlineAt = new Date('2026-04-09T22:30:00Z');
      expect(isAfterDeadline(deadlineAt)).toBe(false);
    });

    it('returns false if time is exactly ON the deadline', () => {
      // 2026-04-10 07:30 JST
      vi.setSystemTime(new Date('2026-04-09T22:30:00Z'));
      const deadlineAt = new Date('2026-04-09T22:30:00Z');
      expect(isAfterDeadline(deadlineAt)).toBe(false);
    });

    it('returns false if deadline is not set (null)', () => {
      expect(isAfterDeadline(null)).toBe(false);
    });
  });
});


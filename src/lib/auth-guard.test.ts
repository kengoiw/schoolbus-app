import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAuth } from './auth-guard';
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

// @/auth のモック化
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

describe('Auth Guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects with 401 if not logged in', async () => {
    vi.mocked(auth).mockResolvedValue(null);

    const result = await requireAuth(['admin']);
    
    // error が NextResponseのインスタンスとして返る
    expect(result.user).toBeNull();
    expect(result.error).toBeInstanceOf(NextResponse);
    expect((result.error as any).status).toBe(401);
  });

  it('rejects with 403 if role is not allowed', async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: '3', role: 'guardian' },
      expires: '2026-04-11',
    });

    const result = await requireAuth(['admin']); // 管理者のみ許可
    
    expect(result.user).toBeNull();
    expect(result.error).toBeInstanceOf(NextResponse);
    expect((result.error as any).status).toBe(403);
  });

  it('allows access and returns user if role matches', async () => {
    const mockUser = { id: '1', role: 'admin', name: 'Admin', email: 'admin@lg.jp' };
    vi.mocked(auth).mockResolvedValue({
      user: Object.assign({}, mockUser),
      expires: '2026-04-11',
    });

    const result = await requireAuth(['admin', 'driver']);
    
    expect(result.error).toBeNull();
    expect(result.user).toEqual(mockUser);
  });

  it('allows any valid logged-in user if allowedRoles is not specified', async () => {
    const mockUser = { id: '2', role: 'guardian', name: '', email: '' };
    vi.mocked(auth).mockResolvedValue({
      user: Object.assign({}, mockUser),
      expires: '2026-04-11',
    });

    const result = await requireAuth(); // 引数なし
    
    expect(result.error).toBeNull();
    expect(result.user).toEqual(mockUser);
  });
});


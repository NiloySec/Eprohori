// Crowd-sourced name lookup — client side only.
// Tries the EProhori backend; fails silently so the app works offline.

// C6: never use process.env in RN bundle — always undefined; use hardcoded URL (same as threatAnalysis.ts)
const BASE = 'https://eprohori-production.up.railway.app';
const TIMEOUT = 8000;

async function fetchWithTimeout(url: string, opts?: RequestInit): Promise<Response> {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(id);
  }
}

export interface CrowdName {
  name: string;
  count: number;   // how many users tagged it with this name
  verified: boolean;
}

export const nameTagAPI = {
  /** Fetch the most-reported community name for a number. Returns null on any error. */
  async fetchCrowdName(number: string): Promise<CrowdName | null> {
    const clean = number.replace(/\D/g, '');
    if (!clean) return null;
    try {
      const res = await fetchWithTimeout(`${BASE}/api/crowd-names/${clean}`);
      if (!res.ok) return null;
      const data = await res.json();
      if (!data?.name) return null;
      return { name: data.name, count: data.count ?? 1, verified: data.verified ?? false };
    } catch {
      return null;
    }
  },

  /** Submit a user-defined name tag for a number to the community. Fire-and-forget. */
  async submitCrowdName(number: string, name: string): Promise<void> {
    const clean = number.replace(/\D/g, '');
    if (!clean || !name.trim()) return;
    try {
      await fetchWithTimeout(`${BASE}/api/crowd-names`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: clean, name: name.trim() }),
      });
    } catch {
      // Non-critical — local tag is already saved
    }
  },
};

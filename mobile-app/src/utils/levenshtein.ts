// L5: single authoritative levenshtein implementation — used by CallerIDScreen + callDetectionService
export function levenshtein(a: string | null | undefined, b: string | null | undefined): number {
  // M5: null/undefined guard
  if (!a && !b) return 0;
  if (!a) return b!.length;
  if (!b) return a.length;
  const m = a.length, n = b.length;
  // M18: guard against huge strings — DP table would be m×n entries (memory exhaustion)
  if (m > 200 || n > 200) return Math.abs(m - n);
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
  return dp[m][n];
}

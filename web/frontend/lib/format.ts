/** Shared pure formatting helpers (unit-tested in format.test.ts). */

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯']

/** Convert ASCII digits in a value to Bengali numerals. */
export function toBnDigits(value: number | string): string {
  return String(value).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)])
}

/** Bengali relative-time label from an ISO timestamp (assumes UTC if no tz). */
export function timeAgo(iso: string): string {
  const ts = /Z$|[+]/.test(iso) ? iso : iso + 'Z'
  const diff = (Date.now() - new Date(ts).getTime()) / 60000
  if (diff < 60) return `${Math.floor(diff)} মিনিট আগে`
  if (diff < 1440) return `${Math.floor(diff / 60)} ঘণ্টা আগে`
  return `${Math.floor(diff / 1440)} দিন আগে`
}

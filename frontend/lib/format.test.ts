import { describe, it, expect } from 'vitest'
import { toBnDigits, timeAgo } from './format'

describe('toBnDigits', () => {
  it('converts ASCII digits to Bengali numerals', () => {
    expect(toBnDigits(2026)).toBe('২০২৬')
    expect(toBnDigits('64')).toBe('৬৪')
    expect(toBnDigits(0)).toBe('০')
  })
  it('leaves non-digit characters unchanged', () => {
    expect(toBnDigits('৬৪/৬৪')).toBe('৬৪/৬৪')
    expect(toBnDigits('5 days')).toBe('৫ days')
  })
})

describe('timeAgo', () => {
  it('returns minutes for recent timestamps', () => {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    expect(timeAgo(tenMinAgo)).toBe('10 মিনিট আগে')
  })
  it('returns hours for hour-old timestamps', () => {
    const threeHrAgo = new Date(Date.now() - 3 * 3600 * 1000).toISOString()
    expect(timeAgo(threeHrAgo)).toBe('3 ঘণ্টা আগে')
  })
  it('returns days for day-old timestamps', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400 * 1000).toISOString()
    expect(timeAgo(twoDaysAgo)).toBe('2 দিন আগে')
  })
})

import type { Locale } from '@/i18n'

export interface CoverLetterData {
  fullName: string
  jobTitle: string
  email: string
  phone: string
  location: string
  recipientName: string
  recipientTitle: string
  /**
   * The name after "Dear" in the salutation, independent of `recipientName` —
   * the same letter may be addressed to HR by name but greeted as "Hiring
   * Manager", or vice versa. Empty falls back to `recipientName`, then to
   * "Hiring Manager", which is exactly how the letter read before this field
   * existed.
   */
  salutation: string
  companyName: string
  companyAddress: string
  opening: string
  bodyWhy: string
  bodyBring: string
  closing: string
  // Optional pasted job posting; the AI analyzer uses it to tailor feedback.
  targetJobDescription: string
  signature: string
  meta: {
    createdAt: string
    updatedAt: string
    version: string
  }
}

export const COVER_LETTER_CURRENT_VERSION = '1.2.0'

export function createEmptyCoverLetterData(): CoverLetterData {
  const now = new Date().toISOString()
  return {
    fullName: '',
    jobTitle: '',
    email: '',
    phone: '',
    location: '',
    recipientName: '',
    recipientTitle: '',
    salutation: '',
    companyName: '',
    companyAddress: '',
    opening: '',
    bodyWhy: '',
    bodyBring: '',
    closing: '',
    targetJobDescription: '',
    signature: 'Sincerely,',
    meta: { createdAt: now, updatedAt: now, version: COVER_LETTER_CURRENT_VERSION },
  }
}

/**
 * Migrate a stored cover letter to the current shape. Runs on every
 * loadFromStorage() — the cover-letter counterpart of migrateCVData(), added
 * with the first schema change the letter has had.
 *
 * Ladder:
 * - 1.0.0 → 1.1.0 — introduce `targetJobDescription` (default '')
 * - 1.1.0 → 1.2.0 — introduce `salutation` (default ''), drop the hand-typed
 *   `date` (the letter is now stamped with the day it is rendered/exported)
 */
export function migrateCoverLetterData(stored: CoverLetterData): CoverLetterData {
  if (typeof (stored as Partial<CoverLetterData>).targetJobDescription !== 'string') {
    stored.targetJobDescription = ''
  }
  if (typeof (stored as Partial<CoverLetterData>).salutation !== 'string') {
    stored.salutation = ''
  }
  // `date` was a free-text field the user had to keep current by hand; the
  // preview now renders today's date, so drop the stale stored value.
  delete (stored as { date?: string }).date
  stored.meta.version = COVER_LETTER_CURRENT_VERSION
  return stored
}

/**
 * The date stamped on the letter — always "now", so the PDF carries the day it
 * was downloaded rather than whatever the user last typed.
 */
export function formatLetterDate(locale: Locale, now: Date = new Date()): string {
  return now.toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

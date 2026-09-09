import type { PersonalInfo } from '@/types/cv.types'

/** One rendered optional link in a template's contact row. */
export interface SocialLink {
  /** Stable v-for key. */
  key: 'linkedin' | 'github' | 'website'
  /** The anchor text. */
  value: string
  href: string
  /**
   * Dimmed prefix the technical template prints before a derived handle
   * (`in/`, `gh/`, `web/`). Always empty for a user-supplied label — the whole
   * point of a custom label is that it reads as written.
   */
  prefix: string
}

/**
 * How the anchor text is derived when the user has *not* set a custom label:
 *  • `url`    — the URL with its scheme stripped (linkedin.com/in/janedoe)
 *  • `handle` — just the handle, with a `prefix` to signal the platform (in/janedoe)
 */
export type SocialLinkStyle = 'url' | 'handle'

interface LinkDef {
  key: SocialLink['key']
  /** Strips the known host so only the handle is left, for the `handle` style. */
  handlePattern: RegExp
  prefix: string
}

const LINK_DEFS: readonly LinkDef[] = [
  { key: 'linkedin', handlePattern: /^https?:\/\/(www\.)?linkedin\.com\/in\/?/, prefix: 'in/' },
  { key: 'github', handlePattern: /^https?:\/\/(www\.)?github\.com\//, prefix: 'gh/' },
  { key: 'website', handlePattern: /^https?:\/\//, prefix: 'web/' },
] as const

/**
 * Build the optional-link list every template's contact row renders.
 *
 * A non-blank `<key>Label` wins over the derived text, so "LinkedIn" can front
 * a long profile URL while the anchor stays clickable.
 */
export function buildSocialLinks(
  personal: PersonalInfo,
  style: SocialLinkStyle = 'url',
): SocialLink[] {
  const links: SocialLink[] = []

  for (const def of LINK_DEFS) {
    const href = personal[def.key]?.trim()
    if (!href) continue

    const label = personal[`${def.key}Label`]?.trim()
    if (label) {
      links.push({ key: def.key, value: label, href, prefix: '' })
      continue
    }

    links.push(
      style === 'handle'
        ? { key: def.key, value: href.replace(def.handlePattern, ''), href, prefix: def.prefix }
        : { key: def.key, value: href.replace(/^https?:\/\//, ''), href, prefix: '' },
    )
  }

  return links
}

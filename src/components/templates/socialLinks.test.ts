/**
 * Optional links carry a user-editable anchor text. A blank label must keep the
 * pre-1.5.0 rendering (the URL itself) so existing CVs look unchanged, while a
 * filled label replaces the visible text without touching the href.
 */
import { describe, expect, it } from 'vitest'
import { buildSocialLinks } from './socialLinks'
import type { PersonalInfo } from '@/types/cv.types'

function personal(overrides: Partial<PersonalInfo> = {}): PersonalInfo {
  return {
    fullName: 'Jane Doe',
    jobTitle: 'Engineer',
    email: '',
    phone: '',
    location: '',
    ...overrides,
  }
}

describe('buildSocialLinks', () => {
  it('falls back to the scheme-stripped URL when no label is set', () => {
    const links = buildSocialLinks(personal({ linkedin: 'https://www.linkedin.com/in/mnmercan/' }))
    expect(links).toEqual([
      {
        key: 'linkedin',
        value: 'www.linkedin.com/in/mnmercan/',
        href: 'https://www.linkedin.com/in/mnmercan/',
        prefix: '',
      },
    ])
  })

  it('shows the custom label while keeping the original href', () => {
    const links = buildSocialLinks(
      personal({ linkedin: 'https://www.linkedin.com/in/mnmercan/', linkedinLabel: 'LinkedIn' }),
    )
    expect(links[0]).toEqual({
      key: 'linkedin',
      value: 'LinkedIn',
      href: 'https://www.linkedin.com/in/mnmercan/',
      prefix: '',
    })
  })

  it('treats a whitespace-only label as unset', () => {
    const links = buildSocialLinks(
      personal({ github: 'https://github.com/janedoe', githubLabel: '   ' }),
    )
    expect(links[0].value).toBe('github.com/janedoe')
  })

  it('derives handles with a platform prefix in the handle style', () => {
    const links = buildSocialLinks(
      personal({
        linkedin: 'https://www.linkedin.com/in/mnmercan',
        github: 'https://github.com/janedoe',
        website: 'https://janedoe.dev',
      }),
      'handle',
    )
    expect(links.map((l) => `${l.prefix}${l.value}`)).toEqual([
      'in/mnmercan',
      'gh/janedoe',
      'web/janedoe.dev',
    ])
  })

  it('drops the platform prefix when a custom label is set', () => {
    const links = buildSocialLinks(
      personal({ github: 'https://github.com/janedoe', githubLabel: 'My code' }),
      'handle',
    )
    expect(links[0]).toMatchObject({ value: 'My code', prefix: '' })
  })

  it('omits links whose URL is empty, even when a label was typed', () => {
    expect(buildSocialLinks(personal({ website: '', websiteLabel: 'Portfolio' }))).toEqual([])
  })

  it('keeps the linkedin → github → website order', () => {
    const links = buildSocialLinks(
      personal({
        website: 'https://janedoe.dev',
        github: 'https://github.com/janedoe',
        linkedin: 'https://linkedin.com/in/janedoe',
      }),
    )
    expect(links.map((l) => l.key)).toEqual(['linkedin', 'github', 'website'])
  })
})

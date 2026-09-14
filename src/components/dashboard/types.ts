import type { RouteLocationRaw } from 'vue-router'

export type ActionIconName =
  | 'eye'
  | 'share'
  | 'trash'
  | 'pencil'
  | 'plus'
  | 'lock'
  | 'copy'
  | 'check'
  | 'close'
  | 'refresh'
  | 'link-off'

/** One icon button in a DocumentCard's hover toolbar. */
export interface DocumentAction {
  key: string
  /** Accessible name and tooltip text — the button itself shows only the icon. */
  label: string
  icon: ActionIconName
  /** Navigate instead of running a handler. */
  to?: RouteLocationRaw
  onSelect?: () => void
  /** `primary` fills with the accent; `danger` tints red on hover. */
  tone?: 'default' | 'primary' | 'danger'
  /** Pro-gated for this user — shows a lock badge; the handler opens the upsell. */
  locked?: boolean
}

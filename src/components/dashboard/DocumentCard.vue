<script setup lang="ts">
  import type { RouteLocationRaw } from 'vue-router'
  import A4Thumbnail from './A4Thumbnail.vue'
  import ActionIcon from './ActionIcon.vue'
  import type { DocumentAction } from './types'

  // A saved document as a grid tile: live thumbnail, title, one meta line, and
  // an icon toolbar that rises in on hover / keyboard focus.
  //
  // Interaction model — the whole card is one big "open in editor" target (a
  // stretched link, so middle-click and "open in new tab" work), and the
  // toolbar buttons sit above it for the secondary actions. On touch screens,
  // which have no hover, the toolbar is simply always shown.
  withDefaults(
    defineProps<{
      title: string
      meta: string
      /** Where clicking the card itself goes. */
      to: RouteLocationRaw
      /** Accessible name for the card link, e.g. "Open “Acme” in the editor". */
      openLabel: string
      /** Accessible name for the toolbar group. */
      actionsLabel: string
      actions: DocumentAction[]
      active?: boolean
      activeLabel?: string
      /** Completion 0–1; renders a hairline progress bar under the meta line. */
      progress?: number | null
      loading?: boolean
      unavailableLabel?: string
    }>(),
    {
      active: false,
      activeLabel: '',
      progress: null,
      loading: false,
      unavailableLabel: '',
    },
  )
</script>

<template>
  <article class="doc-card relative" :class="{ 'doc-card--active': active }">
    <div class="doc-card__sheet">
      <A4Thumbnail :loading="loading" :unavailable-label="unavailableLabel || undefined">
        <slot />
      </A4Thumbnail>

      <div class="doc-card__scrim" aria-hidden="true" />

      <div class="doc-card__toolbar" role="toolbar" :aria-label="actionsLabel">
        <template v-for="(action, i) in actions" :key="action.key">
          <RouterLink
            v-if="action.to"
            :to="action.to"
            class="doc-card__action"
            :class="`doc-card__action--${action.tone ?? 'default'}`"
            :style="{ '--i': i }"
            :aria-label="action.label"
            :data-tip="action.label"
          >
            <ActionIcon :name="action.icon" class="w-[17px] h-[17px]" />
          </RouterLink>
          <button
            v-else
            type="button"
            class="doc-card__action"
            :class="`doc-card__action--${action.tone ?? 'default'}`"
            :style="{ '--i': i }"
            :aria-label="action.label"
            :data-tip="action.label"
            @click="action.onSelect?.()"
          >
            <ActionIcon :name="action.icon" class="w-[17px] h-[17px]" />
            <span v-if="action.locked" class="doc-card__lock" aria-hidden="true">
              <ActionIcon name="lock" class="w-[9px] h-[9px]" />
            </span>
          </button>
        </template>
      </div>
    </div>

    <div class="doc-card__caption">
      <div class="flex items-center gap-2 min-w-0">
        <h3 class="font-display text-[16.5px] leading-[1.2] tracking-editorial text-ink truncate">
          {{ title }}
        </h3>
        <span v-if="active && activeLabel" class="doc-card__chip mono-eyebrow">
          <span class="doc-card__chip-dot" aria-hidden="true" />{{ activeLabel }}
        </span>
      </div>
      <p class="mono-eyebrow text-[10px] mt-1.5 truncate" style="color: var(--muted)">
        {{ meta }}
      </p>
      <div
        v-if="progress !== null"
        class="mt-2.5 h-[2px] rounded-full overflow-hidden"
        style="background: var(--rule)"
      >
        <div
          class="h-full rounded-full transition-[width] duration-500"
          :style="{
            width: `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%`,
            background: 'var(--accent)',
          }"
        />
      </div>
    </div>

    <!-- Stretched primary link. Painted beneath the sheet and caption, which
         are pointer-transparent, so a click anywhere on the card lands here
         while the toolbar (pointer-events restored) still takes its own. -->
    <RouterLink :to="to" class="doc-card__link" :aria-label="openLabel" />
  </article>
</template>

<style scoped>
  .doc-card {
    --ease-out: cubic-bezier(0.2, 0.8, 0.2, 1);
  }

  .doc-card__link {
    position: absolute;
    inset: -6px;
    z-index: 1;
    border-radius: 14px;
  }
  .doc-card__link:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 2px;
  }

  .doc-card__sheet,
  .doc-card__caption {
    position: relative;
    z-index: 2;
    pointer-events: none;
  }

  /* ── The page ─────────────────────────────────────────────────── */
  .doc-card__sheet {
    border-radius: 8px;
    box-shadow:
      0 0 0 1px var(--rule),
      0 1px 2px rgba(0, 0, 0, 0.05);
    transition:
      transform 0.32s var(--ease-out),
      box-shadow 0.32s var(--ease-out);
  }
  .doc-card__sheet :deep(.a4-thumb) {
    border-radius: inherit;
  }
  .doc-card--active .doc-card__sheet {
    box-shadow:
      0 0 0 1.5px var(--accent),
      0 1px 2px rgba(0, 0, 0, 0.05);
  }

  .doc-card:hover .doc-card__sheet,
  .doc-card:focus-within .doc-card__sheet {
    transform: translateY(-4px);
    box-shadow:
      0 0 0 1px var(--rule-strong),
      0 18px 36px -18px rgba(0, 0, 0, 0.35),
      0 4px 10px -4px rgba(0, 0, 0, 0.12);
  }
  .doc-card--active:hover .doc-card__sheet,
  .doc-card--active:focus-within .doc-card__sheet {
    box-shadow:
      0 0 0 1.5px var(--accent),
      0 18px 36px -18px rgba(0, 0, 0, 0.35),
      0 4px 10px -4px rgba(0, 0, 0, 0.12);
  }

  /* Flat ink wash so the toolbar reads against busy document content. The
     sheet is always white, so this is a fixed ink tint, not a theme token. */
  .doc-card__scrim {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: rgba(18, 17, 15, 0.1);
    opacity: 0;
    transition: opacity 0.25s ease;
  }
  .doc-card:hover .doc-card__scrim,
  .doc-card:focus-within .doc-card__scrim {
    opacity: 1;
  }

  .doc-card__chip {
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 7px;
    border-radius: 999px;
    font-size: 8.5px;
    background: var(--accent);
    color: #ffffff;
  }
  .doc-card__chip-dot {
    width: 4px;
    height: 4px;
    border-radius: 999px;
    background: currentColor;
  }

  /* ── Hover toolbar ────────────────────────────────────────────── */
  .doc-card__toolbar {
    position: absolute;
    left: 50%;
    bottom: 10px;
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px;
    border-radius: 999px;
    background: rgba(18, 17, 15, 0.88);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    box-shadow: 0 8px 20px -8px rgba(0, 0, 0, 0.45);
    opacity: 0;
    transform: translate(-50%, 10px);
    transition:
      opacity 0.2s ease,
      transform 0.3s var(--ease-out);
  }
  .doc-card:hover .doc-card__toolbar,
  .doc-card:focus-within .doc-card__toolbar {
    opacity: 1;
    transform: translate(-50%, 0);
    pointer-events: auto;
  }

  .doc-card__action {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 999px;
    color: rgba(255, 255, 255, 0.86);
    opacity: 0;
    transform: translateY(6px) scale(0.9);
    transition:
      opacity 0.22s ease,
      transform 0.3s var(--ease-out),
      background-color 0.15s ease,
      color 0.15s ease;
    transition-delay: calc(var(--i, 0) * 35ms), calc(var(--i, 0) * 35ms), 0s, 0s;
  }
  .doc-card:hover .doc-card__action,
  .doc-card:focus-within .doc-card__action {
    opacity: 1;
    transform: none;
  }

  .doc-card__action:hover {
    background: rgba(255, 255, 255, 0.14);
    color: #ffffff;
  }
  .doc-card__action:focus-visible {
    outline: 2px solid #ffffff;
    outline-offset: -2px;
  }
  .doc-card__action--danger:hover {
    background: rgba(239, 68, 68, 0.22);
    color: #fca5a5;
  }
  .doc-card__action--primary {
    margin-left: 2px;
    background: var(--accent);
    color: #ffffff;
  }
  .doc-card__action--primary:hover {
    background: var(--accent-hover);
  }

  .doc-card__lock {
    position: absolute;
    top: 3px;
    right: 3px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 13px;
    height: 13px;
    border-radius: 999px;
    background: var(--accent);
    color: #ffffff;
  }

  /* Tooltip — the label the icon stands for, shown above the button. */
  .doc-card__action::after {
    content: attr(data-tip);
    position: absolute;
    bottom: calc(100% + 10px);
    left: 50%;
    padding: 4px 8px;
    border-radius: 6px;
    background: var(--ink);
    color: var(--paper);
    font-family: 'DM Sans', system-ui, sans-serif;
    font-size: 11.5px;
    font-weight: 500;
    line-height: 1.2;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transform: translate(-50%, 3px);
    transition:
      opacity 0.15s ease,
      transform 0.15s ease;
  }
  .doc-card__action:hover::after,
  .doc-card__action:focus-visible::after {
    opacity: 1;
    transform: translate(-50%, 0);
    transition-delay: 0.25s;
  }

  .doc-card__caption {
    padding: 12px 2px 0;
  }

  /* Touch screens have no hover: keep the toolbar visible, drop the lift. */
  @media (hover: none) {
    .doc-card__toolbar,
    .doc-card__action {
      opacity: 1;
      pointer-events: auto;
    }
    .doc-card__toolbar {
      transform: translate(-50%, 0);
    }
    .doc-card__action {
      transform: none;
    }
    .doc-card__action::after {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .doc-card__sheet,
    .doc-card__toolbar,
    .doc-card__action,
    .doc-card__action::after {
      transition-property: opacity, background-color, color, box-shadow;
      transition-delay: 0s;
    }
    .doc-card:hover .doc-card__sheet,
    .doc-card:focus-within .doc-card__sheet {
      transform: none;
    }
    .doc-card__toolbar,
    .doc-card:hover .doc-card__toolbar,
    .doc-card:focus-within .doc-card__toolbar {
      transform: translate(-50%, 0);
    }
    .doc-card__action {
      transform: none;
    }
  }
</style>

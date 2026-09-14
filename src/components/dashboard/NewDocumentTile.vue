<script setup lang="ts">
  import { RouterLink, type RouteLocationRaw } from 'vue-router'
  import ActionIcon from './ActionIcon.vue'
  import LoadingSpinner from '@/components/ui/LoadingSpinner.vue'
  import { A4_WIDTH_PX, A4_HEIGHT_PX } from '@/constants/layout'

  // The "add" slot at the end of a document grid. Same A4 footprint as a
  // DocumentCard so it lines up as the next page in the row. Renders as a link
  // when given `to`, otherwise as a button that emits `select`.
  defineProps<{
    label: string
    hint?: string
    to?: RouteLocationRaw
    busy?: boolean
    disabled?: boolean
  }>()
  const emit = defineEmits<{ select: [] }>()
</script>

<template>
  <component
    :is="to ? RouterLink : 'button'"
    v-bind="to ? { to } : { type: 'button', disabled: disabled || busy }"
    class="new-tile group flex flex-col text-left"
    :aria-busy="busy || undefined"
    @click="!to && emit('select')"
  >
    <span
      class="new-tile__sheet flex flex-col items-center justify-center gap-3 px-4 text-center"
      :style="{ aspectRatio: `${A4_WIDTH_PX} / ${A4_HEIGHT_PX}` }"
    >
      <span class="new-tile__icon" aria-hidden="true">
        <LoadingSpinner v-if="busy" size="sm" />
        <ActionIcon v-else name="plus" class="w-5 h-5" />
      </span>
      <span class="font-display text-[16px] leading-[1.2] tracking-editorial text-ink">
        {{ label }}
      </span>
      <span v-if="hint" class="text-[12px] leading-[1.45] text-muted max-w-[16ch]">
        {{ hint }}
      </span>
    </span>
  </component>
</template>

<style scoped>
  .new-tile {
    border-radius: 10px;
  }
  .new-tile:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 4px;
  }
  .new-tile:disabled {
    cursor: progress;
  }

  .new-tile__sheet {
    width: 100%;
    border-radius: 8px;
    border: 1.5px dashed var(--rule-strong);
    transition:
      border-color 0.25s ease,
      background-color 0.25s ease;
  }
  .new-tile:hover .new-tile__sheet,
  .new-tile:focus-visible .new-tile__sheet {
    border-color: var(--accent);
    background: color-mix(in oklab, var(--accent) 5%, transparent);
  }

  .new-tile__icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    border-radius: 999px;
    color: var(--accent);
    background: var(--accent-soft);
    transition:
      transform 0.3s cubic-bezier(0.2, 0.8, 0.2, 1),
      background-color 0.25s ease,
      color 0.25s ease;
  }
  .new-tile:hover .new-tile__icon,
  .new-tile:focus-visible .new-tile__icon {
    background: var(--accent);
    color: #ffffff;
    transform: rotate(90deg);
  }

  @media (prefers-reduced-motion: reduce) {
    .new-tile:hover .new-tile__icon,
    .new-tile:focus-visible .new-tile__icon {
      transform: none;
    }
  }
</style>

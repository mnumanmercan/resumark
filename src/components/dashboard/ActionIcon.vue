<script setup lang="ts">
  import type { ActionIconName } from './types'

  // Line icons for the dashboard's document actions. One stroke weight and one
  // 24px grid so the toolbar reads as a set.
  defineProps<{ name: ActionIconName }>()

  const PATHS: Record<ActionIconName, string[]> = {
    eye: [
      'M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z',
      'M12 14.75a2.75 2.75 0 100-5.5 2.75 2.75 0 000 5.5z',
    ],
    share: [
      'M12 3.5v11',
      'M8 7.25l4-3.75 4 3.75',
      'M7 11H6a1.5 1.5 0 00-1.5 1.5v6A1.5 1.5 0 006 20h12a1.5 1.5 0 001.5-1.5v-6A1.5 1.5 0 0018 11h-1',
    ],
    trash: [
      'M4.5 6.5h15',
      'M9.5 6.5V4.75A1.25 1.25 0 0110.75 3.5h2.5a1.25 1.25 0 011.25 1.25V6.5',
      'M6.5 6.5l.8 12.1A1.5 1.5 0 008.8 20h6.4a1.5 1.5 0 001.5-1.4l.8-12.1',
      'M10.25 10.5v5.5M13.75 10.5v5.5',
    ],
    pencil: [
      'M14.5 5.5l4 4',
      'M4 20l1-4.5L15.75 4.75a2 2 0 012.83 0l.67.67a2 2 0 010 2.83L8.5 19z',
    ],
    plus: ['M12 5v14M5 12h14'],
    lock: [
      'M6.5 10.5h11a1.5 1.5 0 011.5 1.5v6.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 015 18.5V12a1.5 1.5 0 011.5-1.5z',
      'M8.5 10.5V7.5a3.5 3.5 0 017 0v3',
    ],
    copy: [
      'M9 9h9.5a1.5 1.5 0 011.5 1.5V20a1.5 1.5 0 01-1.5 1.5H9A1.5 1.5 0 017.5 20v-9.5A1.5 1.5 0 019 9z',
      'M16.5 9V5.5A1.5 1.5 0 0015 4H5.5A1.5 1.5 0 004 5.5V15a1.5 1.5 0 001.5 1.5h2',
    ],
    check: ['M5 12.5l4.5 4.5L19 7.5'],
    close: ['M6 6l12 12M18 6L6 18'],
    refresh: ['M19.5 12a7.5 7.5 0 11-2.2-5.3', 'M19.5 4.5v4h-4'],
    'link-off': [
      'M10 14a4 4 0 005.66 0l3-3a4 4 0 00-5.66-5.66l-.75.75',
      'M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 005.66 5.66l.75-.75',
      'M4 4l16 16',
    ],
  }
</script>

<template>
  <svg
    class="shrink-0"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="(d, i) in PATHS[name]" :key="i" :d="d" />
  </svg>
</template>

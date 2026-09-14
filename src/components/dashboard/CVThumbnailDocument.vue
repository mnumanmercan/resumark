<script setup lang="ts">
  import { computed } from 'vue'
  import { getTemplate } from '@/components/templates/registry'
  import { DRAGGABLE_SECTION_KEYS, type CVData, type SectionKey } from '@/types/cv.types'

  // A CV rendered for a thumbnail. Same template components and base styles as
  // CVPreview, minus what only the real preview needs: no `#cv-preview` id
  // (the PDF export captures that element, and a dashboard shows several
  // CVs at once), no section-pulse wiring, and no drop shadow.
  const props = defineProps<{ data: CVData }>()

  const template = computed(() => getTemplate(props.data.meta.templateId))

  const sectionOrder = computed<SectionKey[]>(() => {
    const order = props.data.meta.sectionOrder
    return order && order.length > 0 ? order : [...DRAGGABLE_SECTION_KEYS]
  })

  const neverPulsed = (): boolean => false
</script>

<template>
  <div
    style="
      width: 794px;
      min-height: 1122px;
      background: #ffffff;
      font-family:
        'Inter',
        system-ui,
        -apple-system,
        'Segoe UI',
        Roboto,
        sans-serif;
      font-size: 11px;
      line-height: 1.5;
      color: #1a1a1a;
      box-sizing: border-box;
    "
  >
    <component
      :is="template.component"
      :cv-data="data"
      :is-pulsed="neverPulsed"
      :section-order="sectionOrder"
    />
  </div>
</template>

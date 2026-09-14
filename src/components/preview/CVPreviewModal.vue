<script setup lang="ts">
  import A4PreviewModal from '@/components/preview/A4PreviewModal.vue'
  import CVPreview from '@/components/preview/CVPreview.vue'
  import { useI18n } from '@/composables/useI18n'

  // Read-only CV viewer. Renders the store's active document through the same
  // #cv-preview element the builder captures, so the PDF is identical.
  defineProps<{ visible: boolean }>()
  const emit = defineEmits<{ close: [] }>()

  const { t } = useI18n()
</script>

<template>
  <A4PreviewModal
    :visible="visible"
    export-id="cv-preview"
    :dialog-label="t('preview.dialogLabel')"
    :download-label="t('aria.downloadCv')"
    confirm-overflow
    @close="emit('close')"
  >
    <CVPreview />
  </A4PreviewModal>
</template>

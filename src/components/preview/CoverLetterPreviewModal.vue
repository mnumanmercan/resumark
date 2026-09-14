<script setup lang="ts">
  import { storeToRefs } from 'pinia'
  import A4PreviewModal from '@/components/preview/A4PreviewModal.vue'
  import CoverLetterPreview from '@/components/cover-letter/CoverLetterPreview.vue'
  import { useCoverLetterStore } from '@/stores/coverLetterStore'
  import { useI18n } from '@/composables/useI18n'

  // Read-only cover letter viewer — the letter counterpart of CVPreviewModal.
  defineProps<{ visible: boolean }>()
  const emit = defineEmits<{ close: [] }>()

  const { t } = useI18n()
  const { clData } = storeToRefs(useCoverLetterStore())
</script>

<template>
  <A4PreviewModal
    :visible="visible"
    export-id="cover-letter-preview"
    :dialog-label="t('preview.coverLetterDialogLabel')"
    :download-label="t('aria.downloadCl')"
    @close="emit('close')"
  >
    <CoverLetterPreview :cl-data="clData" />
  </A4PreviewModal>
</template>

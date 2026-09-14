<script setup lang="ts">
  import { computed, onMounted, ref } from 'vue'
  import { RouterLink, useRouter } from 'vue-router'
  import { storeToRefs } from 'pinia'
  import AppHeader from '@/components/ui/AppHeader.vue'
  import UpgradePrompt from '@/components/ui/UpgradePrompt.vue'
  import CVPreviewModal from '@/components/preview/CVPreviewModal.vue'
  import CoverLetterPreviewModal from '@/components/preview/CoverLetterPreviewModal.vue'
  import ConfirmModal from '@/components/ui/ConfirmModal.vue'
  import DocumentCard from '@/components/dashboard/DocumentCard.vue'
  import NewDocumentTile from '@/components/dashboard/NewDocumentTile.vue'
  import ShareLinkDialog from '@/components/dashboard/ShareLinkDialog.vue'
  import CVThumbnailDocument from '@/components/dashboard/CVThumbnailDocument.vue'
  import CoverLetterPreview from '@/components/cover-letter/CoverLetterPreview.vue'
  import type { DocumentAction } from '@/components/dashboard/types'
  import { getTemplate } from '@/components/templates/registry'
  import { CV_VARIANT_LIMIT } from '@resumark/shared'
  import type { CVData } from '@/types/cv.types'
  import { useUserStore } from '@/stores/userStore'
  import { useCVStore } from '@/stores/cvStore'
  import { useCoverLetterStore } from '@/stores/coverLetterStore'
  import { useI18n } from '@/composables/useI18n'
  import { useVariantDocuments } from '@/composables/useVariantDocuments'
  import { localStorageService } from '@/services/storageService'

  const { t, t_obj } = useI18n()
  const router = useRouter()

  const userStore = useUserStore()
  const cvStore = useCVStore()
  const coverLetterStore = useCoverLetterStore()
  const { cvData, variants, activeVariantId } = storeToRefs(cvStore)
  const { clData } = storeToRefs(coverLetterStore)

  // Read-only preview popups.
  const showPreview = ref(false)
  const showLetterPreview = ref(false)

  /* ── Shared formatting ────────────────────────────────────── */

  const TOTAL_SECTIONS = 8

  function relativeTime(iso: string | undefined): string {
    if (!iso) return t('dashboard.lastSavedNever')
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
    if (mins < 1) return t('dashboard.lastSavedJustNow')
    if (mins < 60) return t('dashboard.lastSavedMins', { n: String(mins) })
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return t('dashboard.lastSavedHours', { n: String(hrs) })
    return t('dashboard.lastSavedDays', { n: String(Math.floor(hrs / 24)) })
  }

  function completedSections(cv: CVData): number {
    const p = cv.personal
    let n = 0
    if (p.fullName && p.email && p.phone && p.location && p.jobTitle) n++
    if (cv.summary.trim().length >= 50) n++
    if (cv.experience.length > 0) n++
    if (cv.education.length > 0) n++
    if (cv.skills.length > 0) n++
    if (cv.projects.length > 0) n++
    if (cv.certifications.length > 0) n++
    if (cv.languages.length > 0) n++
    return n
  }

  /**
   * "2h ago · Classic" — one scannable line under each thumbnail. Completion
   * is carried by the progress hairline beneath it, which survives truncation.
   */
  function cvMeta(cv: CVData | null, updatedAt: string | undefined): string {
    const time = relativeTime(updatedAt)
    return cv ? `${time} · ${getTemplate(cv.meta.templateId).name}` : time
  }

  /* ── CV versions (Pro) ────────────────────────────────────── */

  const { documents } = useVariantDocuments(variants, activeVariantId, cvData)

  /**
   * Open a version in the read-only preview. CVPreviewModal renders the
   * store's active document, so switching first is what makes the modal show
   * the card the user clicked — and it leaves them on that version, which is
   * the one "Edit" then opens.
   */
  async function viewVariant(id: string): Promise<void> {
    if (id !== activeVariantId.value) {
      await cvStore.switchVariant(id)
    }
    showPreview.value = true
  }

  /** The document the share dialog is open for. Null = closed. */
  const shareTarget = ref<{ id: string | null; title: string } | null>(null)

  const pendingDeleteId = ref<string | null>(null)
  const pendingDeleteName = computed(
    () => variants.value.find((v) => v.id === pendingDeleteId.value)?.title ?? '',
  )

  async function confirmDeleteVariant(): Promise<void> {
    const id = pendingDeleteId.value
    pendingDeleteId.value = null
    if (!id) return
    if (shareTarget.value?.id === id) shareTarget.value = null
    try {
      await cvStore.deleteVariant(id)
    } catch {
      /* non-fatal */
    }
  }

  const versionCards = computed(() =>
    variants.value.map((v) => {
      const state = documents.value.get(v.id) ?? { status: 'loading' as const }
      const data = state.status === 'ready' ? state.data : null
      const title = v.title || t('dashboard.yourCv')
      const actions: DocumentAction[] = [
        {
          key: 'preview',
          label: t('dashboard.actionPreview'),
          icon: 'eye',
          onSelect: () => void viewVariant(v.id),
        },
        {
          key: 'share',
          label: t('dashboard.actionShare'),
          icon: 'share',
          onSelect: () => (shareTarget.value = { id: v.id, title }),
        },
      ]
      // The last version can't be deleted — the builder needs a document.
      if (variants.value.length > 1) {
        actions.push({
          key: 'delete',
          label: t('dashboard.actionDelete'),
          icon: 'trash',
          tone: 'danger',
          onSelect: () => (pendingDeleteId.value = v.id),
        })
      }
      actions.push({
        key: 'edit',
        label: t('dashboard.actionEdit'),
        icon: 'pencil',
        tone: 'primary',
        to: `/builder/${v.id}`,
      })
      return {
        id: v.id,
        title,
        data,
        state: state.status,
        active: v.id === activeVariantId.value,
        meta: cvMeta(data, v.updatedAt),
        progress: data ? completedSections(data) / TOTAL_SECTIONS : null,
        actions,
      }
    }),
  )

  /* ── New version ──────────────────────────────────────────── */
  const creatingVersion = ref(false)
  const canCreateVersion = computed(
    () =>
      cvStore.canUseVariants &&
      variants.value.length > 0 &&
      variants.value.length < CV_VARIANT_LIMIT,
  )

  /**
   * One click to a new tailored version: duplicate the active CV under a
   * default name and drop straight into the editor, where it can be renamed
   * from the version tabs. Mirrors VariantTabs' create flow, minus the naming
   * step, so the dashboard stays a launchpad rather than a form.
   */
  async function createVersion(): Promise<void> {
    if (creatingVersion.value || !canCreateVersion.value) return
    creatingVersion.value = true
    try {
      const id = await cvStore.createVariant(
        t('builder.variants.defaultName', { n: String(variants.value.length + 1) }),
      )
      // null means the server rejected on the plan cap.
      if (!id) {
        userStore.openUpgradeModal('Multiple CVs')
        return
      }
      await router.push(`/builder/${id}`)
    } catch {
      // Non-fatal — the tile re-enables and the user can retry.
    } finally {
      creatingVersion.value = false
    }
  }

  /* ── Single CV card (Free, or Pro while the version list is unavailable) ── */
  const singleCvTitle = computed(() => cvData.value.personal.fullName || t('dashboard.yourCv'))

  const singleCvActions = computed<DocumentAction[]>(() => [
    {
      key: 'preview',
      label: t('dashboard.actionPreview'),
      icon: 'eye',
      onSelect: () => (showPreview.value = true),
    },
    userStore.isPremium
      ? {
          key: 'share',
          label: t('dashboard.actionShare'),
          icon: 'share',
          onSelect: () =>
            (shareTarget.value = {
              id: localStorageService.getActiveId(),
              title: singleCvTitle.value,
            }),
        }
      : {
          key: 'share',
          label: t('dashboard.actionShareLocked'),
          icon: 'share',
          locked: true,
          onSelect: () => userStore.openUpgradeModal('Share Link'),
        },
    {
      key: 'edit',
      label: t('dashboard.actionEdit'),
      icon: 'pencil',
      tone: 'primary',
      to: '/builder',
    },
  ])

  /* ── Cover letter ─────────────────────────────────────────── */
  const letterLoaded = ref(false)

  const hasCoverLetter = computed(() => {
    const d = clData.value
    return !!(
      d.fullName?.trim() ||
      d.email?.trim() ||
      d.companyName?.trim() ||
      d.recipientName?.trim() ||
      d.opening?.trim() ||
      d.bodyWhy?.trim() ||
      d.bodyBring?.trim() ||
      d.closing?.trim()
    )
  })

  const letterTitle = computed(
    () => clData.value.companyName?.trim() || t('dashboard.coverLetterUntitled'),
  )

  const letterMeta = computed(() => {
    const time = relativeTime(clData.value.meta.updatedAt)
    return clData.value.companyName?.trim()
      ? `${t('dashboard.coverLetterUntitled')} · ${time}`
      : time
  })

  const letterActions = computed<DocumentAction[]>(() => [
    {
      key: 'preview',
      label: t('dashboard.actionPreview'),
      icon: 'eye',
      onSelect: () => (showLetterPreview.value = true),
    },
    {
      key: 'edit',
      label: t('dashboard.actionEdit'),
      icon: 'pencil',
      tone: 'primary',
      to: '/cover-letter',
    },
  ])

  const coverLetterHeading = computed(() =>
    t_obj<{ prefix: string; accent: string; suffix: string }>('dashboard.coverLetterHeading'),
  )

  /* ── Locked Pro features (Free) ───────────────────────────── */
  const lockedFeatures = computed(() => [
    {
      glyph: '◊',
      title: t('dashboard.cloudSyncTitle'),
      desc: t('dashboard.cloudSyncDesc'),
      trigger: 'Cloud Sync',
    },
    {
      glyph: '▦',
      title: t('dashboard.multipleCvsTitle'),
      desc: t('dashboard.multipleCvsDesc'),
      trigger: 'Multiple CVs',
    },
    {
      glyph: '⇪',
      title: t('share.proOnlyTitle'),
      desc: t('share.proOnlyDesc'),
      trigger: 'Share Link',
    },
  ])

  onMounted(async () => {
    // The letter loads alongside the CV — neither blocks the other's card.
    const letterLoad = coverLetterStore
      .loadFromStorage()
      .catch(() => {
        // Offline / rate-limited: the card falls back to the seeded local copy.
      })
      .finally(() => (letterLoaded.value = true))

    // Hydrate the store from the active backend so the cards and the preview
    // reflect the user's real, current CV (a direct refresh into /dashboard
    // would otherwise show empty in-memory defaults).
    try {
      await cvStore.loadFromStorage()
    } catch {
      // Cloud load failed (offline / rate-limited). The cards fall back to
      // whatever is already in the store — nothing else to do here, and we
      // must not let the rejection surface as an uncaught promise error.
    }

    // Populate the version list — a slim id/title/updatedAt read, no content.
    // Thumbnails for the non-active versions are then fetched by
    // useVariantDocuments; share state is fetched only when a dialog opens.
    await cvStore.loadVariants()
    await letterLoad
  })
</script>

<template>
  <div class="min-h-screen flex flex-col" style="background: var(--paper)">
    <AppHeader />

    <main class="flex-1 max-w-5xl mx-auto w-full px-6 py-12">
      <!-- ── Welcome row ──────────────────────────────────────── -->
      <div class="mb-10 stagger-item">
        <p class="mono-eyebrow mb-3">
          {{ userStore.isPremium ? t('dashboard.planPro') : t('dashboard.planFree') }}
        </p>
        <h1
          class="font-display leading-[1.05] tracking-editorial text-ink mb-2 flex items-baseline flex-wrap gap-x-3"
          :style="{ fontSize: 'clamp(36px, 5vw, 52px)' }"
        >
          <span>{{ t('dashboard.welcomePrefix') }}</span>
          <span class="accent-italic">{{
            userStore.user?.name?.split(' ')[0] ?? t('dashboard.welcomeFallback')
          }}</span>
          <span class="text-ink">.</span>
        </h1>
        <p class="text-muted text-[14.5px] leading-[1.55] max-w-xl">
          {{ userStore.isPremium ? t('dashboard.welcomeDescPro') : t('dashboard.welcomeDescFree') }}
        </p>
      </div>

      <!-- ══════════════ FREE PLAN ══════════════ -->
      <template v-if="!userStore.isPremium">
        <section class="mb-12 stagger-item" aria-labelledby="documents-heading">
          <h2 id="documents-heading" class="mono-eyebrow mb-5">
            {{ t('dashboard.documentsEyebrow') }}
          </h2>

          <ul class="doc-grid" role="list">
            <li>
              <DocumentCard
                :title="singleCvTitle"
                :meta="cvMeta(cvData, cvData.meta.updatedAt)"
                :progress="completedSections(cvData) / TOTAL_SECTIONS"
                to="/builder"
                :open-label="t('dashboard.openInEditor', { name: singleCvTitle })"
                :actions-label="t('dashboard.actionsFor', { name: singleCvTitle })"
                :actions="singleCvActions"
              >
                <CVThumbnailDocument :data="cvData" />
              </DocumentCard>
            </li>

            <li>
              <DocumentCard
                v-if="hasCoverLetter || !letterLoaded"
                :title="letterTitle"
                :meta="letterMeta"
                :loading="!hasCoverLetter"
                to="/cover-letter"
                :open-label="t('dashboard.openInEditor', { name: letterTitle })"
                :actions-label="t('dashboard.actionsFor', { name: letterTitle })"
                :actions="letterActions"
              >
                <CoverLetterPreview :cl-data="clData" :preview-id="null" />
              </DocumentCard>
              <NewDocumentTile
                v-else
                :label="t('dashboard.coverLetterEmptyTitle')"
                to="/cover-letter"
              />
            </li>
          </ul>
        </section>

        <!-- Unlock with Pro — Pro Plan card wraps the feature subcards -->
        <div class="stagger-item">
          <p class="mono-eyebrow mb-4">{{ t('dashboard.unlock') }}</p>

          <!-- Pro Plan container card (full width) -->
          <div class="paper-card p-5 relative">
            <!-- Soon badge -->
            <div
              class="absolute -top-3 right-5 px-3 py-1 rounded-full text-[10px] font-mono font-semibold tracking-[0.16em] uppercase shadow-md"
              style="background: var(--accent); color: #ffffff; white-space: nowrap"
              aria-label="Coming soon"
            >
              {{ t('dashboard.proCardBadge') }}
            </div>

            <!-- Header row — single line -->
            <div class="flex items-center gap-4 mb-5">
              <span
                class="font-display text-[24px] leading-none shrink-0"
                :style="{ color: 'var(--accent)' }"
                aria-hidden="true"
                >✦</span
              >
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-1.5 mb-0.5">
                  <h3 class="font-display text-[17px] leading-tight text-ink">
                    {{ t('dashboard.proCardName') }}
                  </h3>
                  <span
                    class="mono-eyebrow text-[9px] px-1.5 py-px rounded-full text-white leading-none"
                    :style="{ background: 'var(--accent)' }"
                    >Pro</span
                  >
                </div>
                <p class="text-[13px] text-muted leading-none">
                  {{ t('dashboard.proCardDesc') }}
                </p>
              </div>
              <button
                type="button"
                class="btn-ghost shrink-0 text-[13px]"
                @click="userStore.openUpgradeModal('pro plan')"
              >
                {{ t('dashboard.getNotified') }}
              </button>
            </div>

            <!-- Feature subcards -->
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div
                v-for="feat in lockedFeatures"
                :key="feat.title"
                class="rounded-xl p-4 flex flex-col gap-2.5 border border-overlay/8"
                style="background: var(--paper)"
              >
                <div class="flex items-center gap-2">
                  <span
                    class="font-display text-[20px] leading-none"
                    :style="{ color: 'var(--accent)' }"
                    aria-hidden="true"
                    >{{ feat.glyph }}</span
                  >
                  <h4 class="font-display text-[15px] leading-tight text-ink">{{ feat.title }}</h4>
                  <span
                    class="mono-eyebrow text-[9px] px-1.5 py-px rounded-full text-white leading-none"
                    :style="{ background: 'var(--accent)' }"
                    >Pro</span
                  >
                </div>
                <p class="text-[12.5px] text-muted leading-[1.55]">{{ feat.desc }}</p>
                <button
                  type="button"
                  class="mono-eyebrow text-[10.5px] text-left transition-colors hover:opacity-80"
                  :style="{ color: 'var(--accent)' }"
                  @click="userStore.openUpgradeModal(feat.trigger)"
                >
                  {{ t('dashboard.getNotified') }} →
                </button>
              </div>
            </div>
          </div>
        </div>
      </template>

      <!-- ══════════════ PRO PLAN ══════════════ -->
      <template v-else>
        <!--
          CV versions — one card per tailored CV. Each is a complete,
          independently shareable document, so share state is per-card.
        -->
        <section class="mb-12 stagger-item" aria-labelledby="versions-heading">
          <div class="flex items-baseline justify-between gap-3 mb-5">
            <h2 id="versions-heading" class="mono-eyebrow">
              {{ t('builder.variants.eyebrow') }}
            </h2>
            <span
              v-if="variants.length > 0"
              class="mono-eyebrow text-[10px]"
              style="color: var(--muted)"
            >
              {{ variants.length }} / {{ CV_VARIANT_LIMIT }}
            </span>
          </div>

          <ul class="doc-grid" role="list">
            <!--
              Fallback when the version list is unavailable (offline, or the
              slim GET /cv was rate-limited). Without it a Pro user would land
              on a dashboard with no CV card at all.
            -->
            <li v-if="variants.length === 0">
              <DocumentCard
                :title="singleCvTitle"
                :meta="cvMeta(cvData, cvData.meta.updatedAt)"
                :progress="completedSections(cvData) / TOTAL_SECTIONS"
                to="/builder"
                :open-label="t('dashboard.openInEditor', { name: singleCvTitle })"
                :actions-label="t('dashboard.actionsFor', { name: singleCvTitle })"
                :actions="singleCvActions"
              >
                <CVThumbnailDocument :data="cvData" />
              </DocumentCard>
            </li>

            <li v-for="card in versionCards" :key="card.id">
              <DocumentCard
                :title="card.title"
                :meta="card.meta"
                :progress="card.progress"
                :active="card.active"
                :active-label="t('dashboard.activeBadge')"
                :loading="card.state === 'loading'"
                :unavailable-label="
                  card.state === 'error' ? t('dashboard.thumbnailUnavailable') : ''
                "
                :to="`/builder/${card.id}`"
                :open-label="t('dashboard.openInEditor', { name: card.title })"
                :actions-label="t('dashboard.actionsFor', { name: card.title })"
                :actions="card.actions"
              >
                <CVThumbnailDocument v-if="card.data" :data="card.data" />
              </DocumentCard>
            </li>

            <li v-if="canCreateVersion">
              <NewDocumentTile
                :label="t('builder.variants.addLabel')"
                :hint="t('dashboard.newVersionHint')"
                :busy="creatingVersion"
                @select="createVersion"
              />
            </li>
          </ul>

          <p v-if="variants.length >= CV_VARIANT_LIMIT" class="text-[12.5px] text-muted mt-6">
            {{ t('builder.variants.limitReached', { n: String(CV_VARIANT_LIMIT) }) }}
          </p>
        </section>

        <!-- Cover letter — the card plus the editorial pitch beside it -->
        <section class="mb-12 stagger-item" aria-labelledby="letter-heading">
          <h2 id="letter-heading" class="mono-eyebrow mb-5">
            {{ t('dashboard.coverLetterEyebrow') }}
          </h2>

          <div class="doc-grid">
            <div>
              <DocumentCard
                v-if="hasCoverLetter || !letterLoaded"
                :title="letterTitle"
                :meta="letterMeta"
                :loading="!hasCoverLetter"
                to="/cover-letter"
                :open-label="t('dashboard.openInEditor', { name: letterTitle })"
                :actions-label="t('dashboard.actionsFor', { name: letterTitle })"
                :actions="letterActions"
              >
                <CoverLetterPreview :cl-data="clData" :preview-id="null" />
              </DocumentCard>
              <NewDocumentTile
                v-else
                :label="t('dashboard.coverLetterEmptyTitle')"
                to="/cover-letter"
              />
            </div>

            <div class="col-span-2 lg:col-span-3 flex flex-col justify-center sm:pl-2 lg:pl-6">
              <h3
                class="font-display text-[24px] sm:text-[28px] leading-[1.1] tracking-editorial text-ink mb-3"
              >
                {{ coverLetterHeading.prefix
                }}<span class="accent-italic">{{ coverLetterHeading.accent }}</span
                >{{ coverLetterHeading.suffix }}
              </h3>
              <p class="text-[13.5px] text-muted mb-5 leading-[1.55] max-w-md">
                {{ t('dashboard.coverLetterDesc') }}
              </p>
              <RouterLink to="/cover-letter" class="btn-ghost self-start -ml-3 text-[13px]">
                {{ t('dashboard.coverLetterButton') }}
                <svg
                  class="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2.5"
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </RouterLink>
            </div>
          </div>
        </section>

        <!-- Stats row -->
        <div class="stagger-item">
          <p class="mono-eyebrow mb-4">{{ t('dashboard.statsEyebrow') }}</p>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div
              v-for="stat in [
                { label: t('dashboard.statsCvsCreated'), value: String(variants.length || 1) },
                { label: t('dashboard.statsCoverLetters'), value: hasCoverLetter ? '1' : '0' },
                { label: t('dashboard.statsPdfDownloads'), value: '—' },
              ]"
              :key="stat.label"
              class="paper-card px-5 py-5 text-center"
            >
              <p class="font-display text-[36px] leading-none tracking-editorial text-ink mb-1.5">
                {{ stat.value }}
              </p>
              <p class="mono-eyebrow text-[10.5px]">{{ stat.label }}</p>
            </div>
          </div>
        </div>
      </template>
    </main>

    <CVPreviewModal :visible="showPreview" @close="showPreview = false" />
    <CoverLetterPreviewModal :visible="showLetterPreview" @close="showLetterPreview = false" />

    <ShareLinkDialog
      :visible="shareTarget !== null"
      :cv-id="shareTarget?.id ?? null"
      :document-title="shareTarget?.title ?? ''"
      @close="shareTarget = null"
    />

    <ConfirmModal
      :visible="pendingDeleteId !== null"
      :title="t('builder.variants.deleteTitle', { name: pendingDeleteName })"
      :message="t('builder.variants.deleteMessage')"
      :confirm-label="t('builder.variants.deleteConfirm')"
      @confirm="confirmDeleteVariant"
      @cancel="pendingDeleteId = null"
    />

    <UpgradePrompt />
  </div>
</template>

<style scoped>
  /* One grid for every document shelf: pages sit at a consistent width so a
     CV and a cover letter line up column-for-column across sections. */
  .doc-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 16px;
    row-gap: 32px;
  }
  @media (min-width: 640px) {
    .doc-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      column-gap: 24px;
      row-gap: 36px;
    }
  }
  @media (min-width: 1024px) {
    .doc-grid {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }
</style>

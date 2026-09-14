<script setup lang="ts">
  import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
  import ActionIcon from './ActionIcon.vue'
  import { useI18n } from '@/composables/useI18n'
  import {
    getShareStatus,
    createShareLink,
    regenerateShareLink,
    removeShareLink,
    resolveActiveCvId,
    buildShareUrl,
  } from '@/services/cvShareService'

  // Public share link for one CV version. Share state is per-version — each
  // row has its own slug — so the dialog is bound to whichever card opened it.
  // A dialog rather than the old inline panel: expanding a panel inside a grid
  // cell would reflow every card around it.
  const props = defineProps<{
    visible: boolean
    /** The version to share. Null falls back to the most-recently-updated CV. */
    cvId: string | null
    documentTitle: string
  }>()
  const emit = defineEmits<{ close: [] }>()

  const { t } = useI18n()

  const resolvedId = ref<string | null>(null)
  const slug = ref<string | null>(null)
  const statusLoading = ref(false)
  const busy = ref(false)
  const error = ref(false)
  const justCopied = ref(false)
  const panelEl = ref<HTMLElement | null>(null)

  const shareUrl = computed(() => (slug.value ? buildShareUrl(slug.value) : ''))

  // Guards against a slow status response for a previously opened card landing
  // after the user has already opened a different one.
  let openSeq = 0

  watch(
    () => [props.visible, props.cvId] as const,
    async ([open]) => {
      if (!open) return
      const seq = ++openSeq
      resolvedId.value = props.cvId
      slug.value = null
      error.value = false
      justCopied.value = false
      statusLoading.value = true
      void nextTick(() => panelEl.value?.focus())
      try {
        const id = await ensureId()
        if (seq !== openSeq || !id) return
        const status = await getShareStatus(id)
        if (seq === openSeq) slug.value = status.slug
      } catch {
        // Non-fatal — the dialog falls back to its "create link" state.
      } finally {
        if (seq === openSeq) statusLoading.value = false
      }
    },
    { immediate: true },
  )

  async function ensureId(): Promise<string | null> {
    if (resolvedId.value) return resolvedId.value
    resolvedId.value = await resolveActiveCvId()
    return resolvedId.value
  }

  async function run(fn: (id: string) => Promise<unknown>): Promise<void> {
    if (busy.value) return
    busy.value = true
    error.value = false
    try {
      const id = await ensureId()
      if (!id) {
        error.value = true
        return
      }
      await fn(id)
    } catch {
      error.value = true
    } finally {
      busy.value = false
    }
  }

  function onCreate(): void {
    void run(async (id) => {
      slug.value = (await createShareLink(id)).slug
    })
  }

  function onRegenerate(): void {
    void run(async (id) => {
      slug.value = (await regenerateShareLink(id)).slug
    })
  }

  function onTurnOff(): void {
    void run(async (id) => {
      await removeShareLink(id)
      slug.value = null
    })
  }

  let copiedTimer: ReturnType<typeof setTimeout> | null = null

  async function copyUrl(): Promise<void> {
    if (!shareUrl.value) return
    try {
      await navigator.clipboard.writeText(shareUrl.value)
      justCopied.value = true
      if (copiedTimer) clearTimeout(copiedTimer)
      copiedTimer = setTimeout(() => (justCopied.value = false), 1500)
    } catch {
      error.value = true
    }
  }

  function onKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape' && props.visible) emit('close')
  }

  onMounted(() => window.addEventListener('keydown', onKeydown))
  onUnmounted(() => {
    window.removeEventListener('keydown', onKeydown)
    if (copiedTimer) clearTimeout(copiedTimer)
  })
</script>

<template>
  <Teleport to="body">
    <Transition name="share-dialog">
      <div
        v-if="visible"
        class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-dialog-title"
      >
        <div
          class="share-dialog__backdrop absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="emit('close')"
        />

        <div
          ref="panelEl"
          tabindex="-1"
          class="share-dialog__panel relative w-full max-w-md rounded-2xl border p-6 shadow-2xl focus:outline-none"
          style="background: var(--card); border-color: var(--rule)"
        >
          <div class="flex items-start gap-3 mb-4">
            <span
              class="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
              style="background: var(--accent-soft); color: var(--accent)"
              aria-hidden="true"
            >
              <ActionIcon name="share" class="w-[18px] h-[18px]" />
            </span>
            <div class="flex-1 min-w-0">
              <h2
                id="share-dialog-title"
                class="font-display text-[21px] leading-[1.15] tracking-editorial text-ink"
              >
                {{ t('share.panelTitle') }}
              </h2>
              <p class="mono-eyebrow text-[10px] mt-1.5 truncate" style="color: var(--muted)">
                {{ documentTitle }}
              </p>
            </div>
            <button
              type="button"
              class="w-8 h-8 -mr-2 -mt-1 rounded-full flex items-center justify-center text-muted hover:text-ink hover:bg-overlay/5 transition-colors"
              :aria-label="t('share.close')"
              @click="emit('close')"
            >
              <ActionIcon name="close" class="w-4 h-4" />
            </button>
          </div>

          <p class="text-[13px] text-muted leading-[1.55] mb-5">
            {{ t('share.panelDesc') }}
          </p>

          <div v-if="statusLoading" class="h-[42px] rounded-lg share-dialog__skeleton" />

          <button
            v-else-if="!slug"
            type="button"
            class="btn-primary text-[13px] w-full justify-center"
            :disabled="busy"
            @click="onCreate"
          >
            <ActionIcon name="share" class="w-4 h-4" />
            {{ busy ? t('share.creating') : t('share.create') }}
          </button>

          <div v-else class="flex flex-col gap-3">
            <label for="share-dialog-url" class="mono-eyebrow text-[10.5px]">
              {{ t('share.linkLabel') }}
            </label>
            <div
              class="flex items-center gap-1 rounded-lg border border-[color:var(--rule-strong)] pl-3 pr-1 py-1 focus-within:border-[color:var(--accent)] transition-colors"
              style="background: var(--paper)"
            >
              <input
                id="share-dialog-url"
                type="text"
                readonly
                :value="shareUrl"
                class="flex-1 min-w-0 bg-transparent text-[13px] text-ink py-1.5 focus:outline-none"
                @focus="($event.target as HTMLInputElement).select()"
              />
              <button
                type="button"
                class="btn-primary text-[12.5px] !py-1.5 !px-3 shrink-0"
                @click="copyUrl"
              >
                <ActionIcon :name="justCopied ? 'check' : 'copy'" class="w-3.5 h-3.5" />
                <span aria-live="polite">{{
                  justCopied ? t('share.copied') : t('share.copy')
                }}</span>
              </button>
            </div>
            <p class="text-[12px] text-muted leading-[1.5]">{{ t('share.activeHint') }}</p>
            <div class="flex items-center gap-1 -ml-2">
              <button
                type="button"
                class="btn-ghost text-[12.5px]"
                :disabled="busy"
                @click="onRegenerate"
              >
                <ActionIcon name="refresh" class="w-3.5 h-3.5" />
                {{ t('share.regenerate') }}
              </button>
              <button
                type="button"
                class="btn-ghost text-[12.5px]"
                :disabled="busy"
                @click="onTurnOff"
              >
                <ActionIcon name="link-off" class="w-3.5 h-3.5" />
                {{ t('share.turnOff') }}
              </button>
            </div>
          </div>

          <p v-if="error" class="text-[12.5px] mt-3" role="alert" style="color: var(--accent)">
            {{ t('share.error') }}
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
  .share-dialog-enter-active,
  .share-dialog-leave-active {
    transition: opacity 0.2s ease;
  }
  .share-dialog-enter-active .share-dialog__panel,
  .share-dialog-leave-active .share-dialog__panel {
    transition: transform 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .share-dialog-enter-from,
  .share-dialog-leave-to {
    opacity: 0;
  }
  .share-dialog-enter-from .share-dialog__panel,
  .share-dialog-leave-to .share-dialog__panel {
    transform: translateY(12px) scale(0.98);
  }

  .share-dialog__skeleton {
    background: var(--paper-2);
  }
  @media (prefers-reduced-motion: no-preference) {
    .share-dialog__skeleton {
      animation: shareSkeleton 1.4s ease-in-out infinite;
    }
  }
  @keyframes shareSkeleton {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .share-dialog-enter-from .share-dialog__panel,
    .share-dialog-leave-to .share-dialog__panel {
      transform: none;
    }
  }
</style>

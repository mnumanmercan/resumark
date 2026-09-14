import { computed, shallowReactive, watch, type Ref } from 'vue'
import { migrateCVData, type CVData } from '@/types/cv.types'
import { localStorageService, type CVSummary } from '@/services/storageService'
import { applySharedSections, cloneCV } from '@/services/cvVariants'

export type VariantDocumentState =
  | { status: 'ready'; data: CVData }
  | { status: 'loading' }
  | { status: 'error' }

// Fetched sibling documents, keyed by `id@updatedAt` so an edited version is
// refetched while an untouched one is served straight from memory when the
// user comes back to the dashboard. Module-scoped on purpose — it outlives the
// view. Ids are server UUIDs, so entries can never surface for another account.
const documentCache = new Map<string, CVData>()

function cacheKey(v: CVSummary): string {
  return `${v.id}@${v.updatedAt}`
}

/**
 * Content for every CV version's dashboard thumbnail.
 *
 * `cvStore.variants` is a slim list (no content), and the store deliberately
 * keeps siblings unloaded until the user switches to one. Thumbnails need the
 * content, so this reads each sibling with the id-addressed `loadById` — a
 * read-only path that never touches the store's active pointer, its variant
 * cache, or auto-save.
 *
 * The active version is always rendered from the live store document. Siblings
 * get the active document's shared sections (name, contact, education…)
 * applied to a display copy — exactly what the store does when the user opens
 * one — so a thumbnail never shows a stale name the editor would immediately
 * replace.
 */
export function useVariantDocuments(
  variants: Ref<CVSummary[]>,
  activeId: Ref<string | null>,
  activeDoc: Ref<CVData>,
) {
  // Shallow: the documents are only ever replaced, never mutated in place, so
  // deep proxies over every CV would be pure overhead.
  const fetched = shallowReactive(new Map<string, CVData>())
  const failed = shallowReactive(new Set<string>())
  const inFlight = new Set<string>()

  async function fetchSibling(v: CVSummary): Promise<void> {
    const key = cacheKey(v)
    const cached = documentCache.get(key)
    if (cached) {
      fetched.set(key, cached)
      return
    }
    if (inFlight.has(key)) return
    inFlight.add(key)
    failed.delete(key)
    try {
      const raw = await localStorageService.loadById(v.id)
      if (!raw) throw new Error('not found')
      const doc = migrateCVData(raw)
      documentCache.set(key, doc)
      fetched.set(key, doc)
    } catch {
      failed.add(key)
    } finally {
      inFlight.delete(key)
    }
  }

  watch(
    [variants, activeId],
    ([list, active]) => {
      if (!localStorageService.supportsMultiple) return
      for (const v of list) {
        if (v.id !== active) void fetchSibling(v)
      }
    },
    { immediate: true },
  )

  // When the active version changes on this page (Preview switches to the
  // version it opens), keep the outgoing document as that card's thumbnail —
  // otherwise it would flash back to a loading sheet while it is refetched.
  watch([activeId, () => activeDoc.value], ([id], [prevId, prevDoc]) => {
    if (!prevId || prevId === id || !prevDoc) return
    const summary = variants.value.find((v) => v.id === prevId)
    if (!summary) return
    const snapshot = cloneCV(prevDoc)
    documentCache.set(cacheKey(summary), snapshot)
    fetched.set(cacheKey(summary), snapshot)
  })

  const documents = computed(() => {
    const out = new Map<string, VariantDocumentState>()
    for (const v of variants.value) {
      if (v.id === activeId.value) {
        out.set(v.id, { status: 'ready', data: activeDoc.value })
        continue
      }
      const key = cacheKey(v)
      const doc = fetched.get(key)
      if (doc) {
        const view = cloneCV(doc)
        applySharedSections(activeDoc.value, view)
        out.set(v.id, { status: 'ready', data: view })
      } else {
        out.set(v.id, failed.has(key) ? { status: 'error' } : { status: 'loading' })
      }
    }
    return out
  })

  return { documents }
}

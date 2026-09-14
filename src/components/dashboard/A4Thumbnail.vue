<script setup lang="ts">
  import { onMounted, onUnmounted, ref } from 'vue'
  import { A4_WIDTH_PX, A4_HEIGHT_PX } from '@/constants/layout'

  // A live, scaled-down render of an A4 document. The slot renders at natural
  // 794×1122 size and is scaled to the container's width, so the thumbnail is
  // pixel-faithful to the real preview at any grid column width.
  //
  // The rendered copy is `inert` + aria-hidden: templates contain real links
  // (LinkedIn, GitHub…) that must not become tab stops or screen-reader noise
  // inside a card whose actions live elsewhere.
  defineProps<{
    /** Show the placeholder sheet while the document is still being fetched. */
    loading?: boolean
    /** Replace the render with a quiet placeholder label (fetch failed). */
    unavailableLabel?: string
  }>()

  const el = ref<HTMLElement | null>(null)
  const scale = ref(0)
  let observer: ResizeObserver | null = null

  function measure(): void {
    if (el.value) scale.value = el.value.clientWidth / A4_WIDTH_PX
  }

  onMounted(() => {
    measure()
    if (typeof ResizeObserver !== 'undefined' && el.value) {
      observer = new ResizeObserver(measure)
      observer.observe(el.value)
    }
  })

  onUnmounted(() => observer?.disconnect())
</script>

<template>
  <div
    ref="el"
    class="a4-thumb relative w-full overflow-hidden"
    :style="{ aspectRatio: `${A4_WIDTH_PX} / ${A4_HEIGHT_PX}` }"
  >
    <div
      v-if="!loading && !unavailableLabel && scale > 0"
      class="absolute top-0 left-0 pointer-events-none select-none"
      :style="{
        width: `${A4_WIDTH_PX}px`,
        height: `${A4_HEIGHT_PX}px`,
        transform: `scale(${scale})`,
        transformOrigin: 'top left',
      }"
      aria-hidden="true"
      inert
    >
      <slot />
    </div>

    <!-- Placeholder sheet: a few ruled lines hinting at a document -->
    <div v-else class="absolute inset-0 flex flex-col p-[9%] gap-[5%]" aria-hidden="true">
      <div
        class="a4-thumb__bar"
        :class="{ 'a4-thumb__bar--shimmer': loading }"
        style="width: 55%; height: 5%"
      />
      <div
        class="a4-thumb__bar"
        :class="{ 'a4-thumb__bar--shimmer': loading }"
        style="width: 35%"
      />
      <div class="mt-[4%] flex flex-col gap-[3.5%]">
        <div
          v-for="w in [92, 86, 90, 60]"
          :key="w"
          class="a4-thumb__bar"
          :class="{ 'a4-thumb__bar--shimmer': loading }"
          :style="{ width: `${w}%` }"
        />
      </div>
      <p
        v-if="unavailableLabel"
        class="mt-auto text-center mono-eyebrow text-[9px]"
        style="color: #8a8478"
      >
        {{ unavailableLabel }}
      </p>
    </div>
  </div>
</template>

<style scoped>
  /* The sheet itself is always paper-white — it is a picture of the printed
     document, not UI chrome, so it does not follow the app theme. */
  .a4-thumb {
    background: #ffffff;
  }

  .a4-thumb__bar {
    height: 2.2%;
    min-height: 4px;
    border-radius: 2px;
    background: #ece8e0;
  }

  @media (prefers-reduced-motion: no-preference) {
    .a4-thumb__bar--shimmer {
      animation: thumbPulse 1.4s ease-in-out infinite;
    }
  }

  @keyframes thumbPulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.45;
    }
  }
</style>

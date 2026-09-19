<script setup lang="ts">
  import { computed } from 'vue'
  import type { CVData, SectionKey } from '@/types/cv.types'

  const props = defineProps<{
    cvData: CVData
    isPulsed: (section: SectionKey) => boolean
  }>()

  const hasProjects = computed(() => props.cvData.projects.length > 0)
</script>

<template>
  <section
    v-if="hasProjects"
    :class="isPulsed('projects') ? 'section-pulse' : ''"
    style="margin-bottom: 12px"
  >
    <h2 class="cv-section-heading">Projects</h2>
    <div
      v-for="(project, index) in cvData.projects"
      :key="project.id"
      :style="index > 0 ? 'margin-top: 10px;' : ''"
    >
      <div style="display: flex; align-items: center; gap: 6px">
        <p style="font-size: 12px; font-weight: 700; color: #111827; margin: 0">
          {{ project.name }}
        </p>
        <a
          v-if="project.link"
          :href="project.link"
          target="_blank"
          rel="noopener noreferrer"
          :title="project.link"
          style="
            display: inline-flex;
            align-items: center;
            flex-shrink: 0;
            color: #b8532a;
            text-decoration: none;
            line-height: 1;
          "
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
        </a>
      </div>
      <p style="font-size: 10.5px; color: #374151; margin: 3px 0 2px 0; line-height: 1.55">
        {{ project.description }}
      </p>
      <div
        v-if="project.techStack.length"
        style="display: flex; align-items: flex-start; gap: 5px; margin-top: 3px"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="11"
          height="11"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#b8532a"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
          style="flex-shrink: 0; margin-top: 1.5px"
        >
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
        <p
          style="
            font-size: 9.5px;
            font-style: italic;
            color: #6b7280;
            letter-spacing: 0.01em;
            margin: 0;
            line-height: 1.5;
          "
        >
          {{ project.techStack.join(' · ') }}
        </p>
      </div>
    </div>
  </section>
</template>

<style scoped>
  .cv-section-heading {
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #111827;
    border-bottom: 1.5px solid #d1d5db;
    padding-bottom: 5px;
    margin: 0 0 6px 0;
  }
</style>

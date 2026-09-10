<script setup lang="ts">
import { computed, ref } from 'vue'

export interface CodeVariant {
  id?: string
  language: string
  framework: string
  code: string
  note?: string
}

const props = withDefaults(defineProps<{
  variants: CodeVariant[]
  defaultLanguage?: string
  defaultFramework?: string
  showFramework?: boolean
}>(), {
  showFramework: true,
})

const firstVariant = props.variants[0]
const initialLanguage = props.defaultLanguage && props.variants.some(it => it.language === props.defaultLanguage)
  ? props.defaultLanguage
  : firstVariant?.language ?? ''
const initialFramework = props.defaultFramework && props.variants.some(it =>
  it.language === initialLanguage && it.framework === props.defaultFramework,
)
  ? props.defaultFramework
  : props.variants.find(it => it.language === initialLanguage)?.framework ?? firstVariant?.framework ?? ''

const selectedLanguage = ref(initialLanguage)
const selectedFramework = ref(initialFramework)
const copied = ref(false)

const languageOptions = computed(() => Array.from(new Set(props.variants.map(it => it.language))))
const frameworkOptions = computed(() => Array.from(new Set(
  props.variants
    .filter(it => it.language === selectedLanguage.value)
    .map(it => it.framework),
)))

const currentVariant = computed<CodeVariant>(() => {
  return props.variants.find(it =>
    it.language === selectedLanguage.value && it.framework === selectedFramework.value,
  )
    ?? props.variants.find(it => it.language === selectedLanguage.value)
    ?? props.variants[0]
    ?? { language: '', framework: '', code: '' }
})

function selectLanguage(language: string) {
  selectedLanguage.value = language
  const firstForLanguage = props.variants.find(it => it.language === language)
  if (firstForLanguage && !props.variants.some(it =>
    it.language === language && it.framework === selectedFramework.value,
  )) {
    selectedFramework.value = firstForLanguage.framework
  }
}

function selectFramework(framework: string) {
  selectedFramework.value = framework
  const firstForFramework = props.variants.find(it =>
    it.language === selectedLanguage.value && it.framework === framework,
  )
  if (firstForFramework) selectedLanguage.value = firstForFramework.language
}

async function copyCode() {
  const code = currentVariant.value.code
  try {
    await navigator.clipboard.writeText(code)
  } catch {
    const textarea = document.createElement('textarea')
    textarea.value = code
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
  }
  copied.value = true
  window.setTimeout(() => copied.value = false, 1600)
}
</script>

<template>
  <div class="ako-code-switch">
    <div class="ako-code-switch__toolbar">
      <div v-if="languageOptions.length > 1" class="ako-code-switch__selector">
        <span class="ako-code-switch__label">语言</span>
        <button
          v-for="language in languageOptions"
          :key="language"
          class="ako-code-switch__tab"
          :class="{ 'is-active': selectedLanguage === language }"
          type="button"
          @click="selectLanguage(language)"
        >
          {{ language }}
        </button>
      </div>

      <div v-if="showFramework && frameworkOptions.length > 1" class="ako-code-switch__selector">
        <span class="ako-code-switch__label">框架</span>
        <button
          v-for="framework in frameworkOptions"
          :key="framework"
          class="ako-code-switch__tab"
          :class="{ 'is-active': selectedFramework === framework }"
          type="button"
          @click="selectFramework(framework)"
        >
          {{ framework }}
        </button>
      </div>

      <button class="ako-code-switch__copy" type="button" @click="copyCode">
        {{ copied ? '已复制' : '复制代码' }}
      </button>
    </div>

    <div class="ako-code-switch__meta">
      <span>{{ currentVariant.language }}</span>
      <span aria-hidden="true">·</span>
      <span>{{ currentVariant.framework }}</span>
    </div>
    <pre><code>{{ currentVariant.code }}</code></pre>
    <p v-if="currentVariant.note" class="ako-code-switch__note">{{ currentVariant.note }}</p>
  </div>
</template>

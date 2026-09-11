import { ref } from 'vue'

export const codeSwitchStorageKey = 'ako-code-switch-framework'
export const codeSwitchLanguageStorageKey = 'ako-code-switch-language'
export const selectedCodeFramework = ref<string | null>(null)
export const selectedCodeLanguage = ref<string | null>(null)
export const codeSwitchInteractionRevision = ref(0)

let initialized = false
let nextInteractionId = 0
let activeInteraction: { element: HTMLElement; id: number; pending: number } | null = null

export interface CodeSwitchInteractionUpdate {
  interactionId: number
  completed: boolean
}

export function beginCodeSwitchInteraction(element: HTMLElement | null) {
  if (!element) return null
  const interaction = { element, id: ++nextInteractionId, pending: 0 }
  activeInteraction = interaction
  codeSwitchInteractionRevision.value += 1
  setTimeout(() => {
    if (activeInteraction?.id === interaction.id && interaction.pending === 0) {
      activeInteraction = null
      codeSwitchInteractionRevision.value += 1
    }
  }, 1000)
  return interaction.id
}

export function getActiveCodeSwitchInteraction() {
  return activeInteraction
}

export function registerCodeSwitchUpdate(interactionId: number): CodeSwitchInteractionUpdate | null {
  if (!activeInteraction || activeInteraction.id !== interactionId) return null
  activeInteraction.pending += 1
  codeSwitchInteractionRevision.value += 1
  return { interactionId, completed: false }
}

export function completeCodeSwitchUpdate(update: CodeSwitchInteractionUpdate) {
  if (update.completed) return
  update.completed = true
  if (activeInteraction?.id !== update.interactionId) return
  activeInteraction.pending = Math.max(0, activeInteraction.pending - 1)
  codeSwitchInteractionRevision.value += 1
}

export function clearCodeSwitchInteraction(element: HTMLElement, id: number) {
  if (activeInteraction?.element === element && activeInteraction.id === id) {
    activeInteraction = null
    codeSwitchInteractionRevision.value += 1
  }
}

function readStoredFramework(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(codeSwitchStorageKey)
  } catch {
    return null
  }
}

function readStoredLanguage(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(codeSwitchLanguageStorageKey)
  } catch {
    return null
  }
}

function updateFromEvent(event: Event) {
  if (event instanceof StorageEvent) {
    if (event.key === codeSwitchStorageKey) selectedCodeFramework.value = event.newValue
    if (event.key === codeSwitchLanguageStorageKey) selectedCodeLanguage.value = event.newValue
    return
  }

  const value = (event as CustomEvent<string | null>).detail
  if (typeof value !== 'string' && value !== null) return
  if (event.type === 'ako-code-switch-framework-change') selectedCodeFramework.value = value
  if (event.type === 'ako-code-switch-language-change') selectedCodeLanguage.value = value
}

export function initializeCodeSwitchState() {
  if (typeof window === 'undefined') return selectedCodeFramework

  if (!initialized) {
    selectedCodeFramework.value = readStoredFramework()
    selectedCodeLanguage.value = readStoredLanguage()
    window.addEventListener('storage', updateFromEvent)
    window.addEventListener('ako-code-switch-framework-change', updateFromEvent)
    window.addEventListener('ako-code-switch-language-change', updateFromEvent)
    initialized = true
  }

  return selectedCodeFramework
}

export function setCodeFramework(framework: string) {
  initializeCodeSwitchState()
  selectedCodeFramework.value = framework

  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(codeSwitchStorageKey, framework)
  } catch {
    // Private browsing or a restrictive browser policy may disable storage.
  }

  window.dispatchEvent(new CustomEvent('ako-code-switch-framework-change', {
    detail: framework,
  }))
}

export function setCodeLanguage(language: string) {
  initializeCodeSwitchState()
  selectedCodeLanguage.value = language

  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(codeSwitchLanguageStorageKey, language)
  } catch {
    // Private browsing or a restrictive browser policy may disable storage.
  }

  window.dispatchEvent(new CustomEvent('ako-code-switch-language-change', {
    detail: language,
  }))
}

import { ref } from 'vue'

export const codeSwitchStorageKey = 'ako-code-switch-framework'
export const selectedCodeFramework = ref<string | null>(null)

let initialized = false

function readStoredFramework(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(codeSwitchStorageKey)
  } catch {
    return null
  }
}

function updateFromEvent(event: Event) {
  if (event instanceof StorageEvent) {
    if (event.key !== codeSwitchStorageKey) return
    selectedCodeFramework.value = event.newValue
    return
  }

  const value = (event as CustomEvent<string | null>).detail
  if (typeof value === 'string' || value === null) selectedCodeFramework.value = value
}

export function initializeCodeSwitchState() {
  if (typeof window === 'undefined') return selectedCodeFramework

  if (!initialized) {
    selectedCodeFramework.value = readStoredFramework()
    window.addEventListener('storage', updateFromEvent)
    window.addEventListener('ako-code-switch-framework-change', updateFromEvent)
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

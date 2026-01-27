import { useState, useEffect } from 'react'

type Mode = 'light' | 'dark'
type ColorTheme = 'cyan' | 'violet' | 'blue' | 'green' | 'orange' | 'rose'

const MODE_KEY = 'nimbus-mode'
const COLOR_KEY = 'nimbus-color'

export const colorThemes: { id: ColorTheme; name: string; color: string }[] = [
  { id: 'cyan', name: '青色', color: '#22d3ee' },
  { id: 'violet', name: '紫色', color: '#a78bfa' },
  { id: 'blue', name: '蓝色', color: '#3b82f6' },
  { id: 'green', name: '绿色', color: '#22c55e' },
  { id: 'orange', name: '橙色', color: '#f97316' },
  { id: 'rose', name: '玫红', color: '#f43f5e' },
]

export function useTheme() {
  const [mode, setModeState] = useState<Mode>(() => {
    if (typeof window === 'undefined') return 'dark'
    const saved = localStorage.getItem(MODE_KEY)
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  })

  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() => {
    if (typeof window === 'undefined') return 'cyan'
    const saved = localStorage.getItem(COLOR_KEY) as ColorTheme
    if (colorThemes.some(t => t.id === saved)) return saved
    return 'cyan'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', mode)
    document.documentElement.setAttribute('data-color', colorTheme)
    localStorage.setItem(MODE_KEY, mode)
    localStorage.setItem(COLOR_KEY, colorTheme)
  }, [mode, colorTheme])

  const setMode = (newMode: Mode) => setModeState(newMode)
  const toggleMode = () => setModeState(m => m === 'dark' ? 'light' : 'dark')
  const setColorTheme = (newColor: ColorTheme) => setColorThemeState(newColor)

  // 兼容旧 API
  const theme = mode
  const setTheme = setMode
  const toggleTheme = toggleMode

  return {
    mode,
    setMode,
    toggleMode,
    colorTheme,
    setColorTheme,
    // 兼容旧 API
    theme,
    setTheme,
    toggleTheme
  }
}

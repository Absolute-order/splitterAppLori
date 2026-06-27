import React, { ReactNode, useEffect } from 'react'
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native'
import { StatusBar } from 'expo-status-bar'
import { useColorScheme, Platform } from 'react-native'
import { useAppStore } from '@/shared/lib/stores/app-store'
import * as NavigationBar from 'expo-navigation-bar'
import * as SystemUI from 'expo-system-ui'

const DARK_BG = '#121212'
const LIGHT_BG = '#FFFFFF'

const darkNavigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: '#2ECC71',
    background: DARK_BG,
    card: DARK_BG,
    border: '#333333',
    text: '#F5F5F5',
    notification: '#2ECC71',
  },
}

const lightNavigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#2ECC71',
    background: LIGHT_BG,
    card: LIGHT_BG,
    border: '#E4E7EB',
    text: '#1A1A1A',
    notification: '#2ECC71',
  },
}

function useIsDarkMode(): boolean {
  const themeSetting = useAppStore((s) => s.theme)
  const systemScheme = useColorScheme()
  if (themeSetting === 'system') {
    return systemScheme === 'dark'
  }
  return themeSetting === 'dark'
}

export function NavigationThemeWrapper({ children }: { children: ReactNode }) {
  const isDark = useIsDarkMode()

  // Keep navigation bar in sync when user changes theme in settings.
  // Edge-to-edge: use SystemUI for root background, NavigationBar for button style only.
  useEffect(() => {
    if (Platform.OS === 'android') {
      SystemUI.setBackgroundColorAsync(isDark ? DARK_BG : LIGHT_BG)
      NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark')
    }
  }, [isDark])

  return (
    <ThemeProvider value={isDark ? darkNavigationTheme : lightNavigationTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {children}
    </ThemeProvider>
  )
}


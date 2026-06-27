import { Platform, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as NavigationBar from 'expo-navigation-bar';
import * as SystemUI from 'expo-system-ui';

// Set Android navigation bar color IMMEDIATELY at app startup,
// before React/Expo Router mounts — no zustand, no providers, no delays.
// Edge-to-edge mode: setBackgroundColorAsync on NavigationBar is not supported,
// so we use SystemUI to set the root view background instead.
if (Platform.OS === 'android') {
  AsyncStorage.getItem('app-store').then((raw) => {
    try {
      const theme = raw ? JSON.parse(raw)?.state?.theme : 'light';
      const isDark =
        theme === 'system'
          ? Appearance.getColorScheme() === 'dark'
          : theme === 'dark';
      SystemUI.setBackgroundColorAsync(isDark ? '#121212' : '#FFFFFF');
      NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
    } catch {}
  });
}

import 'expo-router/entry';

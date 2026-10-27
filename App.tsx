import 'react-native-get-random-values';
import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
import React, { useEffect, useState, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Newsreader_400Regular,
  Newsreader_400Regular_Italic,
  Newsreader_500Medium,
} from '@expo-google-fonts/newsreader';
import {
  Geist_300Light,
  Geist_400Regular,
  Geist_500Medium,
} from '@expo-google-fonts/geist';
import { resolveBootRoute, BootRoute } from './client/src/lib/bootRoute';
import { storage } from './client/src/lib/storage';
import { auth } from './client/src/lib/auth';
import { navigationRef, resetToLockEnter } from './client/src/lib/navigationRef';
import { RootStackParamList } from './client/src/types/navigation';
import { ToastProvider } from './client/src/components/AppToast';
import { AppPrivacyCover } from './client/src/components/AppPrivacyCover';
import { RootNavigator } from './client/src/navigation/RootNavigator';
import { colors } from './client/src/theme';

SplashScreen.preventAutoHideAsync();
enableScreens();

export default function App() {
  const [boot, setBoot] = useState<BootRoute | null>(null);
  const [appReady, setAppReady] = useState(false);
  const [privacyCoverVisible, setPrivacyCoverVisible] = useState(false);

  const [fontsLoaded] = useFonts({
    Newsreader_400Regular,
    Newsreader_400Regular_Italic,
    Newsreader_500Medium,
    Geist_300Light,
    Geist_400Regular,
    Geist_500Medium,
  });

  useEffect(() => {
    (async () => {
      const route = await resolveBootRoute();
      setBoot(route);
    })();
  }, []);

  const appState = useRef(AppState.currentState);
  useEffect(() => {
    const sub = AppState.addEventListener('change', async (next: AppStateStatus) => {
      if (next === 'inactive' || next === 'background') {
        setPrivacyCoverVisible(true);
      }
      if (next === 'background') {
        auth.onAppBackground();
      }

      if (next === 'active') {
        setPrivacyCoverVisible(false);
        const stillAuthed = await auth.onAppForeground();
        if (!stillAuthed) {
          resetToLockEnter();
        } else if (auth.isAuthenticated()) {
          await storage.runAutoDeleteMaintenance();
        }
      }

      appState.current = next;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (fontsLoaded && boot) {
      SplashScreen.hideAsync();
      setAppReady(true);
    }
  }, [fontsLoaded, boot]);

  if (!appReady || !boot) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colors.bg,
        }}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const lockParams =
    boot.name === 'Lock' ? (boot.params as RootStackParamList['Lock']) : undefined;

  return (
    <KeyboardProvider>
    <SafeAreaProvider>
      <ToastProvider>
        <NavigationContainer ref={navigationRef}>
          <View style={{ flex: 1, backgroundColor: colors.bg }}>
            <RootNavigator
              initialRouteName={boot.name}
              lockInitialParams={lockParams}
            />
            <AppPrivacyCover visible={privacyCoverVisible} />
          </View>
        </NavigationContainer>
        <StatusBar style="light" backgroundColor={colors.bg} />
      </ToastProvider>
      </SafeAreaProvider>
    </KeyboardProvider>
  );
}

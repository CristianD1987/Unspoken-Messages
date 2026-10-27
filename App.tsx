import 'react-native-get-random-values';
import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, AppStateStatus, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { NavigationContainer } from '@react-navigation/native';
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
import {
  safeResolveBootRoute,
  bootToInitialNavigationState,
  BOOT_RESOLVE_TIMEOUT_MS,
  type BootRoute,
} from './client/src/lib/bootRoute';
import { storage } from './client/src/lib/storage';
import { auth } from './client/src/lib/auth';
import { navigationRef, resetAfterSessionEnded } from './client/src/lib/navigationRef';
import { createBootNavigationTracer } from './client/src/lib/bootNavigationTrace';
import { ToastProvider } from './client/src/components/AppToast';
import { AppPrivacyCover } from './client/src/components/AppPrivacyCover';
import { BootErrorScreen } from './client/src/components/BootErrorScreen';
import { RootNavigator } from './client/src/navigation/RootNavigator';
import { colors } from './client/src/theme';

SplashScreen.preventAutoHideAsync();
enableScreens();

export default function App() {
  const [boot, setBoot] = useState<BootRoute | null>(null);
  const [bootAttempt, setBootAttempt] = useState(0);
  const [bootTimedOut, setBootTimedOut] = useState(false);
  const [navReady, setNavReady] = useState(false);
  const [privacyCoverVisible, setPrivacyCoverVisible] = useState(false);
  const splashHidden = useRef(false);
  const bootTimedOutRef = useRef(false);

  const [fontsLoaded] = useFonts({
    Newsreader_400Regular,
    Newsreader_400Regular_Italic,
    Newsreader_500Medium,
    Geist_300Light,
    Geist_400Regular,
    Geist_500Medium,
  });

  const bootTracer = useMemo(() => createBootNavigationTracer(navigationRef), []);

  const hideSplashOnce = useCallback(async () => {
    if (splashHidden.current) return;
    splashHidden.current = true;
    await SplashScreen.hideAsync();
    if (__DEV__) {
      console.log('[boot nav] SplashScreen.hideAsync');
    }
  }, []);

  const retryBoot = useCallback(() => {
    bootTimedOutRef.current = false;
    setBootTimedOut(false);
    setBoot(null);
    setNavReady(false);
    setBootAttempt((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    bootTimedOutRef.current = false;
    setBootTimedOut(false);
    setBoot(null);
    setNavReady(false);

    const timeoutId = setTimeout(() => {
      if (cancelled) return;
      bootTimedOutRef.current = true;
      setBootTimedOut(true);
      void hideSplashOnce();
    }, BOOT_RESOLVE_TIMEOUT_MS);

    (async () => {
      const { route, recoveredFromError } = await safeResolveBootRoute();
      if (cancelled || bootTimedOutRef.current) return;
      clearTimeout(timeoutId);
      if (__DEV__) {
        console.log('[boot nav] resolveBootRoute →', route.name, route, {
          recoveredFromError,
        });
      }
      setBoot(route);
      if (recoveredFromError) {
        void hideSplashOnce();
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [bootAttempt, hideSplashOnce]);

  const onNavigationReady = useCallback(() => {
    bootTracer.onReady();
    setNavReady(true);
  }, [bootTracer]);

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
        const stillAuthed = await auth.onAppForeground();
        if (!stillAuthed) {
          await resetAfterSessionEnded({ animate: false });
        } else if (auth.isAuthenticated()) {
          await storage.runAutoDeleteMaintenance();
        }
        setPrivacyCoverVisible(false);
      }

      appState.current = next;
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (fontsLoaded && boot && navReady) {
      void hideSplashOnce();
    }
  }, [fontsLoaded, boot, navReady, hideSplashOnce]);

  if (bootTimedOut && !boot) {
    return (
      <SafeAreaProvider>
        <BootErrorScreen onRetry={retryBoot} />
        <StatusBar style="light" backgroundColor={colors.bg} />
      </SafeAreaProvider>
    );
  }

  const bootResolved = fontsLoaded && boot !== null;

  if (!bootResolved || !boot) {
    return null;
  }

  const initialNavigationState = bootToInitialNavigationState(boot);
  bootTracer.onMount();

  return (
    <KeyboardProvider>
      <SafeAreaProvider>
        <ToastProvider>
          <NavigationContainer
            key={bootAttempt}
            ref={navigationRef}
            initialState={initialNavigationState}
            onReady={onNavigationReady}
            onStateChange={__DEV__ ? bootTracer.onStateChange : undefined}
          >
            <View style={{ flex: 1, backgroundColor: colors.bg }}>
              <RootNavigator />
              <AppPrivacyCover visible={privacyCoverVisible} />
            </View>
          </NavigationContainer>
          <StatusBar style="light" backgroundColor={colors.bg} />
        </ToastProvider>
      </SafeAreaProvider>
    </KeyboardProvider>
  );
}

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import { RootStackParamList } from '@/types/navigation';
import { colors } from '@/theme';

import IntroPage from '@/pages/intro';
import OnboardingPage from '@/pages/onboarding';
import LockPage from '@/pages/lock';
import HomePage from '@/pages/home';
import ChatPage from '@/pages/chat';
import SettingsPage from '@/pages/settings';
import TermsPage from '@/pages/terms';
import DataRecoveryPage from '@/pages/data-recovery';

const Stack = createNativeStackNavigator<RootStackParamList>();

function instantIfRequested(route: {
  params?: { instantTransition?: boolean };
}): NativeStackNavigationOptions {
  return route.params?.instantTransition ? { animation: 'none' } : {};
}

export function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen
        name="Intro"
        component={IntroPage}
        options={({ route }) => instantIfRequested(route)}
      />
      <Stack.Screen name="Onboarding" component={OnboardingPage} />
      <Stack.Screen
        name="Lock"
        component={LockPage}
        options={({ route }) => instantIfRequested(route)}
      />
      <Stack.Screen name="Home" component={HomePage} />
      <Stack.Screen name="Chat" component={ChatPage} />
      <Stack.Screen name="Settings" component={SettingsPage} />
      <Stack.Screen name="Terms" component={TermsPage} />
      <Stack.Screen
        name="DataRecovery"
        component={DataRecoveryPage}
        options={({ route }) => instantIfRequested(route)}
      />
    </Stack.Navigator>
  );
}

export type RootStackParamList = {
  Intro: undefined;
  Onboarding: undefined;
  Lock: { mode?: 'create' | 'enter' | 'change' } | undefined;
  Home: undefined;
  Chat: { contactId: string };
  Settings: { pinUpdated?: boolean } | undefined;
  Terms: { requireAccept?: boolean } | undefined;
  DataRecovery: undefined;
};

/** Where Lock should return if withdraw-consent PIN step is canceled. */
export type WithdrawCancelReturn =
  | { name: 'Terms'; params?: { requireAccept?: boolean; returnAfterWithdrawCancel?: WithdrawCancelReturn } }
  | { name: 'Settings'; params?: { pinUpdated?: boolean } };

export type RootStackParamList = {
  Intro: undefined;
  Onboarding: undefined;
  Lock:
    | {
        mode?: 'create' | 'enter' | 'change';
        intent?: 'withdrawConsent' | 'confirmEnableEraseOnFailedAttempts';
        returnAfterWithdrawCancel?: WithdrawCancelReturn;
      }
    | undefined;
  Home: undefined;
  Chat: { contactId: string };
  Settings: { pinUpdated?: boolean } | undefined;
  Terms:
    | {
        requireAccept?: boolean;
        returnAfterWithdrawCancel?: WithdrawCancelReturn;
      }
    | undefined;
  DataRecovery: undefined;
};

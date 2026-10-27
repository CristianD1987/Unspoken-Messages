import { Platform, TextStyle, ViewStyle } from 'react-native';

export const colors = {
  bg: '#111320',
  surface1: '#1A1D2D',
  surface2: '#23273A',
  surface3: '#2B3046',
  bubble: '#2C2A4A',
  text: '#ECEAF4',
  textMuted: '#9C9FB8',
  textFaint: '#6E7290',
  divider: 'rgba(236,234,244,0.06)',
  border: 'rgba(236,234,244,0.08)',
  accent: '#B9A8F5',
  accentInk: '#1A1530',
  accentSoft: 'rgba(185,168,245,0.12)',
  accentSoftStrong: 'rgba(185,168,245,0.14)',
  keyPressed: '#3A3560',
  disabledSend: '#2F3349',
  disabledCreate: '#3A3E58',
  closure: '#9CCBB5',
  closureInk: '#10241B',
  closureSoft: 'rgba(156,203,181,0.12)',
  closureSoftStrong: 'rgba(156,203,181,0.14)',
  closureBorder: 'rgba(156,203,181,0.3)',
  danger: '#EE8E8E',
  dangerInk: '#2A1012',
  pinDotEmpty: '#4A4E6A',
  backdrop: 'rgba(5,6,12,0.65)',
} as const;

export const avatarColors = [
  '#B9A8F5',
  '#9CCBB5',
  '#E8B4A0',
  '#8FB4E8',
  '#E3C98A',
] as const;

export const radii = {
  pill: 999,
  sheetTop: 30,
  card: 22,
  sheetRowGroup: 20,
  input: 16,
  emptyTile: 24,
  bubble: { topLeft: 20, topRight: 20, bottomRight: 6, bottomLeft: 20 },
  lockCard: 18,
} as const;

export const spacing = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  xxl: 14,
  xxxl: 16,
  xxxxl: 18,
  section: 20,
  screen: 24,
  large: 28,
} as const;

export const shadows = {
  primaryFloating: {
    shadowColor: 'rgba(185,168,245,0.25)',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 1,
    shadowRadius: 30,
    elevation: 8,
  },
  toast: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 30,
    elevation: 12,
  },
} as const;

export const fonts = {
  serif: 'Newsreader_400Regular',
  serifMedium: 'Newsreader_500Medium',
  serifItalic: 'Newsreader_400Regular_Italic',
  sansLight: 'Geist_300Light',
  sans: 'Geist_400Regular',
  sansMedium: 'Geist_500Medium',
} as const;

export const typography = {
  screenTitle: {
    fontFamily: fonts.serif,
    fontSize: 40,
    lineHeight: 40,
    letterSpacing: -0.8,
    color: colors.text,
  } satisfies TextStyle,
  lockTitle: {
    fontFamily: fonts.serif,
    fontSize: 34,
    lineHeight: 37,
    letterSpacing: -0.5,
    color: colors.text,
    textAlign: 'center',
  } satisfies TextStyle,
  sheetTitle: {
    fontFamily: fonts.serif,
    fontSize: 26,
    color: colors.text,
  } satisfies TextStyle,
  chatIntro: {
    fontFamily: fonts.serif,
    fontSize: 24,
    color: colors.text,
    textAlign: 'center',
  } satisfies TextStyle,
  cardTitle: {
    fontFamily: fonts.serif,
    fontSize: 21,
    color: colors.text,
  } satisfies TextStyle,
  wordmark: {
    fontFamily: fonts.serifItalic,
    fontSize: 19,
    color: colors.accent,
  } satisfies TextStyle,
  rowName: {
    fontFamily: fonts.sansMedium,
    fontSize: 17,
    color: colors.text,
  } satisfies TextStyle,
  body: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.text,
  } satisfies TextStyle,
  bodyMedium: {
    fontFamily: fonts.sansMedium,
    fontSize: 16,
    color: colors.text,
  } satisfies TextStyle,
  bubble: {
    fontFamily: fonts.sans,
    fontSize: 15.5,
    lineHeight: 22.5,
    color: colors.text,
  } satisfies TextStyle,
  preview: {
    fontFamily: fonts.sans,
    fontSize: 14,
    color: colors.textMuted,
  } satisfies TextStyle,
  caption: {
    fontFamily: fonts.sans,
    fontSize: 13,
    color: colors.textFaint,
  } satisfies TextStyle,
  captionSmall: {
    fontFamily: fonts.sans,
    fontSize: 12,
    color: colors.textFaint,
  } satisfies TextStyle,
  sectionLabel: {
    fontFamily: fonts.sansMedium,
    fontSize: 12,
    letterSpacing: 0.96,
    textTransform: 'uppercase',
    color: colors.textFaint,
  } satisfies TextStyle,
  badge: {
    fontFamily: fonts.sansMedium,
    fontSize: 11,
    letterSpacing: 0.44,
    textTransform: 'uppercase',
  } satisfies TextStyle,
  keypadDigit: {
    fontFamily: fonts.sansLight,
    fontSize: 30,
    color: colors.text,
  } satisfies TextStyle,
  toast: {
    fontFamily: fonts.sansMedium,
    fontSize: 14,
    color: colors.bg,
  } satisfies TextStyle,
} as const;

export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 };

export const hairline: ViewStyle = {
  height: 1,
  backgroundColor: colors.divider,
};

export const screenPadding = {
  horizontal: spacing.section,
  horizontalWide: spacing.screen,
} as const;

export const isIOS = Platform.OS === 'ios';

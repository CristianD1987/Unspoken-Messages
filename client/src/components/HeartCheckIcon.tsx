import React from 'react';
import Svg, { Path } from 'react-native-svg';
import { colors } from '@/theme';

type Props = { size?: number; color?: string; strokeWidth?: number };

export function HeartCheckIcon({
  size = 20,
  color = colors.closure,
  strokeWidth = 1.6,
}: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 21c-4-2.5-7-6-7-10a7 7 0 0 1 14 0c0 4-3 7.5-7 10z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 11l2 2 4-4"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

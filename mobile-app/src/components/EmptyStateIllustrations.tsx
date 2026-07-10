import React from 'react';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';

interface IllustrationProps {
  color: string;
  size?: number;
}

// Small inline empty-state illustrations — same flat-geometric language as the
// onboarding set, scaled down for use inside cards/lists rather than full screens.

export const NoScansIllustration = ({ color, size = 120 }: IllustrationProps) => (
  <Svg width={size} height={size} viewBox="0 0 120 120">
    <Circle cx={60} cy={62} r={48} fill={color} opacity={0.08} />
    {/* dotted radar ring — "ready, nothing found yet" */}
    <Circle cx={60} cy={62} r={38} fill="none" stroke={color} strokeWidth={2} strokeDasharray="3,6" opacity={0.35} />
    {/* shield */}
    <Path d="M60 24 L88 36 L88 62 Q88 90 60 104 Q32 90 32 62 L32 36 Z" fill={color} opacity={0.85} />
    <Path d="M60 24 L88 36 L88 62 Q88 90 60 104 Q32 90 32 62 L32 36 Z" fill="none" stroke={color} strokeWidth={1.5} opacity={0.4} />
    <Path d="M46 62 L57 73 L78 48" stroke="#0d1117" strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </Svg>
);

export const NoHistoryIllustration = ({ color, size = 120 }: IllustrationProps) => (
  <Svg width={size} height={size} viewBox="0 0 120 120">
    <Circle cx={60} cy={62} r={48} fill={color} opacity={0.08} />
    {/* stacked empty list card behind the clock */}
    <Rect x={28} y={70} width={56} height={30} rx={6} fill={color} opacity={0.12} />
    <Rect x={38} y={80} width={36} height={5} rx={2.5} fill={color} opacity={0.3} />
    <Rect x={38} y={90} width={24} height={5} rx={2.5} fill={color} opacity={0.22} />
    {/* clock */}
    <Circle cx={68} cy={50} r={26} fill={color} opacity={0.85} />
    <Circle cx={68} cy={50} r={26} fill="none" stroke={color} strokeWidth={1.5} opacity={0.4} />
    <Line x1={68} y1={50} x2={68} y2={36} stroke="#0d1117" strokeWidth={4} strokeLinecap="round" />
    <Line x1={68} y1={50} x2={78} y2={54} stroke="#0d1117" strokeWidth={4} strokeLinecap="round" />
  </Svg>
);

export const RadarEmptyIllustration = ({ color, size = 120 }: IllustrationProps) => (
  <Svg width={size} height={size} viewBox="0 0 120 120">
    <Circle cx={60} cy={60} r={48} fill={color} opacity={0.06} />
    <Circle cx={60} cy={60} r={36} fill="none" stroke={color} strokeWidth={1.5} opacity={0.3} />
    <Circle cx={60} cy={60} r={22} fill="none" stroke={color} strokeWidth={1.5} opacity={0.3} />
    <Circle cx={60} cy={60} r={8} fill="none" stroke={color} strokeWidth={1.5} opacity={0.3} />
    {/* sweep wedge */}
    <Path d="M60 60 L60 12 A48 48 0 0 1 100 34 Z" fill={color} opacity={0.18} />
    <Line x1={60} y1={60} x2={22} y2={86} stroke={color} strokeWidth={2} opacity={0.5} strokeLinecap="round" />
    <Circle cx={60} cy={60} r={4} fill={color} />
  </Svg>
);

export const AllSafeIllustration = ({ color, size = 120 }: IllustrationProps) => (
  <Svg width={size} height={size} viewBox="0 0 120 120">
    <Circle cx={60} cy={62} r={48} fill={color} opacity={0.08} />
    <Path d="M60 24 L88 36 L88 62 Q88 90 60 104 Q32 90 32 62 L32 36 Z" fill={color} opacity={0.9} />
    <Path d="M60 24 L88 36 L88 62 Q88 90 60 104 Q32 90 32 62 L32 36 Z" fill="none" stroke={color} strokeWidth={1.5} opacity={0.4} />
    <Path d="M44 62 L56 74 L80 46" stroke="#0d1117" strokeWidth={7.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    {/* small sparkles — "all clear" */}
    <Circle cx={24} cy={40} r={3} fill={color} opacity={0.6} />
    <Circle cx={96} cy={88} r={2.5} fill={color} opacity={0.5} />
    <Circle cx={94} cy={34} r={2} fill={color} opacity={0.45} />
  </Svg>
);

export const NoBlockedIllustration = ({ color, size = 120 }: IllustrationProps) => (
  <Svg width={size} height={size} viewBox="0 0 120 120">
    <Circle cx={60} cy={62} r={48} fill={color} opacity={0.08} />
    {/* shield, idle — nothing to block yet */}
    <Path d="M60 24 L88 36 L88 62 Q88 90 60 104 Q32 90 32 62 L32 36 Z" fill={color} opacity={0.85} />
    <Path d="M60 24 L88 36 L88 62 Q88 90 60 104 Q32 90 32 62 L32 36 Z" fill="none" stroke={color} strokeWidth={1.5} opacity={0.4} />
    {/* padlock */}
    <Path d="M52 63 L52 55 Q52 46 60 46 Q68 46 68 55 L68 63" stroke="#0d1117" strokeWidth={5} fill="none" strokeLinecap="round" />
    <Rect x={47} y={63} width={26} height={21} rx={4} fill="#0d1117" />
    <Circle cx={60} cy={71} r={3.5} fill={color} />
  </Svg>
);

export const NoAppsIllustration = ({ color, size = 120 }: IllustrationProps) => (
  <Svg width={size} height={size} viewBox="0 0 120 120">
    <Circle cx={60} cy={62} r={48} fill={color} opacity={0.08} />
    {/* phone silhouette */}
    <Rect x={38} y={24} width={38} height={68} rx={8} fill={color} opacity={0.16} />
    <Rect x={44} y={32} width={26} height={46} rx={2} fill={color} opacity={0.26} />
    <Circle cx={57} cy={86} r={2.5} fill={color} opacity={0.4} />
    {/* scan magnifier */}
    <Circle cx={80} cy={76} r={17} fill="#0d1117" opacity={0.92} />
    <Circle cx={80} cy={76} r={17} fill="none" stroke={color} strokeWidth={4} />
    <Line x1={92} y1={88} x2={104} y2={100} stroke={color} strokeWidth={6} strokeLinecap="round" />
  </Svg>
);

export const NoContactsIllustration = ({ color, size = 120 }: IllustrationProps) => (
  <Svg width={size} height={size} viewBox="0 0 120 120">
    <Circle cx={60} cy={62} r={48} fill={color} opacity={0.08} />
    {/* person */}
    <Circle cx={58} cy={46} r={16} fill={color} opacity={0.85} />
    <Path d="M30 98 Q30 68 58 68 Q86 68 86 98 Z" fill={color} opacity={0.85} />
    {/* trust heart badge */}
    <Path
      d="M92 58 Q92 50 86 50 Q81 50 81 56 Q81 50 76 50 Q70 50 70 58 Q70 66 81 74 Q92 66 92 58 Z"
      fill="#0d1117"
    />
    <Path
      d="M92 58 Q92 50 86 50 Q81 50 81 56 Q81 50 76 50 Q70 50 70 58 Q70 66 81 74 Q92 66 92 58 Z"
      fill="none" stroke={color} strokeWidth={2}
    />
  </Svg>
);

export const NoResultsIllustration = ({ color, size = 90 }: IllustrationProps) => (
  <Svg width={size} height={size} viewBox="0 0 120 120">
    <Circle cx={60} cy={60} r={44} fill={color} opacity={0.06} />
    <Circle cx={52} cy={52} r={28} fill="none" stroke={color} strokeWidth={6} opacity={0.55} />
    <Circle cx={52} cy={52} r={14} fill="none" stroke={color} strokeWidth={2} strokeDasharray="3,5" opacity={0.4} />
    <Line x1={73} y1={73} x2={94} y2={94} stroke={color} strokeWidth={8} strokeLinecap="round" opacity={0.55} />
  </Svg>
);

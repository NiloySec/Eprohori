import React from 'react';
import Svg, { Path, Circle, Rect, Line, Defs, LinearGradient, Stop } from 'react-native-svg';

interface IllustrationProps {
  color: string;
  size?: number;
}

// Flat, geometric onboarding illustrations built from react-native-svg primitives —
// no external art assets, themed per-slide using the slide's own accent color.

export const WelcomeIllustration = ({ color, size = 200 }: IllustrationProps) => (
  <Svg width={size} height={size} viewBox="0 0 200 200">
    <Defs>
      <LinearGradient id="shieldGrad" x1="0" y1="0" x2="0" y2="1">
        <Stop offset="0" stopColor={color} stopOpacity={0.9} />
        <Stop offset="1" stopColor={color} stopOpacity={0.5} />
      </LinearGradient>
    </Defs>
    <Circle cx={100} cy={102} r={80} fill={color} opacity={0.08} />
    {/* phone silhouette peeking from behind the shield */}
    <Rect x={122} y={70} width={46} height={82} rx={10} fill={color} opacity={0.16} />
    <Rect x={128} y={80} width={34} height={54} rx={3} fill={color} opacity={0.22} />
    {/* shield */}
    <Path d="M100 26 L156 50 L156 100 Q156 148 100 176 Q44 148 44 100 L44 50 Z" fill="url(#shieldGrad)" />
    <Path d="M100 26 L156 50 L156 100 Q156 148 100 176 Q44 148 44 100 L44 50 Z" fill="none" stroke={color} strokeWidth={2} opacity={0.5} />
    {/* checkmark */}
    <Path d="M72 100 L92 120 L132 78" stroke="#0d1117" strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    {/* sparkle accents */}
    <Circle cx={38} cy={54} r={4} fill={color} opacity={0.6} />
    <Circle cx={166} cy={150} r={3} fill={color} opacity={0.5} />
    <Circle cx={30} cy={140} r={2.5} fill={color} opacity={0.4} />
  </Svg>
);

export const AnalyzeIllustration = ({ color, size = 200 }: IllustrationProps) => (
  <Svg width={size} height={size} viewBox="0 0 200 200">
    <Circle cx={100} cy={102} r={80} fill={color} opacity={0.08} />
    {/* message bubble */}
    <Path
      d="M32 50 Q32 38 44 38 L138 38 Q150 38 150 50 L150 108 Q150 120 138 120 L64 120 L44 138 L48 120 L44 120 Q32 120 32 108 Z"
      fill={color} opacity={0.18}
    />
    <Path
      d="M32 50 Q32 38 44 38 L138 38 Q150 38 150 50 L150 108 Q150 120 138 120 L64 120 L44 138 L48 120 L44 120 Q32 120 32 108 Z"
      fill="none" stroke={color} strokeWidth={2} opacity={0.55}
    />
    {/* text lines inside bubble */}
    <Rect x={50} y={58} width={78} height={7} rx={3.5} fill={color} opacity={0.5} />
    <Rect x={50} y={74} width={60} height={7} rx={3.5} fill={color} opacity={0.4} />
    <Rect x={50} y={90} width={42} height={7} rx={3.5} fill={color} opacity={0.3} />
    {/* magnifying glass */}
    <Circle cx={142} cy={142} r={26} fill="#0d1117" opacity={0.9} />
    <Circle cx={142} cy={142} r={26} fill="none" stroke={color} strokeWidth={5} />
    <Line x1={161} y1={161} x2={182} y2={182} stroke={color} strokeWidth={8} strokeLinecap="round" />
    {/* exclamation inside the glass — “something's off” */}
    <Rect x={139} y={130} width={6} height={14} rx={3} fill={color} />
    <Circle cx={142} cy={152} r={3.5} fill={color} />
  </Svg>
);

export const CommunityIllustration = ({ color, size = 200 }: IllustrationProps) => (
  <Svg width={size} height={size} viewBox="0 0 200 200">
    <Circle cx={100} cy={102} r={80} fill={color} opacity={0.08} />
    {/* abstract map */}
    <Path
      d="M42 70 Q26 100 42 132 Q66 168 116 160 Q166 152 172 108 Q178 62 134 44 Q86 24 42 70 Z"
      fill={color} opacity={0.14}
    />
    {/* connecting network lines */}
    <Line x1={78} y1={82} x2={126} y2={72} stroke={color} strokeWidth={2} strokeDasharray="4,5" opacity={0.6} />
    <Line x1={126} y1={72} x2={104} y2={132} stroke={color} strokeWidth={2} strokeDasharray="4,5" opacity={0.6} />
    <Line x1={104} y1={132} x2={78} y2={82} stroke={color} strokeWidth={2} strokeDasharray="4,5" opacity={0.6} />
    {/* pins */}
    {[{ x: 78, y: 82 }, { x: 126, y: 72 }, { x: 104, y: 132 }].map((p, i) => (
      <React.Fragment key={i}>
        <Path
          d={`M${p.x} ${p.y - 18} Q${p.x + 14} ${p.y - 18} ${p.x + 14} ${p.y - 4} Q${p.x + 14} ${p.y + 8} ${p.x} ${p.y + 20} Q${p.x - 14} ${p.y + 8} ${p.x - 14} ${p.y - 4} Q${p.x - 14} ${p.y - 18} ${p.x} ${p.y - 18} Z`}
          fill={color} opacity={i === 1 ? 0.95 : 0.7}
        />
        <Circle cx={p.x} cy={p.y - 5} r={5} fill="#0d1117" />
      </React.Fragment>
    ))}
  </Svg>
);

export const AlertIllustration = ({ color, size = 200 }: IllustrationProps) => (
  <Svg width={size} height={size} viewBox="0 0 200 200">
    <Circle cx={100} cy={102} r={80} fill={color} opacity={0.08} />
    {/* sound waves */}
    <Path d="M52 90 Q40 100 52 118" stroke={color} strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.4} />
    <Path d="M38 78 Q18 100 38 130" stroke={color} strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.25} />
    <Path d="M148 90 Q160 100 148 118" stroke={color} strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.4} />
    <Path d="M162 78 Q182 100 162 130" stroke={color} strokeWidth={4} strokeLinecap="round" fill="none" opacity={0.25} />
    {/* bell */}
    <Path
      d="M100 34 Q132 34 132 74 Q132 104 146 122 L54 122 Q68 104 68 74 Q68 34 100 34 Z"
      fill={color} opacity={0.85}
    />
    <Rect x={88} y={128} width={24} height={12} rx={6} fill={color} opacity={0.85} />
    {/* notification badge */}
    <Circle cx={138} cy={46} r={13} fill="#ff5555" />
    <Circle cx={138} cy={46} r={13} fill="none" stroke="#1a0a1f" strokeWidth={3} />
  </Svg>
);

"use client";

import React from "react";

// AvatarSvg — a procedurally generated, Bitmoji-inspired avatar.
// 100% original vector art (no proprietary assets). Reads an avatar config object
// (skin/face/hair/eyes/eyebrows/glasses/facial/outfit/outfitVibe/sticker/expression)
// and renders a friendly character inside the given viewBox.

export type AvatarConfig = Record<string, string>;

const SKIN_COLORS: Record<string, string> = {
  skin1: "#f3d2b3",
  skin2: "#e7b58e",
  skin3: "#d39a72",
  skin4: "#b97d4e",
  skin5: "#8a5a32",
  skin6: "#5e3a22",
};

const HAIR_COLORS: Record<string, string> = {
  hair1: "#1f1b18", hair2: "#3a2a1d", hair3: "#5c3a1e", hair4: "#8b5a2b",
  hair5: "#c98a3a", hair6: "#d9b35a", hair7: "#4a3550", hair8: "#b53a3a",
  hair9: "#3a6a8a", hair10: "#7a7a7a",
};

function pick<T>(map: Record<string, T>, key: string | undefined, fallback: T): T {
  if (key && map[key]) return map[key];
  return fallback;
}

export function AvatarSvg({
  config,
  size = 120,
  className = "",
  rounded = true,
}: {
  config: AvatarConfig;
  size?: number;
  className?: string;
  rounded?: boolean;
}) {
  const c = config || {};
  const skin = pick(SKIN_COLORS, c.skin, SKIN_COLORS.skin1);
  const hairColor = pick(HAIR_COLORS, c.hair, HAIR_COLORS.hair1);
  const hair = c.hair || "hair1";
  const eyes = c.eyes || "eyes1";
  const brows = c.eyebrows || "brows1";
  const glasses = c.glasses || "none";
  const facial = c.facial || "none";
  const outfit = c.outfit || "outfit1";
  const outfitVibe = c.outfitVibe || "casual";
  const sticker = c.sticker || "none";
  const expression = c.expression || "smile";
  const gender = c.gender || "neutral";

  // outfit color derived from vibe
  const outfitColors: Record<string, [string, string]> = {
    casual: ["#2f6f57", "#1f4d3a"],
    tech: ["#272a33", "#3a3f4b"],
    sporty: ["#b5432f", "#8a2f1f"],
    formal: ["#2a3550", "#1a2440"],
    street: ["#6a4a8a", "#4a3360"],
    retro: ["#c98a3a", "#8a5a2a"],
  };
  const [outfitMain, outfitDark] = pick(outfitColors, outfitVibe, outfitColors.casual);

  const glassesColor = "#2a2a2a";
  const glassesLens = "#b9e3f5";

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="User avatar"
      shapeRendering="geometricPrecision"
    >
      <defs>
        <clipPath id="avClip">
          <rect x="0" y="0" width="200" height="200" rx={rounded ? 999 : 0} />
        </clipPath>
        <linearGradient id="bgGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e7f3ee" />
          <stop offset="100%" stopColor="#cfe8dd" />
        </linearGradient>
        <linearGradient id="hairGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={hairColor} />
          <stop offset="100%" stopColor={shade(hairColor, -0.25)} />
        </linearGradient>
        <linearGradient id="outfitGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={outfitMain} />
          <stop offset="100%" stopColor={outfitDark} />
        </linearGradient>
      </defs>
      <g clipPath="url(#avClip)">
        <rect x="0" y="0" width="200" height="200" fill="url(#bgGrad)" />
        {/* shoulders / outfit */}
        <path d="M30 200 C 30 150, 70 130, 100 130 C 130 130, 170 150, 170 200 Z" fill="url(#outfitGrad)" />
        <OutfitShape outfit={outfit} main={outfitMain} dark={outfitDark} />
        {/* neck */}
        <rect x="88" y="118" width="24" height="22" rx="8" fill={shade(skin, -0.08)} />
        {/* face */}
        <ellipse cx="100" cy="92" rx="42" ry="46" fill={skin} />
        <ellipse cx="100" cy="100" rx="38" ry="40" fill={shade(skin, -0.04)} opacity="0.4" />
        {/* ears */}
        <ellipse cx="58" cy="96" rx="7" ry="10" fill={skin} />
        <ellipse cx="142" cy="96" rx="7" ry="10" fill={skin} />
        {/* hair back layer */}
        <HairBack hair={hair} color="url(#hairGrad)" gender={gender} />
        {/* eyebrows */}
        <Eyebrows brows={brows} color={shade(hairColor, 0.1)} />
        {/* eyes */}
        <Eyes eyes={eyes} expression={expression} />
        {/* glasses */}
        <Glasses glasses={glasses} color={glassesColor} lens={glassesLens} />
        {/* nose */}
        <path d="M100 96 L97 108 Q100 110 103 108 Z" fill={shade(skin, -0.12)} opacity="0.5" />
        {/* mouth */}
        <Mouth expression={expression} skin={skin} />
        {/* facial hair */}
        <FacialHair facial={facial} color={hairColor} />
        {/* hair front layer */}
        <HairFront hair={hair} color="url(#hairGrad)" expression={expression} />
        {/* sticker badge */}
        <Sticker sticker={sticker} />
      </g>
    </svg>
  );
}

// helpers
function shade(hex: string, amt: number): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const adj = (v: number) => Math.max(0, Math.min(255, Math.round(v + v * amt)));
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return `#${toHex(adj(r))}${toHex(adj(g))}${toHex(adj(b))}`;
}

function Eyes({ eyes, expression }: { eyes: string; expression: string }) {
  const closed = expression === "happy" || expression === "laugh";
  if (eyes === "eyes5" || closed) {
    return (
      <>
        <path d="M75 92 Q84 86 93 92" stroke="#2a2018" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M107 92 Q116 86 125 92" stroke="#2a2018" strokeWidth="3" fill="none" strokeLinecap="round" />
      </>
    );
  }
  if (eyes === "eyes2") {
    // round big eyes
    return (
      <>
        <ellipse cx="84" cy="92" rx="6" ry="7" fill="#fff" stroke="#2a2018" strokeWidth="1.2" />
        <ellipse cx="116" cy="92" rx="6" ry="7" fill="#fff" stroke="#2a2018" strokeWidth="1.2" />
        <circle cx="84" cy="93" r="3" fill="#2a2018" />
        <circle cx="116" cy="93" r="3" fill="#2a2018" />
        <circle cx="83" cy="92" r="1" fill="#fff" />
        <circle cx="115" cy="92" r="1" fill="#fff" />
      </>
    );
  }
  if (eyes === "eyes3") {
    // sleepy
    return (
      <>
        <path d="M76 92 Q84 94 92 92" stroke="#2a2018" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <path d="M108 92 Q116 94 124 92" stroke="#2a2018" strokeWidth="2.5" fill="none" strokeLinecap="round" />
        <circle cx="86" cy="93" r="1.5" fill="#2a2018" />
        <circle cx="118" cy="93" r="1.5" fill="#2a2018" />
      </>
    );
  }
  if (eyes === "eyes4") {
    // sparkly
    return (
      <>
        <circle cx="84" cy="92" r="4" fill="#2a2018" />
        <circle cx="116" cy="92" r="4" fill="#2a2018" />
        <path d="M82 88 l1 -3 1 3" stroke="#5a8" strokeWidth="1.2" fill="#7ad" />
        <path d="M114 88 l1 -3 1 3" stroke="#5a8" strokeWidth="1.2" fill="#7ad" />
      </>
    );
  }
  if (eyes === "eyes6") {
    // star eyes
    return (
      <>
        <path d="M84 86 l2 5 5 0.5 -4 3 1.5 5 -4.5 -3 -4.5 3 1.5 -5 -4 -3 5 -0.5 z" fill="#d97706" />
        <path d="M116 86 l2 5 5 0.5 -4 3 1.5 5 -4.5 -3 -4.5 3 1.5 -5 -4 -3 5 -0.5 z" fill="#d97706" />
      </>
    );
  }
  // eyes1 — friendly almond
  return (
    <>
      <ellipse cx="84" cy="92" rx="5" ry="5" fill="#fff" />
      <ellipse cx="116" cy="92" rx="5" ry="5" fill="#fff" />
      <circle cx="84" cy="92" r="3" fill="#2a2018" />
      <circle cx="116" cy="92" r="3" fill="#2a2018" />
      <circle cx="83" cy="91" r="1" fill="#fff" />
      <circle cx="115" cy="91" r="1" fill="#fff" />
    </>
  );
}

function Eyebrows({ brows, color }: { brows: string; color: string }) {
  const stroke = { stroke: color, strokeWidth: 3.2, fill: "none", strokeLinecap: "round" as const };
  if (brows === "brows2")
    return (
      <>
        <path d="M74 82 L94 80" {...stroke} />
        <path d="M106 80 L126 82" {...stroke} />
      </>
    );
  if (brows === "brows3")
    return (
      <>
        <path d="M74 84 Q84 78 94 84" {...stroke} />
        <path d="M106 84 Q116 78 126 84" {...stroke} />
      </>
    );
  if (brows === "brows4")
    return (
      <>
        <path d="M74 80 Q84 86 94 80" {...stroke} />
        <path d="M106 80 Q116 86 126 80" {...stroke} />
      </>
    );
  if (brows === "brows5")
    return (
      <>
        <rect x="74" y="80" width="20" height="3.5" fill={color} rx="1" />
        <rect x="106" y="80" width="20" height="3.5" fill={color} rx="1" />
      </>
    );
  return (
    <>
      <path d="M74 83 Q84 79 94 83" {...stroke} />
      <path d="M106 83 Q116 79 126 83" {...stroke} />
    </>
  );
}

function Mouth({ expression, skin }: { expression: string; skin: string }) {
  const dark = shade(skin, -0.3);
  if (expression === "smile")
    return <path d="M86 116 Q100 126 114 116" stroke={dark} strokeWidth="3" fill="none" strokeLinecap="round" />;
  if (expression === "happy" || expression === "laugh")
    return (
      <>
        <path d="M82 114 Q100 138 118 114 Q100 120 82 114 Z" fill="#a23a3a" />
        <path d="M88 118 Q100 124 112 118" stroke="#fff" strokeWidth="2" fill="none" />
      </>
    );
  if (expression === "cool")
    return <path d="M84 118 Q100 112 116 118" stroke={dark} strokeWidth="3" fill="none" strokeLinecap="round" />;
  if (expression === "wink")
    return <path d="M86 117 Q96 124 106 116" stroke={dark} strokeWidth="3" fill="none" strokeLinecap="round" />;
  if (expression === "focus")
    return <path d="M90 118 L110 118" stroke={dark} strokeWidth="3" strokeLinecap="round" />;
  if (expression === "surprise")
    return <ellipse cx="100" cy="118" rx="7" ry="9" fill="#a23a3a" />;
  return <path d="M86 116 Q100 126 114 116" stroke={dark} strokeWidth="3" fill="none" strokeLinecap="round" />;
}

function Glasses({ glasses, color, lens }: { glasses: string; color: string; lens: string }) {
  if (glasses === "none") return null;
  if (glasses === "glasses1")
    return (
      <g stroke={color} strokeWidth="2.4" fill="none">
        <rect x="68" y="84" width="28" height="18" rx="4" fill={lens} opacity="0.3" />
        <rect x="104" y="84" width="28" height="18" rx="4" fill={lens} opacity="0.3" />
        <line x1="96" y1="92" x2="104" y2="92" />
      </g>
    );
  if (glasses === "glasses2")
    return (
      <g stroke={color} strokeWidth="2.4" fill="none">
        <circle cx="82" cy="92" r="11" fill={lens} opacity="0.3" />
        <circle cx="118" cy="92" r="11" fill={lens} opacity="0.3" />
        <line x1="93" y1="92" x2="107" y2="92" />
      </g>
    );
  if (glasses === "glasses3")
    return (
      <g stroke={color} strokeWidth="3" fill="none">
        <rect x="66" y="82" width="32" height="20" rx="2" fill="#1a1a1a" opacity="0.85" />
        <rect x="102" y="82" width="32" height="20" rx="2" fill="#1a1a1a" opacity="0.85" />
        <line x1="98" y1="92" x2="102" y2="92" />
      </g>
    );
  if (glasses === "glasses4")
    return (
      <g stroke={color} strokeWidth="2.4" fill="none">
        <path d="M68 92 L96 92 M104 92 L132 92" />
        <circle cx="82" cy="92" r="3" fill={lens} />
        <circle cx="118" cy="92" r="3" fill={lens} />
      </g>
    );
  return null;
}

function FacialHair({ facial, color }: { facial: string; color: string }) {
  if (facial === "beard1")
    return <path d="M70 110 Q100 156 130 110 L130 130 Q100 150 70 130 Z" fill={color} opacity="0.92" />;
  if (facial === "beard2")
    return <path d="M74 112 Q100 144 126 112 L124 132 Q100 142 76 132 Z" fill={color} opacity="0.9" />;
  if (facial === "mustache1")
    return <path d="M82 110 Q100 118 118 110 L116 114 Q100 108 84 114 Z" fill={color} />;
  if (facial === "stubble1")
    return <path d="M74 108 Q100 132 126 108 L126 122 Q100 130 74 122 Z" fill={color} opacity="0.25" />;
  return null;
}

function HairBack({ hair, color, gender }: { hair: string; color: string; gender: string }) {
  if (hair === "hair4" || hair === "hair6" || hair === "hair9")
    return <ellipse cx="100" cy="78" rx="50" ry="44" fill={color} />;
  if (hair === "hair7" || hair === "hair10")
    return <path d="M52 90 Q60 50 100 50 Q140 50 148 90 L148 120 Q120 110 100 110 Q80 110 52 120 Z" fill={color} />;
  if (gender === "feminine" && (hair === "hair2" || hair === "hair3"))
    return <path d="M52 84 Q60 48 100 48 Q140 48 148 84 L148 140 Q130 130 100 130 Q70 130 52 140 Z" fill={color} />;
  return <ellipse cx="100" cy="76" rx="46" ry="38" fill={color} />;
}

function HairFront({ hair, color, expression }: { hair: string; color: string; expression: string }) {
  if (hair === "hair1")
    return <path d="M58 80 Q60 50 100 50 Q140 50 142 80 Q130 66 100 66 Q70 66 58 80 Z" fill={color} />;
  if (hair === "hair2")
    return <path d="M58 82 Q60 48 100 48 Q140 48 142 82 Q120 60 100 60 Q80 60 58 82 Z" fill={color} />;
  if (hair === "hair3")
    return (
      <g fill={color}>
        <path d="M56 84 Q60 46 100 46 Q140 46 144 84 Q120 56 100 56 Q80 56 56 84 Z" />
        <path d="M70 60 Q78 80 70 100 L82 100 Q90 78 82 60 Z" />
      </g>
    );
  if (hair === "hair4")
    return (
      <g fill={color}>
        <path d="M56 78 Q60 46 100 46 Q140 46 144 78 L140 70 Q120 56 100 56 Q80 56 60 70 Z" />
      </g>
    );
  if (hair === "hair5")
    return (
      <g fill={color}>
        <path d="M60 76 Q70 44 100 44 Q130 44 140 76 Q130 60 100 60 Q70 60 60 76 Z" />
        <circle cx="70" cy="68" r="6" />
        <circle cx="130" cy="68" r="6" />
      </g>
    );
  if (hair === "hair6")
    return (
      <g fill={color}>
        <path d="M56 78 Q60 46 100 46 Q140 46 144 78 L138 70 Q120 58 100 58 Q80 58 62 70 Z" />
        <path d="M64 60 L70 90 L76 64 Z" />
        <path d="M124 60 L130 90 L136 64 Z" />
      </g>
    );
  if (hair === "hair7")
    return <path d="M56 84 Q58 52 100 52 Q142 52 144 84 Q126 68 100 68 Q74 68 56 84 Z" fill={color} />;
  if (hair === "hair8")
    return (
      <g fill={color}>
        <path d="M58 82 Q62 50 100 50 Q138 50 142 82 L134 74 Q120 64 100 64 Q80 64 66 74 Z" />
        <path d="M58 82 L74 90 L70 78 Z" />
      </g>
    );
  if (hair === "hair9")
    return (
      <g fill={color}>
        <path d="M58 80 Q64 48 100 48 Q136 48 142 80 Q124 62 100 62 Q76 62 58 80 Z" />
        <path d="M80 50 L84 72 L88 50 Z" />
        <path d="M100 46 L104 68 L108 46 Z" />
        <path d="M120 50 L124 72 L128 50 Z" />
      </g>
    );
  if (hair === "hair10")
    return (
      <g fill={color}>
        <path d="M58 84 Q62 50 100 50 Q138 50 142 84 Q120 66 100 66 Q80 66 58 84 Z" />
        <path d="M90 56 Q100 50 110 56 L108 70 Q100 64 92 70 Z" opacity="0.9" />
      </g>
    );
  return <path d="M58 80 Q60 50 100 50 Q140 50 142 80 Q130 66 100 66 Q70 66 58 80 Z" fill={color} />;
}

function OutfitShape({ outfit, main, dark }: { outfit: string; main: string; dark: string }) {
  if (outfit === "outfit2")
    return <path d="M40 200 C 40 152, 72 132, 100 132 C 128 132, 160 152, 160 200 Z" fill="url(#outfitGrad)" />;
  if (outfit === "outfit3")
    return (
      <g>
        <path d="M30 200 C 30 150, 70 130, 100 130 C 130 130, 170 150, 170 200 Z" fill={main} />
        <path d="M85 132 L100 162 L115 132 Z" fill={shade(main, 0.2)} />
        <circle cx="100" cy="148" r="3" fill={shade(main, -0.3)} />
        <circle cx="100" cy="158" r="3" fill={shade(main, -0.3)} />
      </g>
    );
  if (outfit === "outfit4")
    return (
      <g>
        <path d="M30 200 C 30 150, 70 130, 100 130 C 130 130, 170 150, 170 200 Z" fill={main} />
        <rect x="62" y="138" width="76" height="10" fill={shade(main, -0.25)} rx="2" />
      </g>
    );
  if (outfit === "outfit5")
    return (
      <g>
        <path d="M30 200 C 30 150, 70 130, 100 130 C 130 130, 170 150, 170 200 Z" fill={main} />
        <rect x="92" y="130" width="16" height="80" fill={shade(main, 0.2)} />
        <rect x="70" y="160" width="60" height="6" fill={shade(main, -0.3)} rx="3" />
      </g>
    );
  if (outfit === "outfit6")
    return (
      <g>
        <path d="M30 200 C 30 150, 70 130, 100 130 C 130 130, 170 150, 170 200 Z" fill={main} />
        <path d="M70 140 L100 150 L130 140 L130 160 L100 170 L70 160 Z" fill={shade(main, -0.2)} />
      </g>
    );
  if (outfit === "outfit7")
    return (
      <g>
        <path d="M30 200 C 30 150, 70 130, 100 130 C 130 130, 170 150, 170 200 Z" fill={main} />
        <path d="M100 130 L80 200 L120 200 Z" fill={shade(main, 0.15)} />
      </g>
    );
  if (outfit === "outfit8")
    return (
      <g>
        <path d="M30 200 C 30 150, 70 130, 100 130 C 130 130, 170 150, 170 200 Z" fill={main} />
        <circle cx="75" cy="160" r="6" fill="#fff" opacity="0.4" />
        <circle cx="125" cy="160" r="6" fill="#fff" opacity="0.4" />
      </g>
    );
  if (outfit === "outfit9")
    return (
      <g>
        <path d="M30 200 C 30 150, 70 130, 100 130 C 130 130, 170 150, 170 200 Z" fill={main} />
        <text x="100" y="170" textAnchor="middle" fontFamily="monospace" fontSize="18" fill="#fff" opacity="0.8">{"</>"}</text>
      </g>
    );
  return <path d="M30 200 C 30 150, 70 130, 100 130 C 130 130, 170 150, 170 200 Z" fill="url(#outfitGrad)" />;
}

function Sticker({ sticker }: { sticker: string }) {
  if (sticker === "none") return null;
  const cx = 145, cy = 55;
  if (sticker === "star1")
    return <path d={`${starPath(cx, cy, 14, 6, 3)}`} fill="#f5c542" stroke="#b8860b" strokeWidth="1.5" />;
  if (sticker === "code1")
    return (
      <g transform={`translate(${cx - 14}, ${cy - 12})`}>
        <rect width="28" height="24" rx="4" fill="#0f6" opacity="0.9" />
        <text x="14" y="16" textAnchor="middle" fontFamily="monospace" fontSize="10" fill="#fff">{"</>"}</text>
      </g>
    );
  if (sticker === "fire1")
    return (
      <path d={`M${cx} ${cy - 14} q-10 6 -6 16 q-4 -4 -6 0 q2 12 12 12 q10 0 12 -12 q-2 -4 -6 0 q4 -10 -6 -16 z`} fill="#ff5733" />
    );
  if (sticker === "bolt1")
    return <path d={`M${cx} ${cy - 14} L${cx - 6} ${cy + 2} L${cx} ${cy + 2} L${cx - 4} ${cy + 14} L${cx + 8} ${cy - 2} L${cx + 2} ${cy - 2} Z`} fill="#ffd700" stroke="#b8860b" strokeWidth="1.2" />;
  if (sticker === "rocket1")
    return (
      <g transform={`translate(${cx - 8}, ${cy - 16})`}>
        <path d="M8 0 q8 8 8 18 q-4 4 -8 4 q-4 0 -8 -4 q0 -10 8 -18 z" fill="#e74c3c" />
        <circle cx="8" cy="10" r="3" fill="#b9e3f5" />
        <path d="M0 18 l-4 6 l6 -2 z M16 18 l4 6 l-6 -2 z" fill="#f5c542" />
      </g>
    );
  if (sticker === "heart1")
    return <path d={`M${cx} ${cy + 10} q-12 -10 -12 -2 q0 6 12 14 q12 -8 12 -14 q0 -8 -12 2 z`} fill="#e74c3c" />;
  if (sticker === "crown1")
    return (
      <path d={`M${cx - 14} ${cy + 8} L${cx - 14} ${cy - 8} L${cx - 6} ${cy + 0} L${cx} ${cy - 10} L${cx + 6} ${cy + 0} L${cx + 14} ${cy - 8} L${cx + 14} ${cy + 8} Z`} fill="#f5c542" stroke="#b8860b" strokeWidth="1.2" />
    );
  return null;
}

function starPath(cx: number, cy: number, rOuter: number, rInner: number, points: number) {
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? rOuter : rInner;
    const a = (Math.PI / points) * i - Math.PI / 2;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    d += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1) + " ";
  }
  return d + "Z";
}

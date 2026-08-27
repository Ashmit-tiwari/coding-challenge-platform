"use client";

import React, { useId } from "react";

// AvatarSvg — High performance Bitmoji / Snapchat-style avatar vector engine.

export type AvatarConfig = Record<string, string>;

export const SKIN_COLORS: Record<string, string> = {
  skin1: "#fbe4d8",
  skin2: "#f3ccb0",
  skin3: "#dfa77e",
  skin4: "#be8353",
  skin5: "#8e572d",
  skin6: "#54331d",
};

export const HAIR_COLORS: Record<string, string> = {
  color_black: "#1b1918",
  color_espresso: "#3b281c",
  color_brown: "#5e3a20",
  color_auburn: "#8d542b",
  color_blonde: "#d49b43",
  color_platinum: "#f2cb6c",
  color_crimson: "#a83232",
  color_purple: "#73368a",
  color_blue: "#2d6a8a",
  color_silver: "#9e9e9e",
  color_rose: "#e07a5f",
  color_teal: "#2a9d8f",
  hair1: "#1b1918",
  hair2: "#3b281c",
  hair3: "#5e3a20",
  hair4: "#8d542b",
  hair5: "#d49b43",
  hair6: "#f2cb6c",
  hair7: "#a83232",
  hair8: "#73368a",
  hair9: "#2d6a8a",
  hair10: "#9e9e9e",
  hair11: "#e07a5f",
  hair12: "#2a9d8f",
};

export const OUTFIT_COLORS: Record<string, [string, string, string]> = {
  tech: ["#10b981", "#047857", "#6ee7b7"],     // Tech Emerald
  casual: ["#2563eb", "#1d4ed8", "#93c5fd"],   // Royal Blue
  sporty: ["#dc2626", "#991b1b", "#fca5a5"],   // Crimson Red
  formal: ["#4338ca", "#312e81", "#c7d2fe"],   // Indigo Navy
  street: ["#7c3aed", "#5b21b6", "#ddd6fe"],   // Electric Violet
  retro: ["#d97706", "#92400e", "#fde68a"],    // Amber Gold
  cyber: ["#0891b2", "#155e75", "#67e8f9"],    // Cyber Cyan
  midnight: ["#1e293b", "#0f172a", "#94a3b8"], // Midnight Onyx
  sunset: ["#ea580c", "#9a3412", "#fed7aa"],   // Sunset Orange
  rose: ["#e11d48", "#9f1239", "#fecdd3"],     // Pastel Rose
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
  const rawId = useId();
  const uid = rawId ? rawId.replace(/[^a-zA-Z0-9]/g, "_") : "av";

  const bgGradId = "bgGrad_" + uid;
  const hairGradId = "hairGrad_" + uid;
  const skinGradId = "skinGrad_" + uid;
  const outfitGradId = "outfitGrad_" + uid;
  const clipId = "avatarClip_" + uid;
  const glowId = "softGlow_" + uid;

  const c = config || {};
  const skin = pick(SKIN_COLORS, c.skin, SKIN_COLORS.skin2);
  const hairColorKey = c.hairColor || c.hair_color || "color_espresso";
  const hairColor = pick(HAIR_COLORS, hairColorKey, HAIR_COLORS.color_espresso);
  const rawHair = c.hair || "boy_fade";
  const hair = normalizeHair(rawHair);
  const eyes = c.eyes || "eyes1";
  const brows = c.eyebrows || "brows1";
  const glasses = c.glasses || "none";
  const facial = c.facial || "none";
  const rawOutfit = c.outfit || "outfit_hoodie";
  const outfit = normalizeOutfit(rawOutfit);
  const outfitVibe = c.outfitVibe || "tech";
  const sticker = c.sticker || "none";
  const expression = c.expression || "smile";
  const gender = c.gender || "neutral";

  const [outfitMain, outfitDark, outfitLight] = pick(OUTFIT_COLORS, outfitVibe, OUTFIT_COLORS.tech);

  const shadowSkin = shade(skin, -0.16);
  const blushSkin = "#f43f5e";

  const isMasculine = gender === "masculine";
  const isFeminine = gender === "feminine";

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Student Avatar"
      shapeRendering="geometricPrecision"
    >
      <defs>
        <clipPath id={clipId}>
          <rect x="0" y="0" width="200" height="200" rx={rounded ? 100 : 0} />
        </clipPath>
        <linearGradient id={bgGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
        <linearGradient id={hairGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={shade(hairColor, 0.16)} />
          <stop offset="100%" stopColor={shade(hairColor, -0.22)} />
        </linearGradient>
        <linearGradient id={skinGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={skin} />
          <stop offset="100%" stopColor={shade(skin, -0.06)} />
        </linearGradient>
        <linearGradient id={outfitGradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={outfitMain} />
          <stop offset="100%" stopColor={outfitDark} />
        </linearGradient>
        <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#000000" floodOpacity="0.25" />
        </filter>
      </defs>

      <g clipPath={"url(#" + clipId + ")"}>
        {/* Studio Background */}
        <rect x="0" y="0" width="200" height="200" fill={"url(#" + bgGradId + ")"} />
        <circle cx="100" cy="100" r="85" fill="#334155" opacity="0.25" />

        {/* Hair Back Layer */}
        <HairBackLayer hair={hair} hairGrad={"url(#" + hairGradId + ")"} hairColorHex={hairColor} />

        {/* Body Base Shoulders */}
        {isMasculine ? (
          <path
            d="M14 205 C 14 144, 56 128, 100 128 C 144 128, 186 144, 186 205 Z"
            fill={"url(#" + outfitGradId + ")"}
          />
        ) : isFeminine ? (
          <path
            d="M34 205 C 34 156, 68 138, 100 138 C 132 138, 166 156, 166 205 Z"
            fill={"url(#" + outfitGradId + ")"}
          />
        ) : (
          <path
            d="M24 205 C 24 150, 62 134, 100 134 C 138 134, 176 150, 176 205 Z"
            fill={"url(#" + outfitGradId + ")"}
          />
        )}

        {/* Garment Specific Cut, Collars, Zippers & Graphics */}
        <OutfitDetails
          outfit={outfit}
          main={outfitMain}
          dark={outfitDark}
          light={outfitLight}
          isMasculine={isMasculine}
        />

        {/* Neck */}
        {isMasculine ? (
          <g>
            <path d="M85 114 L85 138 Q100 142 115 138 L115 114 Z" fill={shadowSkin} />
            <path d="M86 120 L86 136 Q100 140 114 136 L114 120 Z" fill={skin} />
          </g>
        ) : isFeminine ? (
          <g>
            <path d="M91 116 L91 142 Q100 145 109 142 L109 116 Z" fill={shadowSkin} />
            <path d="M92 122 L92 140 Q100 143 108 140 L108 122 Z" fill={skin} />
          </g>
        ) : (
          <g>
            <path d="M88 116 L88 140 Q100 144 112 140 L112 116 Z" fill={shadowSkin} />
            <path d="M89 122 L89 138 Q100 142 111 138 L111 122 Z" fill={skin} />
          </g>
        )}

        {/* Face / Jawline */}
        {isMasculine ? (
          <path
            d="M58 84 C 58 48, 142 48, 142 84 C 142 114, 128 132, 100 132 C 72 132, 58 114, 58 84 Z"
            fill={"url(#" + skinGradId + ")"}
          />
        ) : isFeminine ? (
          <path
            d="M62 86 C 62 52, 138 52, 138 86 C 138 116, 122 130, 100 130 C 78 130, 62 116, 62 86 Z"
            fill={"url(#" + skinGradId + ")"}
          />
        ) : (
          <path
            d="M60 86 C 60 50, 140 50, 140 86 C 140 116, 126 131, 100 131 C 74 131, 60 116, 60 86 Z"
            fill={"url(#" + skinGradId + ")"}
          />
        )}

        {/* Ears */}
        <ellipse cx="58" cy="90" rx="6.5" ry="9" fill={skin} />
        <ellipse cx="58" cy="90" rx="4" ry="5.5" fill={shadowSkin} opacity="0.5" />
        <ellipse cx="142" cy="90" rx="6.5" ry="9" fill={skin} />
        <ellipse cx="142" cy="90" rx="4" ry="5.5" fill={shadowSkin} opacity="0.5" />

        {/* Cheeks */}
        {isFeminine && (
          <>
            <ellipse cx="74" cy="101" rx="7.5" ry="4.5" fill={blushSkin} opacity="0.25" />
            <ellipse cx="126" cy="101" rx="7.5" ry="4.5" fill={blushSkin} opacity="0.25" />
          </>
        )}
        {!isMasculine && !isFeminine && (
          <>
            <ellipse cx="74" cy="102" rx="6" ry="3.5" fill={blushSkin} opacity="0.16" />
            <ellipse cx="126" cy="102" rx="6" ry="3.5" fill={blushSkin} opacity="0.16" />
          </>
        )}

        {/* Eyebrows */}
        <Eyebrows brows={brows} color={shade(hairColor, -0.3)} isMasculine={isMasculine} />

        {/* Eyes */}
        <Eyes eyes={eyes} expression={expression} isFeminine={isFeminine} />

        {/* Nose */}
        <path
          d="M97 93 C97 100, 98 103, 100 104 C102 103, 103 100, 103 93"
          stroke={shadowSkin}
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />

        {/* Mouth */}
        <Mouth expression={expression} skin={skin} isFeminine={isFeminine} />

        {/* Facial Hair */}
        <FacialHair facial={facial} color={shade(hairColor, -0.2)} />

        {/* Glasses */}
        <Glasses glasses={glasses} />

        {/* Hair Front Layer */}
        <HairFrontLayer
          hair={hair}
          hairGrad={"url(#" + hairGradId + ")"}
          hairColorHex={hairColor}
        />

        {/* Sticker / Headwear */}
        <Sticker
          sticker={sticker}
          glowId={glowId}
          isTurban={hair === "boy_turban"}
          isManBun={hair === "boy_manbun"}
        />
      </g>
    </svg>
  );
}

function normalizeHair(h: string): string {
  switch (h) {
    case "hair1": return "boy_fade";
    case "hair2": return "girl_bob";
    case "hair3": return "girl_waves";
    case "hair4": return "girl_ponytail";
    case "hair5": return "boy_spiky_quiff";
    case "hair6": return "girl_bangs";
    case "hair7": return "boy_turban";
    case "hair8": return "boy_pompadour";
    case "hair9": return "girl_spacebuns";
    case "hair10": return "boy_buzz";
    case "hair11": return "boy_manbun";
    case "boy_curly": return "boy_spiky_quiff";
    case "girl_hijab": return "girl_spacebuns";
    default: return h;
  }
}

function normalizeOutfit(o: string): string {
  switch (o) {
    case "outfit1": return "outfit_hoodie";
    case "outfit2": return "outfit_varsity";
    case "outfit3": return "outfit_blazer";
    case "outfit4": return "outfit_crewneck";
    case "outfit5": return "outfit_tshirt";
    case "outfit6": return "outfit_denim";
    case "outfit7": return "outfit_jersey";
    case "outfit8": return "outfit_turtleneck";
    default: return o;
  }
}

function shade(hex: string, amt: number): string {
  if (!hex || hex.startsWith("url(")) return "#222222";
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const adj = (v: number) => Math.max(0, Math.min(255, Math.round(v + v * amt)));
  const toHex = (v: number) => v.toString(16).padStart(2, "0");
  return "#" + toHex(adj(r)) + toHex(adj(g)) + toHex(adj(b));
}

function Eyes({
  eyes,
  expression,
  isFeminine,
}: {
  eyes: string;
  expression: string;
  isFeminine: boolean;
}) {
  const isHappy = expression === "happy" || expression === "laugh";
  const isWink = expression === "wink";
  const isSurprise = expression === "surprise";
  const isFocus = expression === "focus";

  if (isHappy || eyes === "eyes5") {
    return (
      <g stroke="#1e293b" strokeWidth="2.8" fill="none" strokeLinecap="round">
        <path d="M74 92 Q83 84 92 92" />
        <path d="M108 92 Q117 84 126 92" />
        {isFeminine && (
          <>
            <path d="M92 90 L95 87" strokeWidth="2" />
            <path d="M126 90 L129 87" strokeWidth="2" />
          </>
        )}
      </g>
    );
  }

  if (isWink) {
    return (
      <g>
        <ellipse cx="83" cy="90" rx="7" ry="7.5" fill="#ffffff" stroke="#1e293b" strokeWidth="1.5" />
        <circle cx="83" cy="90" r="4.2" fill="#1e293b" />
        <circle cx="81.5" cy="88.5" r="1.6" fill="#ffffff" />
        <circle cx="84.5" cy="91.5" r="0.8" fill="#ffffff" />
        <path d="M108 92 Q117 85 126 92" stroke="#1e293b" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
    );
  }

  if (eyes === "eyes6") {
    return (
      <g fill="#f59e0b" stroke="#d97706" strokeWidth="0.8">
        <path d="M83 82 L85 88 L91 89 L86 93 L88 99 L83 95 L78 99 L80 93 L75 89 L81 88 Z" />
        <path d="M117 82 L119 88 L125 89 L120 93 L122 99 L117 95 L112 99 L114 93 L109 89 L115 88 Z" />
      </g>
    );
  }

  if (isFocus) {
    return (
      <g>
        <ellipse cx="83" cy="91" rx="6.5" ry="5.5" fill="#ffffff" stroke="#1e293b" strokeWidth="1.6" />
        <ellipse cx="117" cy="91" rx="6.5" ry="5.5" fill="#ffffff" stroke="#1e293b" strokeWidth="1.6" />
        <circle cx="83" cy="91" r="3.5" fill="#1e293b" />
        <circle cx="117" cy="91" r="3.5" fill="#1e293b" />
        <circle cx="81.8" cy="89.5" r="1.3" fill="#ffffff" />
        <circle cx="115.8" cy="89.5" r="1.3" fill="#ffffff" />
      </g>
    );
  }

  if (isSurprise) {
    return (
      <g>
        <circle cx="83" cy="89" r="8.5" fill="#ffffff" stroke="#1e293b" strokeWidth="1.8" />
        <circle cx="117" cy="89" r="8.5" fill="#ffffff" stroke="#1e293b" strokeWidth="1.8" />
        <circle cx="83" cy="89" r="4.5" fill="#1e293b" />
        <circle cx="117" cy="89" r="4.5" fill="#1e293b" />
        <circle cx="81" cy="87" r="1.8" fill="#ffffff" />
        <circle cx="115" cy="87" r="1.8" fill="#ffffff" />
      </g>
    );
  }

  return (
    <g>
      <ellipse cx="83" cy="90" rx="7" ry="7.5" fill="#ffffff" stroke="#1e293b" strokeWidth="1.6" />
      <ellipse cx="117" cy="90" rx="7" ry="7.5" fill="#ffffff" stroke="#1e293b" strokeWidth="1.6" />
      <circle cx="83" cy="90" r="4.4" fill="#1e293b" />
      <circle cx="117" cy="90" r="4.4" fill="#1e293b" />
      <circle cx="81.5" cy="88.2" r="1.7" fill="#ffffff" />
      <circle cx="115.5" cy="88.2" r="1.7" fill="#ffffff" />
      <circle cx="84.5" cy="91.5" r="0.9" fill="#ffffff" />
      <circle cx="118.5" cy="91.5" r="0.9" fill="#ffffff" />
      {isFeminine && (
        <>
          <path d="M89 86 L93 83" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M123 86 L127 83" stroke="#1e293b" strokeWidth="1.8" strokeLinecap="round" />
        </>
      )}
    </g>
  );
}

function Eyebrows({
  brows,
  color,
  isMasculine,
}: {
  brows: string;
  color: string;
  isMasculine: boolean;
}) {
  const strokeWidth = isMasculine ? 4.2 : 3.2;
  const stroke = { stroke: color, strokeWidth, fill: "none", strokeLinecap: "round" as const };
  if (brows === "brows2") {
    return (
      <g {...stroke}>
        <path d="M72 79 L82 76 L93 81" />
        <path d="M107 81 L118 76 L128 79" />
      </g>
    );
  }
  if (brows === "brows3") {
    return (
      <g {...stroke}>
        <path d="M73 81 Q83 75 93 80" />
        <path d="M107 80 Q117 75 127 81" />
      </g>
    );
  }
  return (
    <g {...stroke}>
      <path d="M73 80 Q83 76 93 80" />
      <path d="M107 80 Q117 76 127 80" />
    </g>
  );
}

function Mouth({
  expression,
  skin,
  isFeminine,
}: {
  expression: string;
  skin: string;
  isFeminine: boolean;
}) {
  const darkLip = shade(skin, isFeminine ? -0.4 : -0.32);

  if (expression === "laugh" || expression === "happy") {
    return (
      <g>
        <path
          d="M84 113 Q100 136 116 113 Q100 117 84 113 Z"
          fill="#be123c"
          stroke={darkLip}
          strokeWidth="1.5"
        />
        <path d="M88 115 Q100 120 112 115" stroke="#ffffff" strokeWidth="2.5" fill="none" />
      </g>
    );
  }

  if (expression === "cool") {
    return (
      <path
        d="M86 116 Q100 121 114 113"
        stroke={darkLip}
        strokeWidth="3.2"
        fill="none"
        strokeLinecap="round"
      />
    );
  }

  if (expression === "surprise") {
    return (
      <ellipse
        cx="100"
        cy="116"
        rx="6"
        ry="8"
        fill="#be123c"
        stroke={darkLip}
        strokeWidth="1.5"
      />
    );
  }

  return (
    <path
      d="M86 114 Q100 125 114 114"
      stroke={darkLip}
      strokeWidth="3.2"
      fill="none"
      strokeLinecap="round"
    />
  );
}

function Glasses({ glasses }: { glasses: string }) {
  if (!glasses || glasses === "none") return null;

  if (glasses === "glasses1") {
    return (
      <g stroke="#0f172a" strokeWidth="2.2" fill="none">
        <circle cx="83" cy="90" r="12" fill="#38bdf8" fillOpacity="0.15" />
        <circle cx="117" cy="90" r="12" fill="#38bdf8" fillOpacity="0.15" />
        <path d="M95 90 Q100 88 105 90" />
        <path d="M71 90 L62 88" />
        <path d="M129 90 L138 88" />
      </g>
    );
  }

  if (glasses === "glasses2") {
    return (
      <g stroke="#1e293b" strokeWidth="2.8" fill="none">
        <rect x="70" y="80" width="26" height="20" rx="4" fill="#38bdf8" fillOpacity="0.15" />
        <rect x="104" y="80" width="26" height="20" rx="4" fill="#38bdf8" fillOpacity="0.15" />
        <path d="M96 86 L104 86" strokeWidth="3" />
        <path d="M70 86 L62 84" strokeWidth="2" />
        <path d="M130 86 L138 84" strokeWidth="2" />
      </g>
    );
  }

  if (glasses === "glasses3") {
    return (
      <g stroke="#020617" strokeWidth="2.5">
        <rect x="69" y="80" width="28" height="20" rx="5" fill="#0f172a" fillOpacity="0.88" />
        <rect x="103" y="80" width="28" height="20" rx="5" fill="#0f172a" fillOpacity="0.88" />
        <path d="M97 87 L103 87" stroke="#020617" strokeWidth="3" fill="none" />
        <line x1="73" y1="83" x2="80" y2="97" stroke="#ffffff" strokeWidth="1.2" opacity="0.4" />
        <line x1="107" y1="83" x2="114" y2="97" stroke="#ffffff" strokeWidth="1.2" opacity="0.4" />
      </g>
    );
  }

  if (glasses === "glasses4") {
    return (
      <g stroke="#be185d" strokeWidth="2.4" fill="none">
        <path d="M70 81 Q83 79 94 85 Q88 100 75 97 Q68 89 70 81 Z" fill="#f472b6" fillOpacity="0.12" />
        <path d="M130 81 Q117 79 106 85 Q112 100 125 97 Q132 89 130 81 Z" fill="#f472b6" fillOpacity="0.12" />
        <path d="M94 85 L106 85" />
      </g>
    );
  }

  return null;
}

function FacialHair({ facial, color }: { facial: string; color: string }) {
  if (!facial || facial === "none") return null;

  if (facial === "beard1") {
    return (
      <g fill={color}>
        <path d="M68 95 C68 126, 80 134, 100 134 C120 134, 132 126, 132 95 L126 95 C126 122, 116 128, 100 128 C84 128, 74 122, 74 95 Z" opacity="0.9" />
        <ellipse cx="100" cy="122" rx="6" ry="3" />
      </g>
    );
  }

  if (facial === "beard2") {
    return (
      <path
        d="M64 96 C64 135, 78 142, 100 142 C122 142, 136 135, 136 96 L130 96 C130 128, 118 135, 100 135 C82 135, 70 128, 70 96 Z"
        fill={color}
        opacity="0.95"
      />
    );
  }

  if (facial === "mustache1") {
    return (
      <path
        d="M84 107 Q100 114 116 107 Q100 104 84 107 Z"
        fill={color}
      />
    );
  }

  if (facial === "stubble1") {
    return (
      <path
        d="M66 98 C66 128, 78 135, 100 135 C122 135, 134 128, 134 98 L128 98 C128 124, 118 130, 100 130 C82 130, 72 124, 72 98 Z"
        fill={color}
        opacity="0.25"
      />
    );
  }

  return null;
}

function HairBackLayer({
  hair,
  hairGrad,
  hairColorHex,
}: {
  hair: string;
  hairGrad: string;
  hairColorHex: string;
}) {
  if (hair === "boy_turban") {
    return (
      <path
        d="M44 80 C40 32, 65 22, 100 22 C135 22, 160 32, 156 80 C154 100, 46 100, 44 80 Z"
        fill={hairGrad}
      />
    );
  }

  if (hair === "boy_manbun") {
    return (
      <g>
        <circle cx="100" cy="80" r="46" fill={hairGrad} />
        <ellipse cx="100" cy="34" rx="15" ry="13" fill={hairGrad} />
        <ellipse cx="100" cy="45" rx="7" ry="3" fill="#ef4444" />
      </g>
    );
  }

  if (hair === "girl_spacebuns") {
    return (
      <g>
        <circle cx="100" cy="80" r="46" fill={hairGrad} />
        <circle cx="54" cy="40" r="16" fill={hairGrad} />
        <ellipse cx="56" cy="54" rx="6" ry="2.5" fill="#f43f5e" />
        <circle cx="146" cy="40" r="16" fill={hairGrad} />
        <ellipse cx="144" cy="54" rx="6" ry="2.5" fill="#f43f5e" />
      </g>
    );
  }

  if (hair === "girl_waves") {
    return (
      <path
        d="M48 82 C44 135, 55 170, 72 178 C80 178, 86 160, 75 142 L125 142 C114 160, 120 178, 128 178 C145 170, 156 135, 152 82 C148 44, 52 44, 48 82 Z"
        fill={hairGrad}
      />
    );
  }

  if (hair === "girl_bob") {
    return (
      <path
        d="M52 80 C50 120, 60 138, 70 142 L130 142 C140 138, 150 120, 148 80 C146 50, 54 50, 52 80 Z"
        fill={hairGrad}
      />
    );
  }

  if (hair === "girl_ponytail") {
    return (
      <g fill={hairGrad}>
        <circle cx="100" cy="80" r="48" />
        <path d="M125 55 C150 45, 168 80, 155 130 C146 135, 142 120, 145 95 C145 70, 135 60, 125 55 Z" />
        <circle cx="126" cy="55" r="5" fill="#f43f5e" />
      </g>
    );
  }

  if (hair === "girl_bangs") {
    return (
      <path
        d="M50 80 C46 130, 52 165, 68 170 C74 170, 80 150, 72 135 L128 135 C120 150, 126 170, 132 170 C148 165, 154 130, 150 80 C146 44, 54 44, 50 80 Z"
        fill={hairGrad}
      />
    );
  }

  return <circle cx="100" cy="82" r="45" fill={hairGrad} />;
}

function HairFrontLayer({
  hair,
  hairGrad,
  hairColorHex,
}: {
  hair: string;
  hairGrad: string;
  hairColorHex: string;
}) {
  if (hair === "boy_turban") {
    const pleatDark = shade(hairColorHex, -0.28);
    const pleatLight = shade(hairColorHex, 0.22);
    return (
      <g>
        <path
          d="M44 82 C42 32, 70 18, 100 18 C130 18, 158 32, 156 82 C156 94, 144 88, 100 70 C56 88, 44 94, 44 82 Z"
          fill={hairGrad}
        />
        <path d="M92 22 Q100 12 108 22 Z" fill={pleatLight} />
        <path d="M46 72 Q72 50 100 68 Q128 50 154 72" stroke={pleatDark} strokeWidth="2.8" fill="none" />
        <path d="M52 60 Q76 38 100 56 Q124 38 148 60" stroke={pleatDark} strokeWidth="2.5" fill="none" />
        <path d="M60 48 Q80 30 100 44 Q120 30 140 48" stroke={pleatDark} strokeWidth="2.2" fill="none" />
        <path d="M88 64 L100 72 L112 64" stroke={pleatLight} strokeWidth="2.2" fill="none" />
      </g>
    );
  }

  if (hair === "boy_manbun") {
    return (
      <g>
        <path
          d="M58 80 C58 48, 142 48, 142 80 C130 64, 116 58, 100 58 C84 58, 70 64, 58 80 Z"
          fill={hairGrad}
        />
        <line x1="84" y1="62" x2="98" y2="46" stroke={shade(hairColorHex, -0.3)} strokeWidth="1.8" />
        <line x1="116" y1="62" x2="102" y2="46" stroke={shade(hairColorHex, -0.3)} strokeWidth="1.8" />
        <line x1="100" y1="60" x2="100" y2="44" stroke={shade(hairColorHex, -0.3)} strokeWidth="1.8" />
      </g>
    );
  }

  if (hair === "boy_spiky_quiff") {
    return (
      <g fill={hairGrad}>
        <path d="M56 82 C56 50, 70 38, 80 32 L88 46 L98 28 L108 44 L120 30 L128 48 L142 50 C144 76, 140 82, 142 82 C132 64, 116 58, 100 58 C82 58, 68 66, 56 82 Z" />
        <path d="M88 46 L98 28 L102 46 Z" fill={shade(hairColorHex, 0.18)} />
        <path d="M108 44 L120 30 L124 48 Z" fill={shade(hairColorHex, 0.18)} />
      </g>
    );
  }

  if (hair === "boy_fade") {
    return (
      <g fill={hairGrad}>
        <path d="M58 82 C58 48, 90 44, 120 46 C142 48, 142 76, 142 82 C132 66, 114 60, 100 60 C80 60, 66 68, 58 82 Z" />
        <path d="M78 60 L86 48 L94 60 Z" opacity="0.8" />
        <path d="M98 60 L106 48 L114 60 Z" opacity="0.8" />
      </g>
    );
  }

  if (hair === "boy_pompadour") {
    return (
      <g fill={hairGrad}>
        <path d="M56 80 C56 40, 105 32, 145 46 C140 68, 124 60, 100 60 C76 60, 62 68, 56 80 Z" />
        <path d="M120 42 L144 58 L134 70 Z" />
      </g>
    );
  }

  if (hair === "boy_buzz") {
    return (
      <path
        d="M58 80 C58 54, 142 54, 142 80 C130 68, 114 65, 100 65 C86 65, 70 68, 58 80 Z"
        fill={hairGrad}
        opacity="0.95"
      />
    );
  }

  if (hair === "girl_spacebuns") {
    return (
      <g fill={hairGrad}>
        <path d="M56 82 C56 46, 144 46, 144 82 C132 62, 114 60, 100 64 C86 60, 68 62, 56 82 Z" />
        <path d="M60 82 Q56 102 62 118 Q66 100 66 84 Z" />
        <path d="M140 82 Q144 102 138 118 Q134 100 134 84 Z" />
      </g>
    );
  }

  if (hair === "girl_waves") {
    return (
      <g fill={hairGrad}>
        <path d="M54 84 C54 50, 146 50, 146 84 C146 120, 138 148, 132 152 C138 116, 126 68, 100 68 C74 68, 62 116, 68 152 C62 148, 54 120, 54 84 Z" />
        <path d="M68 84 Q82 92 98 74 Q84 66 68 84 Z" />
        <path d="M132 84 Q118 92 102 74 Q116 66 132 84 Z" />
      </g>
    );
  }

  if (hair === "girl_bob") {
    return (
      <path
        d="M56 82 C56 50, 144 50, 144 82 C144 114, 134 126, 130 128 C136 96, 128 66, 100 66 C72 66, 64 96, 70 128 C66 126, 56 114, 56 82 Z"
        fill={hairGrad}
      />
    );
  }

  if (hair === "girl_ponytail") {
    return (
      <path
        d="M58 80 C58 48, 142 48, 142 80 C132 66, 116 62, 100 62 C84 62, 68 66, 58 80 Z"
        fill={hairGrad}
      />
    );
  }

  if (hair === "girl_bangs") {
    return (
      <g fill={hairGrad}>
        <path d="M58 80 C58 48, 142 48, 142 80 C140 108, 132 140, 128 145 C132 105, 124 68, 100 68 C76 68, 68 105, 72 145 C68 140, 60 108, 58 80 Z" />
        <path d="M72 75 Q86 85 99 70 Q84 64 72 75 Z" />
        <path d="M128 75 Q114 85 101 70 Q116 64 128 75 Z" />
      </g>
    );
  }

  return (
    <path
      d="M58 80 C58 48, 142 48, 142 80 C130 65, 114 62, 100 62 C86 62, 70 65, 58 80 Z"
      fill={hairGrad}
    />
  );
}

// ---------------------------------------------------------------------------
// 8 Distinct Stylized Outfits
// ---------------------------------------------------------------------------
function OutfitDetails({
  outfit,
  main,
  dark,
  light,
  isMasculine,
}: {
  outfit: string;
  main: string;
  dark: string;
  light: string;
  isMasculine: boolean;
}) {
  // 1. Tech Hoodie
  if (outfit === "outfit_hoodie") {
    return (
      <g>
        <path d="M76 132 Q100 152 124 132 L130 144 Q100 162 70 144 Z" fill={dark} />
        {/* Kangaroo Pouch */}
        <path d="M68 172 L132 172 L126 200 L74 200 Z" fill={shade(main, -0.15)} opacity="0.7" />
        {/* White Drawstrings */}
        <line x1="88" y1="144" x2="88" y2="176" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
        <line x1="112" y1="144" x2="112" y2="176" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
        <circle cx="88" cy="177" r="2.5" fill={light} />
        <circle cx="112" cy="177" r="2.5" fill={light} />
      </g>
    );
  }

  // 2. Varsity Bomber Jacket
  if (outfit === "outfit_varsity") {
    return (
      <g>
        <path d="M84 132 L100 158 L116 132 Z" fill="#ffffff" />
        {/* Contrast Sleeves */}
        <path d="M30 200 L56 144 L44 140 L18 200 Z" fill="#f8fafc" />
        <path d="M170 200 L144 144 L156 140 L182 200 Z" fill="#f8fafc" />
        {/* Lapels */}
        <path d="M58 144 L84 132 L96 200 L48 200 Z" fill={dark} />
        <path d="M142 144 L116 132 L104 200 L152 200 Z" fill={dark} />
        {/* Varsity Chest Letter A */}
        <rect x="66" y="152" width="16" height="16" rx="3" fill="#ffffff" />
        <text x="74" y="164" textAnchor="middle" fontFamily="sans-serif" fontSize="11" fontWeight="bold" fill={dark}>A</text>
        {/* Zipper */}
        <line x1="100" y1="158" x2="100" y2="200" stroke="#f59e0b" strokeWidth="2.5" />
      </g>
    );
  }

  // 3. Formal Blazer & Red Tie
  if (outfit === "outfit_blazer") {
    return (
      <g>
        {/* Shirt Collar */}
        <path d="M82 132 L100 166 L118 132 Z" fill="#ffffff" />
        {/* Red Tie */}
        <path d="M96 146 L104 146 L106 186 L100 194 L94 186 Z" fill="#ef4444" />
        <polygon points="95,144 105,144 103,150 97,150" fill="#b91c1c" />
        {/* Sharp Lapels */}
        <path d="M58 142 L82 132 L94 200 L44 200 Z" fill={dark} />
        <path d="M142 142 L118 132 L106 200 L156 200 Z" fill={dark} />
        <circle cx="94" cy="180" r="2.5" fill="#f59e0b" />
      </g>
    );
  }

  // 4. Campus Crewneck Sweater
  if (outfit === "outfit_crewneck") {
    return (
      <g>
        {/* Rib Collar */}
        <path d="M78 132 Q100 146 122 132" stroke={light} strokeWidth="5" fill="none" />
        {/* Athletic Chest Band */}
        <rect x="52" y="158" width="96" height="15" fill={dark} rx="2" />
        <text x="100" y="169" textAnchor="middle" fontFamily="monospace" fontSize="9" fontWeight="bold" fill="#ffffff" letterSpacing="1">
          CSE · 2026
        </text>
      </g>
    );
  }

  // 5. Developer Graphic Tee
  if (outfit === "outfit_tshirt") {
    return (
      <g>
        {/* Collar line */}
        <path d="M80 132 Q100 144 120 132" stroke={dark} strokeWidth="3.5" fill="none" />
        {/* Graphic Box */}
        <rect x="74" y="154" width="52" height="26" rx="4" fill={dark} />
        <text x="100" y="171" textAnchor="middle" fontFamily="monospace" fontSize="12" fontWeight="bold" fill={light}>
          {"< DEV >"}
        </text>
      </g>
    );
  }

  // 6. Denim Trucker Jacket
  if (outfit === "outfit_denim") {
    return (
      <g>
        <path d="M84 132 L100 156 L116 132 Z" fill="#ffffff" />
        {/* Pointed Folded Collar */}
        <polygon points="76,132 88,146 96,136" fill={dark} />
        <polygon points="124,132 112,146 104,136" fill={dark} />
        {/* Flap Pockets */}
        <rect x="62" y="160" width="22" height="14" rx="2" fill={dark} />
        <circle cx="73" cy="164" r="2" fill="#f59e0b" />
        <rect x="116" y="160" width="22" height="14" rx="2" fill={dark} />
        <circle cx="127" cy="164" r="2" fill="#f59e0b" />
        {/* Bronze Buttons Line */}
        <circle cx="100" cy="168" r="2" fill="#f59e0b" />
        <circle cx="100" cy="182" r="2" fill="#f59e0b" />
      </g>
    );
  }

  // 7. Athletic Esports / Track Jersey
  if (outfit === "outfit_jersey") {
    return (
      <g>
        {/* V-Neck Collar */}
        <polygon points="84,132 100,154 116,132 108,132 100,146 92,132" fill="#ffffff" />
        {/* Racing Shoulder Stripes */}
        <line x1="48" y1="140" x2="28" y2="190" stroke="#ffffff" strokeWidth="3" />
        <line x1="152" y1="140" x2="172" y2="190" stroke="#ffffff" strokeWidth="3" />
        {/* Big Number 01 */}
        <text x="100" y="184" textAnchor="middle" fontFamily="sans-serif" fontSize="22" fontWeight="900" fill="#ffffff" opacity="0.9">01</text>
      </g>
    );
  }

  // 8. Turtleneck Sweater
  if (outfit === "outfit_turtleneck") {
    return (
      <g>
        {/* High Folded Neck */}
        <rect x="80" y="122" width="40" height="20" rx="6" fill={dark} />
        <line x1="84" y1="126" x2="84" y2="138" stroke={light} strokeWidth="1" opacity="0.6" />
        <line x1="92" y1="126" x2="92" y2="138" stroke={light} strokeWidth="1" opacity="0.6" />
        <line x1="100" y1="126" x2="100" y2="138" stroke={light} strokeWidth="1" opacity="0.6" />
        <line x1="108" y1="126" x2="108" y2="138" stroke={light} strokeWidth="1" opacity="0.6" />
        <line x1="116" y1="126" x2="116" y2="138" stroke={light} strokeWidth="1" opacity="0.6" />
      </g>
    );
  }

  return null;
}

function Sticker({
  sticker,
  glowId,
  isTurban,
  isManBun,
}: {
  sticker: string;
  glowId: string;
  isTurban: boolean;
  isManBun: boolean;
}) {
  if (!sticker || sticker === "none") return null;

  if (sticker === "crown1") {
    const yPos = isTurban ? 14 : isManBun ? 20 : 34;
    return (
      <g transform={"translate(100, " + yPos + ")"} filter={"url(#" + glowId + ")"}>
        <path
          d="M-20 8 L-22 -8 L-10 0 L0 -14 L10 0 L22 -8 L20 8 Z"
          fill="#f59e0b"
          stroke="#b45309"
          strokeWidth="1.6"
        />
        <circle cx="-18" cy="-6" r="2" fill="#ef4444" />
        <circle cx="0" cy="-11" r="2.5" fill="#3b82f6" />
        <circle cx="18" cy="-6" r="2" fill="#10b981" />
      </g>
    );
  }

  if (sticker === "star1") {
    return (
      <g transform="translate(146, 40)" filter={"url(#" + glowId + ")"}>
        <path
          d="M0 -12 L3 -3 L12 0 L3 3 L0 12 L-3 3 L-12 0 L-3 -3 Z"
          fill="#facc15"
          stroke="#ca8a04"
          strokeWidth="1.2"
        />
      </g>
    );
  }

  if (sticker === "fire1") {
    return (
      <g transform="translate(144, 44)" filter={"url(#" + glowId + ")"}>
        <path
          d="M0 -14 C-8 -4, -10 4, -4 10 C-1 12, 4 12, 8 8 C12 2, 8 -6, 0 -14 Z"
          fill="#f97316"
        />
        <path
          d="M1 -8 C-4 -2, -4 4, 0 6 C2 7, 5 6, 6 3 C8 0, 5 -4, 1 -8 Z"
          fill="#fde047"
        />
      </g>
    );
  }

  if (sticker === "code1") {
    return (
      <g transform="translate(144, 42)" filter={"url(#" + glowId + ")"}>
        <rect x="-14" y="-10" width="28" height="20" rx="6" fill="#10b981" stroke="#047857" strokeWidth="1.5" />
        <text x="0" y="4" textAnchor="middle" fontFamily="monospace" fontSize="10" fontWeight="bold" fill="#ffffff">
          {"</>"}
        </text>
      </g>
    );
  }

  if (sticker === "heart1") {
    return (
      <g transform="translate(144, 42)" filter={"url(#" + glowId + ")"}>
        <path
          d="M0 8 C-10 0, -12 -8, -6 -11 C-2 -13, 0 -9, 0 -6 C0 -9, 2 -13, 6 -11 C12 -8, 10 0, 0 8 Z"
          fill="#f43f5e"
        />
      </g>
    );
  }

  return null;
}

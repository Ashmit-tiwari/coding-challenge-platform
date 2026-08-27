"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Shuffle,
  RotateCcw,
  Save,
  Check,
  Sparkles,
  User,
  Palette,
  Smile,
  Eye,
  Glasses,
  Scissors,
  Shirt,
  Sticker,
  Brush,
  Loader2,
  ChevronLeft,
} from "lucide-react";

import { AuthGuard } from "@/components/auth-guard";
import { AvatarSvg } from "@/components/avatar-svg";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/store";

// ---------------------------------------------------------------------------
// Types — mirror of GET /api/profile/avatar response shape
// ---------------------------------------------------------------------------
type AvatarConfig = Record<string, string>;
type AvatarCatalog = Record<string, string[]>;

// ---------------------------------------------------------------------------
// Category metadata
// ---------------------------------------------------------------------------
interface CategoryMeta {
  key: string;
  label: string;
  icon: typeof User;
  description: string;
}

const CATEGORIES: CategoryMeta[] = [
  { key: "gender", label: "Presentation", icon: User, description: "Base body shape" },
  { key: "skin", label: "Skin", icon: Palette, description: "Skin tone" },
  { key: "face", label: "Face", icon: Smile, description: "Face shape" },
  { key: "hair", label: "Hairstyle", icon: Scissors, description: "Hair cut + color" },
  { key: "eyes", label: "Eyes", icon: Eye, description: "Eye style" },
  { key: "eyebrows", label: "Eyebrows", icon: Brush, description: "Brow shape" },
  { key: "glasses", label: "Glasses", icon: Glasses, description: "Eyewear" },
  { key: "facial", label: "Facial hair", icon: Brush, description: "Beard / mustache" },
  { key: "outfit", label: "Outfit", icon: Shirt, description: "Clothing cut" },
  { key: "outfitVibe", label: "Outfit vibe", icon: Shirt, description: "Color palette" },
  { key: "sticker", label: "Sticker", icon: Sticker, description: "Cute accessory" },
  { key: "expression", label: "Expression", icon: Smile, description: "Mood" },
];

// Friendly labels for option ids
const OPTION_LABELS: Record<string, Record<string, string>> = {
  gender: { neutral: "Neutral", masculine: "Masculine", feminine: "Feminine" },
  outfitVibe: {
    casual: "Casual",
    tech: "Tech",
    sporty: "Sporty",
    formal: "Formal",
    street: "Street",
    retro: "Retro",
  },
  sticker: {
    none: "None",
    star1: "Star",
    code1: "Code",
    fire1: "Fire",
    bolt1: "Bolt",
    rocket1: "Rocket",
    heart1: "Heart",
    crown1: "Crown",
  },
  expression: {
    smile: "Smile",
    cool: "Cool",
    wink: "Wink",
    happy: "Happy",
    focus: "Focus",
    surprise: "Surprise",
    laugh: "Laugh",
  },
  facial: {
    none: "None",
    beard1: "Beard",
    beard2: "Full beard",
    mustache1: "Mustache",
    stubble1: "Stubble",
  },
  glasses: {
    none: "None",
    glasses1: "Square",
    glasses2: "Round",
    glasses3: "Sunglasses",
    glasses4: "Top bar",
  },
};

// Skin tone swatch colors (mirror of avatar-svg SKIN_COLORS)
const SKIN_SWATCH: Record<string, string> = {
  skin1: "#f3d2b3",
  skin2: "#e7b58e",
  skin3: "#d39a72",
  skin4: "#b97d4e",
  skin5: "#8a5a32",
  skin6: "#5e3a22",
};

// Hair color swatches (mirror of avatar-svg HAIR_COLORS)
const HAIR_SWATCH: Record<string, string> = {
  hair1: "#1f1b18",
  hair2: "#3a2a1d",
  hair3: "#5c3a1e",
  hair4: "#8b5a2b",
  hair5: "#c98a3a",
  hair6: "#d9b35a",
  hair7: "#4a3550",
  hair8: "#b53a3a",
  hair9: "#3a6a8a",
  hair10: "#7a7a7a",
};

// Outfit vibe swatches (mirror of avatar-svg outfitColors)
const OUTFIT_VIBE_SWATCH: Record<string, string> = {
  casual: "#2f6f57",
  tech: "#272a33",
  sporty: "#b5432f",
  formal: "#2a3550",
  street: "#6a4a8a",
  retro: "#c98a3a",
};

function optionLabel(category: string, value: string): string {
  return OPTION_LABELS[category]?.[value] || value;
}

// Sensible defaults for "Reset"
const DEFAULT_CONFIG: AvatarConfig = {
  gender: "neutral",
  skin: "skin1",
  face: "face1",
  hair: "hair1",
  eyes: "eyes1",
  eyebrows: "brows1",
  glasses: "none",
  facial: "none",
  outfit: "outfit1",
  outfitVibe: "casual",
  sticker: "none",
  expression: "smile",
};

// ---------------------------------------------------------------------------
// Page (default export)
// ---------------------------------------------------------------------------
export default function Page() {
  return (
    <AuthGuard>
      <AvatarBuilder />
    </AuthGuard>
  );
}

// ---------------------------------------------------------------------------
// Avatar builder
// ---------------------------------------------------------------------------
function AvatarBuilder() {
  const { student, refreshStudent } = useAuth();
  const [config, setConfig] = useState<AvatarConfig>({});
  const [savedConfig, setSavedConfig] = useState<AvatarConfig>({});
  const [catalog, setCatalog] = useState<AvatarCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("gender");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/profile/avatar", { cache: "no-store" });
        const json = await res.json();
        if (!active) return;
        if (!res.ok) {
          toast.error(json?.error || "Failed to load avatar builder");
          return;
        }
        const merged = { ...DEFAULT_CONFIG, ...(json.avatar || {}) };
        setConfig(merged);
        setSavedConfig(merged);
        setCatalog(json.catalog as AvatarCatalog);
      } catch {
        if (active) toast.error("Network error — could not load avatar builder");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const dirty = useMemo(() => {
    const keys = new Set([...Object.keys(config), ...Object.keys(savedConfig)]);
    for (const k of keys) {
      if ((config[k] || "") !== (savedConfig[k] || "")) return true;
    }
    return false;
  }, [config, savedConfig]);

  function setOption(category: string, value: string) {
    setConfig((prev) => ({ ...prev, [category]: value }));
  }

  const randomize = useCallback(() => {
    if (!catalog) return;
    const next: AvatarConfig = { ...config };
    for (const cat of Object.keys(catalog)) {
      const opts = catalog[cat];
      if (opts && opts.length > 0) {
        const pick = opts[Math.floor(Math.random() * opts.length)];
        next[cat] = pick;
      }
    }
    setConfig(next);
    toast.message("Randomized — preview updated");
  }, [catalog, config]);

  const reset = useCallback(() => {
    setConfig({ ...DEFAULT_CONFIG });
    toast.message("Reset to defaults — preview updated");
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/profile/avatar", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json?.error || "Failed to save avatar");
        return;
      }
      // Backend sanitizes — sync local state to what the server accepted
      const accepted = { ...DEFAULT_CONFIG, ...(json.avatar || {}) };
      setConfig(accepted);
      setSavedConfig(accepted);
      toast.success("Avatar saved");
      // refresh student in global store so header avatar updates too
      try {
        await refreshStudent();
      } catch {}
    } catch {
      toast.error("Network error — could not save avatar");
    } finally {
      setSaving(false);
    }
  }, [config, refreshStudent]);

  if (loading) return <AvatarBuilderSkeleton />;

  return (
    <TooltipProvider delayDuration={120}>
      <div className="flex flex-col gap-4 sm:gap-6">
        {/* Header / breadcrumb */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between flex-wrap gap-2"
        >
          <div>
            <Button asChild variant="ghost" size="sm" className="mb-1 -ml-2 text-muted-foreground">
              <Link href="/profile">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back to profile
              </Link>
            </Button>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-primary" />
              Avatar builder
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Build your Bitmoji-style coding identity. Changes preview live — save when you’re happy.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {dirty && (
              <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-500/40">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse" />
                Unsaved changes
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={reset}>
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Reset
            </Button>
            <Button variant="outline" size="sm" onClick={randomize}>
              <Shuffle className="h-4 w-4 mr-1.5" />
              Randomize
            </Button>
            <Button size="sm" onClick={save} disabled={saving || !dirty}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1.5" />
                  Save avatar
                </>
              )}
            </Button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
          {/* Live preview */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="lg:col-span-2"
          >
            <Card className="p-4 sm:p-6 h-full">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Live preview
                </CardTitle>
                <CardDescription className="mt-1">
                  This is how your avatar appears on your profile, the leaderboard and your dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                <div className="relative rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border border-border/60 p-6 sm:p-8 flex flex-col items-center justify-center gap-4 overflow-hidden">
                  <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full blur-3xl opacity-30 bg-primary/30" />
                  <div className="absolute -bottom-12 -left-12 h-40 w-40 rounded-full blur-3xl opacity-30 bg-accent/30" />
                  <div className="relative rounded-full ring-4 ring-background shadow-xl">
                    <AvatarSvg config={config} size={240} />
                  </div>
                  <div className="relative text-center">
                    <div className="text-lg font-semibold">
                      {student?.name || "Your name"}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {student?.uid || ""}
                    </div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <Button asChild variant="outline" size="sm">
                    <Link href="/profile">
                      <ChevronLeft className="h-3.5 w-3.5 mr-1.5" />
                      View profile
                    </Link>
                  </Button>
                  <Button
                    variant={dirty ? "default" : "secondary"}
                    size="sm"
                    onClick={save}
                    disabled={saving || !dirty}
                  >
                    {saving ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    {dirty ? "Save changes" : "Saved"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Category tabs / panels */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="lg:col-span-3"
          >
            <Card className="p-4 sm:p-6 h-full">
              <CardHeader className="px-0 pt-0">
                <CardTitle className="flex items-center gap-2">
                  <Brush className="h-4 w-4 text-primary" />
                  Customize
                </CardTitle>
                <CardDescription className="mt-1">
                  Pick from the options below. Selected chips are highlighted with a check.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                {!catalog ? (
                  <div className="text-sm text-muted-foreground">
                    Catalog unavailable.
                  </div>
                ) : (
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="flex w-full flex-wrap h-auto justify-start gap-1 bg-muted/40 p-1">
                      {CATEGORIES.map((cat) => {
                        const Icon = cat.icon;
                        return (
                          <TabsTrigger
                            key={cat.key}
                            value={cat.key}
                            className="flex-1 min-w-[88px] h-8 data-[state=active]:bg-background"
                          >
                            <Icon className="h-3.5 w-3.5" />
                            <span className="text-xs">{cat.label}</span>
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>

                    {CATEGORIES.map((cat) => (
                      <TabsContent key={cat.key} value={cat.key} className="mt-4">
                        <OptionGrid
                          category={cat.key}
                          label={cat.label}
                          description={cat.description}
                          options={catalog[cat.key] || []}
                          selected={config[cat.key] || ""}
                          onSelect={(v) => setOption(cat.key, v)}
                          currentConfig={config}
                        />
                      </TabsContent>
                    ))}
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Option grid
// ---------------------------------------------------------------------------
function OptionGrid({
  category,
  label,
  description,
  options,
  selected,
  onSelect,
  currentConfig,
}: {
  category: string;
  label: string;
  description: string;
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
  currentConfig: AvatarConfig;
}) {
  return (
    <div>
      <div className="mb-3">
        <div className="text-sm font-semibold">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
        {options.map((opt) => {
          const isSelected = selected === opt;
          return (
            <Tooltip key={opt}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onSelect(opt)}
                  className={cn(
                    "relative rounded-xl border p-2 transition-all text-left",
                    "hover:shadow-sm hover:-translate-y-0.5",
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/40"
                      : "border-border/60 bg-muted/20 hover:bg-muted/40",
                  )}
                  aria-pressed={isSelected}
                >
                  {isSelected && (
                    <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow ring-2 ring-background">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                  <OptionSwatch
                    category={category}
                    option={opt}
                    currentConfig={currentConfig}
                  />
                  <div
                    className={cn(
                      "text-[11px] mt-1.5 font-medium leading-tight line-clamp-1",
                      isSelected ? "text-primary" : "text-foreground/80",
                    )}
                  >
                    {optionLabel(category, opt)}
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                {optionLabel(category, opt)}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Option swatch — shows a small visual preview of the option
// ---------------------------------------------------------------------------
function OptionSwatch({
  category,
  option,
  currentConfig,
}: {
  category: string;
  option: string;
  currentConfig: AvatarConfig;
}) {
  // Color-based swatches show a colored circle
  if (category === "skin") {
    const color = SKIN_SWATCH[option];
    if (color) {
      return (
        <div className="flex items-center justify-center h-16 w-full">
          <div
            className="h-12 w-12 rounded-full ring-2 ring-background shadow-sm"
            style={{ backgroundColor: color }}
          />
        </div>
      );
    }
  }
  if (category === "hair") {
    const color = HAIR_SWATCH[option];
    if (color) {
      return (
        <div className="flex items-center justify-center h-16 w-full">
          <div
            className="h-10 w-10 rounded-full ring-2 ring-background shadow-sm flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${color}, ${shade(color, -0.25)})` }}
          >
            <div className="h-6 w-6 rounded-full bg-skin1" style={{ background: SKIN_SWATCH.skin1 }} />
          </div>
        </div>
      );
    }
  }
  if (category === "outfitVibe") {
    const color = OUTFIT_VIBE_SWATCH[option];
    if (color) {
      return (
        <div className="flex items-center justify-center h-16 w-full">
          <div
            className="h-10 w-12 rounded-lg ring-2 ring-background shadow-sm"
            style={{ background: `linear-gradient(135deg, ${color}, ${shade(color, -0.25)})` }}
          />
        </div>
      );
    }
  }

  // Shape-based swatches show a tiny avatar preview with only this option changed
  // (rest defaults), so the user sees what the option looks like in isolation.
  const previewConfig: AvatarConfig = {
    ...DEFAULT_CONFIG,
    ...currentConfig,
    [category]: option,
  };
  return (
    <div className="flex items-center justify-center h-16 w-full bg-gradient-to-br from-primary/5 to-transparent rounded-md overflow-hidden">
      <AvatarSvg config={previewConfig} size={56} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------
function AvatarBuilderSkeleton() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6">
        <Card className="lg:col-span-2 p-4 sm:p-6">
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-3 w-64 mb-4" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </Card>
        <Card className="lg:col-span-3 p-4 sm:p-6">
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-3 w-64 mb-4" />
          <div className="flex flex-wrap gap-1 mb-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-md" />
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers — color shading, copied locally from avatar-svg (kept in sync)
// ---------------------------------------------------------------------------
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

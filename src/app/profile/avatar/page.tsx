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
import { AvatarSvg, SKIN_COLORS, HAIR_COLORS, OUTFIT_COLORS } from "@/components/avatar-svg";
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

type AvatarConfig = Record<string, string>;
type AvatarCatalog = Record<string, string[]>;

interface CategoryMeta {
  key: string;
  label: string;
  icon: typeof User;
  description: string;
}

const CATEGORIES: CategoryMeta[] = [
  { key: "gender", label: "Figure", icon: User, description: "Masculine (athletic/chiseled) vs Feminine (slender/soft)" },
  { key: "skin", label: "Skin Tone", icon: Palette, description: "Select your complexion" },
  { key: "hair", label: "Hairstyle", icon: Scissors, description: "6 Boys hairstyles & 5 Girls hairstyles" },
  { key: "hairColor", label: "Hair Color", icon: Palette, description: "Select your hair / turban color shade" },
  { key: "outfit", label: "Outfit Style", icon: Shirt, description: "Hoodies, varsity jacket, blazers, denim & tees" },
  { key: "outfitVibe", label: "Outfit Color", icon: Palette, description: "Choose your wardrobe clothing colorway" },
  { key: "eyes", label: "Eyes", icon: Eye, description: "Eye style & expression" },
  { key: "eyebrows", label: "Eyebrows", icon: Brush, description: "Brow thickness & shape" },
  { key: "glasses", label: "Glasses", icon: Glasses, description: "Eyewear & shades" },
  { key: "facial", label: "Beard / Stubble", icon: Brush, description: "Beards & mustache for boys" },
  { key: "sticker", label: "Accessory", icon: Sticker, description: "Regal crown, flame streak & code badge" },
  { key: "expression", label: "Mood", icon: Smile, description: "Facial expression" },
];

const OPTION_LABELS: Record<string, Record<string, string>> = {
  gender: {
    masculine: "Masculine (Athletic / Chiseled Jaw)",
    feminine: "Feminine (Slender / Soft Jaw / Eyelashes)",
    neutral: "Neutral Figure",
  },
  hair: {
    boy_turban: "👑 Sikh Turban / Dastar (Boys)",
    boy_fade: "✂️ Classic Textured Fade (Boys)",
    boy_pompadour: "💈 Pompadour Undercut (Boys)",
    boy_spiky_quiff: "⚡ Textured Spiky Quiff (Boys)",
    boy_buzz: "🪒 Clean Buzz Cut (Boys)",
    boy_manbun: "🥋 Samurai Man Bun (Boys)",
    girl_waves: "🌊 Long Beach Waves (Girls)",
    girl_bob: "✨ Chic Sleek Bob (Girls)",
    girl_ponytail: "🎀 High Ponytail with Scrunchie (Girls)",
    girl_bangs: "🌸 Curtain Bangs & Straight (Girls)",
    girl_spacebuns: "🪐 Double Space Buns (Girls)",
    hair1: "Classic Fade",
    hair2: "Sleek Bob",
    hair3: "Beach Waves",
    hair4: "Ponytail",
    hair5: "Spiky Quiff",
    hair6: "Curtain Bangs",
    hair7: "Sikh Turban",
    hair8: "Pompadour",
    hair9: "Space Buns",
    hair10: "Buzz Cut",
    hair11: "Man Bun",
    hair12: "Locs",
    boy_curly: "Spiky Quiff",
    girl_hijab: "Space Buns",
  },
  hairColor: {
    color_black: "Jet Black",
    color_espresso: "Dark Espresso",
    color_brown: "Chocolate Brown",
    color_auburn: "Chestnut Auburn",
    color_blonde: "Honey Blonde",
    color_platinum: "Golden Platinum",
    color_crimson: "Velvet Crimson",
    color_purple: "Plum Purple",
    color_blue: "Sapphire Blue",
    color_silver: "Silver Ash",
    color_rose: "Pastel Rose",
    color_teal: "Emerald Teal",
  },
  outfit: {
    outfit_hoodie: "🧥 Tech Drawstring Hoodie",
    outfit_varsity: "🏆 Collegiate Varsity Bomber",
    outfit_blazer: "👔 Executive Blazer & Red Tie",
    outfit_crewneck: "🎓 Campus Retro Crewneck",
    outfit_tshirt: "💻 Developer Graphic Tee",
    outfit_denim: "👖 Classic Denim Jacket",
    outfit_jersey: "🏎️ Athletic Esports Jersey",
    outfit_turtleneck: "🧣 Cozy Ribbed Turtleneck",
    outfit1: "Tech Hoodie",
    outfit2: "Varsity Bomber",
    outfit3: "Formal Blazer",
    outfit4: "Campus Crewneck",
    outfit5: "Developer Tee",
    outfit6: "Denim Jacket",
    outfit7: "Esports Jersey",
    outfit8: "Turtleneck",
  },
  outfitVibe: {
    tech: "Tech Emerald",
    casual: "Royal Blue",
    sporty: "Crimson Red",
    formal: "Indigo Navy",
    street: "Electric Violet",
    retro: "Amber Gold",
    cyber: "Cyber Cyan",
    midnight: "Midnight Onyx",
    sunset: "Sunset Orange",
    rose: "Pastel Rose",
  },
  glasses: {
    none: "None",
    glasses1: "Round Wireframe",
    glasses2: "Square Acetate",
    glasses3: "Sunglasses",
    glasses4: "Designer Cat-Eye",
  },
  sticker: {
    none: "None",
    crown1: "Regal Crown (Headwear)",
    star1: "Gold Sparkle",
    code1: "Code Badge",
    fire1: "Streak Flame",
    bolt1: "Lightning Bolt",
    rocket1: "Rocket",
    heart1: "Pixel Heart",
  },
  expression: {
    smile: "Warm Smile",
    cool: "Confident Cool",
    wink: "Playful Wink",
    happy: "Happy Laugh",
    focus: "Focused Coder",
    surprise: "Surprise",
    laugh: "Big Laugh",
  },
  facial: {
    none: "None",
    beard1: "Trimmed Goatee",
    beard2: "Full Beard",
    mustache1: "Mustache",
    stubble1: "Light Stubble",
  },
};

const DEFAULT_CONFIG: AvatarConfig = {
  gender: "masculine",
  skin: "skin2",
  hair: "boy_fade",
  hairColor: "color_espresso",
  face: "face1",
  eyes: "eyes1",
  eyebrows: "brows1",
  glasses: "none",
  facial: "none",
  outfit: "outfit_hoodie",
  outfitVibe: "tech",
  sticker: "none",
  expression: "smile",
};

function optionLabel(category: string, value: string): string {
  return OPTION_LABELS[category]?.[value] || value;
}

export default function AvatarBuilderPage() {
  return (
    <AuthGuard>
      <div className="container max-w-6xl mx-auto px-4 py-6 sm:py-8">
        <AvatarBuilderContent />
      </div>
    </AuthGuard>
  );
}

function AvatarBuilderContent() {
  const { student, refreshStudent } = useAuth();
  const [catalog, setCatalog] = useState<AvatarCatalog | null>(null);
  const [config, setConfig] = useState<AvatarConfig>(DEFAULT_CONFIG);
  const [savedConfig, setSavedConfig] = useState<AvatarConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("outfit");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/profile/avatar");
        if (!res.ok) throw new Error("Failed to load");
        const json = await res.json();
        if (!active) return;
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
      const accepted = { ...DEFAULT_CONFIG, ...(json.avatar || {}) };
      setConfig(accepted);
      setSavedConfig(accepted);
      toast.success("Avatar saved successfully");
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
        {/* Header */}
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
              Bitmoji Avatar Studio
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Live customizer: choose hairstyles, hair color, outfits, clothing colors, and figure.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={reset}>
              <RotateCcw className="h-4 w-4 mr-1.5" />
              Reset
            </Button>
            <Button variant="outline" size="sm" onClick={randomize}>
              <Shuffle className="h-4 w-4 mr-1.5" />
              Randomize
            </Button>
            <Button size="sm" onClick={save} disabled={saving || !dirty}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-1.5" />
              )}
              {dirty ? "Save avatar" : "Saved"}
            </Button>
          </div>
        </motion.div>

        {/* Studio Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Live Preview Panel */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="lg:col-span-2"
          >
            <Card className="p-6 sticky top-20 bg-card/60 backdrop-blur-sm border-border/70">
              <CardHeader className="px-0 pt-0 pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" />
                  Live Preview
                </CardTitle>
                <CardDescription className="text-xs">
                  Updates instantly as you click on hairstyles, hair colors, outfits, or figure options.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 flex flex-col items-center">
                <div className="relative my-4 flex items-center justify-center">
                  <div className="h-48 w-48 rounded-full ring-4 ring-primary/20 shadow-xl overflow-hidden bg-background">
                    <AvatarSvg config={config} size={192} />
                  </div>
                  {dirty && (
                    <Badge className="absolute -bottom-2 bg-amber-500 hover:bg-amber-600 text-white text-[10px] px-2 py-0.5 shadow">
                      Unsaved changes
                    </Badge>
                  )}
                </div>

                <div className="text-center mt-3">
                  <div className="font-semibold text-foreground text-base">
                    {student?.name || "Student"}
                  </div>
                  <div className="text-xs font-mono text-muted-foreground uppercase">
                    {student?.uid || "25LBCSXXXX"}
                  </div>
                </div>

                <div className="w-full flex items-center justify-between gap-2 mt-6 pt-4 border-t border-border/40">
                  <Button asChild variant="ghost" size="sm">
                    <Link href="/profile">
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      View profile
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    onClick={save}
                    disabled={saving || !dirty}
                    className="min-w-[120px]"
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

          {/* Customization Tabs */}
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
                  Customize Features
                </CardTitle>
                <CardDescription className="mt-1">
                  Click any option to preview it live on your avatar.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0">
                {!catalog ? (
                  <div className="text-sm text-muted-foreground">Catalog loading…</div>
                ) : (
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="flex w-full flex-wrap h-auto justify-start gap-1.5 bg-muted/40 p-1.5 rounded-lg mb-4">
                      {CATEGORIES.map((cat) => {
                        const Icon = cat.icon;
                        return (
                          <TabsTrigger
                            key={cat.key}
                            value={cat.key}
                            className="flex items-center gap-1.5 px-3 py-1.5 h-8 data-[state=active]:bg-background data-[state=active]:text-primary font-medium"
                          >
                            <Icon className="h-3.5 w-3.5" />
                            <span className="text-xs">{cat.label}</span>
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>

                    {CATEGORIES.map((cat) => (
                      <TabsContent key={cat.key} value={cat.key} className="mt-2">
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
  const visibleOptions = useMemo(() => {
    if (category === "hair") {
      return [
        "boy_turban",
        "boy_fade",
        "boy_pompadour",
        "boy_spiky_quiff",
        "boy_buzz",
        "boy_manbun",
        "girl_waves",
        "girl_bob",
        "girl_ponytail",
        "girl_bangs",
        "girl_spacebuns",
      ];
    }
    if (category === "outfit") {
      return [
        "outfit_hoodie",
        "outfit_varsity",
        "outfit_blazer",
        "outfit_crewneck",
        "outfit_tshirt",
        "outfit_denim",
        "outfit_jersey",
        "outfit_turtleneck",
      ];
    }
    return options;
  }, [category, options]);

  return (
    <div>
      <div className="mb-3">
        <div className="text-sm font-semibold text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {visibleOptions.map((opt) => {
          const isSelected = selected === opt;
          return (
            <Tooltip key={opt}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onSelect(opt)}
                  className={cn(
                    "relative rounded-xl border p-2.5 transition-all text-left flex flex-col justify-between min-h-[92px]",
                    "hover:shadow-md hover:-translate-y-0.5",
                    isSelected
                      ? "border-primary bg-primary/10 ring-2 ring-primary/40 shadow-sm"
                      : "border-border/60 bg-muted/20 hover:bg-muted/50",
                  )}
                  aria-pressed={isSelected}
                >
                  {isSelected && (
                    <div className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow ring-2 ring-background z-10">
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
                      "text-[11px] mt-2 font-medium leading-tight line-clamp-2",
                      isSelected ? "text-primary font-semibold" : "text-foreground/80",
                    )}
                  >
                    {optionLabel(category, opt)}
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs font-medium">
                {optionLabel(category, opt)}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}

function OptionSwatch({
  category,
  option,
  currentConfig,
}: {
  category: string;
  option: string;
  currentConfig: AvatarConfig;
}) {
  if (category === "skin") {
    const color = SKIN_COLORS[option];
    if (color) {
      return (
        <div className="flex items-center justify-center h-14 w-full">
          <div
            className="h-10 w-10 rounded-full ring-2 ring-background shadow-md"
            style={{ backgroundColor: color }}
          />
        </div>
      );
    }
  }

  if (category === "hairColor") {
    const color = HAIR_COLORS[option];
    if (color) {
      return (
        <div className="flex items-center justify-center h-14 w-full">
          <div
            className="h-10 w-10 rounded-full ring-2 ring-background shadow-md"
            style={{ backgroundColor: color }}
          />
        </div>
      );
    }
  }

  if (category === "outfitVibe") {
    const colors = OUTFIT_COLORS[option];
    if (colors) {
      return (
        <div className="flex items-center justify-center h-14 w-full">
          <div
            className="h-10 w-12 rounded-lg ring-2 ring-background shadow-md flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${colors[0]}, ${colors[1]})` }}
          >
            <div className="h-3 w-3 rounded-full bg-white/40 shadow-inner" />
          </div>
        </div>
      );
    }
  }

  const previewConfig: AvatarConfig = {
    ...DEFAULT_CONFIG,
    ...currentConfig,
    [category]: option,
  };

  return (
    <div className="flex items-center justify-center h-14 w-full bg-gradient-to-br from-primary/5 to-transparent rounded-lg overflow-hidden">
      <AvatarSvg config={previewConfig} size={52} />
    </div>
  );
}

function AvatarBuilderSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-12 w-64 bg-muted rounded-md animate-pulse" />
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 h-[380px] bg-muted/40 rounded-xl animate-pulse" />
        <div className="lg:col-span-3 h-[420px] bg-muted/40 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

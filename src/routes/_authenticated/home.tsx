import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { FlaskConical, Menu, Sparkles, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { art, getPlayerTier } from "@/components/game/art";
import { useClicker, useGame, useOptimisticTaps } from "@/hooks/use-game";
import { clickBase, clickCap, clickReq, mult, personalMods, xpForLevel } from "@/game/engine";
import { corpMods } from "@/game/corp";
import { BALANCE } from "@/game/config";
import { money } from "@/lib/format";
import { GameImg, Loading, Progress } from "@/components/game/ui";
import { useMenu } from "@/context/menu";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "Clicker — Capitalfortune" },
      { name: "description", content: "Tap to earn your fortune." },
      { property: "og:title", content: "Clicker — Capitalfortune" },
      { property: "og:description", content: "Tap to earn your fortune." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: HomePage,
});

type PopItem = {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  wave: number;
  rotStart: number;
  rotEnd: number;
  scale: number;
  duration: number;
};

function HomePage() {
  const { data } = useGame();
  const opt = useOptimisticTaps(data);
  const { tap, buffer } = useClicker();
  const { openMenu } = useMenu();
  const [pops, setPops] = useState<PopItem[]>([]);
  const popId = useRef(0);
  if (!data) return <Loading />;
  const s = data.state;
  const p = personalMods(s);
  const cm = corpMods(data.corp);
  const value = clickBase(s.clicker.level) * mult("clickPct", p, cm);
  const req = clickReq(s.clicker.level);
  const cap = clickCap(s, p);
  const maxed = s.clicker.level >= BALANCE.clicker.hardCap;
  const shownCount = maxed ? 0 : Math.min(req, s.clicker.count + buffer);
  const xpPct = Math.min(100, ((s.xp + opt.xp) / xpForLevel(s.level)) * 100);

  const createPop = (x: number, y: number): PopItem => {
    const id = ++popId.current;
    // Randomized wavy pattern & randomized upward flow direction
    const dx = (Math.random() - 0.5) * 50; // -25px to +25px gentle lateral drift
    const dy = -70 - Math.random() * 45; // -70px to -115px smooth upward float
    const wave = (Math.random() < 0.5 ? -1 : 1) * (12 + Math.random() * 20); // fluid S-curve wave swing
    const rotStart = (Math.random() - 0.5) * 20; // gentle initial rotation
    const rotEnd = (Math.random() - 0.5) * 45; // gentle final rotation
    const scale = 0.9 + Math.random() * 0.22; // coin scale
    const duration = 1350 + Math.floor(Math.random() * 250); // 1350ms - 1600ms smooth fluid slow pace
    return { id, x, y, dx, dy, wave, rotStart, rotEnd, scale, duration };
  };

  const handleFramePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    tap();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(20, Math.min(rect.width - 20, e.clientX - rect.left));
    const y = Math.max(20, Math.min(rect.height - 20, e.clientY - rect.top));
    const pop = createPop(x, y);
    setPops((list) => [...list.slice(-24), pop]);
    setTimeout(() => setPops((list) => list.filter((q) => q.id !== pop.id)), pop.duration + 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      tap();
      const rect = e.currentTarget.getBoundingClientRect();
      const x = rect.width / 2;
      const y = rect.height / 2;
      const pop = createPop(x, y);
      setPops((list) => [...list.slice(-24), pop]);
      setTimeout(() => setPops((list) => list.filter((q) => q.id !== pop.id)), pop.duration + 50);
    }
  };

  return (
    <div className="tapper-scene flex h-full flex-col justify-between overflow-hidden py-1">
      {/* Retained Header Components within Tap Menu */}
      <div className="shrink-0 flex items-center justify-between gap-2 pt-1 pb-1">
        {/* Top-left: Window round corner Box (Player Profile Image with Tier Badge, expanded name & progress bar) */}
        {(() => {
          const tierInfo = getPlayerTier(s.level);
          return (
            <div className="game-panel flex items-center gap-2.5 rounded-2xl border border-border/70 bg-card/85 px-3 py-1.5 backdrop-blur-md shadow-panel">
              <Link
                to="/profile"
                aria-label={`Your profile - ${tierInfo.tierName} ${tierInfo.romanSublevel}`}
                className="relative shrink-0 flex items-center group"
                title={`${tierInfo.tierName} Tier · Sublevel ${tierInfo.romanSublevel} (Level ${s.level})`}
              >
                <div className="relative h-10 w-10 sm:h-11 sm:w-11 rounded-xl border border-primary-glow/70 bg-gradient-to-b from-primary/15 to-card/60 p-0.5 flex items-center justify-center shadow-[0_0_10px_rgba(139,92,246,0.35)] overflow-hidden transition-transform group-hover:scale-105">
                  <img
                    src={tierInfo.badgePath}
                    alt={`${tierInfo.tierName} badge`}
                    className="h-full w-full object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]"
                  />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-gain shadow-[0_0_5px_rgba(34,197,94,0.9)]" />
              </Link>

              <div className="min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-1.5">
                  <span className="truncate text-xs sm:text-sm font-bold text-foreground max-w-[90px] sm:max-w-[130px]">
                    {s.username || "Tycoon"}
                  </span>
                  <span className="shrink-0 rounded bg-gradient-to-r from-purple-900/90 to-indigo-900/90 px-1.5 py-0.5 text-[8px] sm:text-[9px] font-extrabold tracking-wider text-primary-glow border border-primary/40">
                    LV {s.level}
                  </span>
                  <span className="hidden sm:inline-block shrink-0 text-[10px] font-mono text-muted-foreground uppercase">
                    {tierInfo.tierName} {tierInfo.romanSublevel}
                  </span>
                </div>
                {/* Expanded Progress Bar utilizing acquired empty space */}
                <div className="flex items-center gap-2 mt-1">
                  <div className="game-progress h-1.5 w-24 sm:w-32 overflow-hidden rounded-full bg-muted border border-primary/25">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 via-indigo-500 to-cyan-400 shadow-[0_0_6px_rgba(167,139,250,0.8)] transition-all duration-300"
                      style={{ width: `${xpPct}%` }}
                    />
                  </div>
                  <span className="num text-[9px] font-mono text-muted-foreground whitespace-nowrap">
                    {Math.floor(xpPct)}%
                  </span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Top space filled with game font */}
        <div className="flex flex-1 items-center justify-center px-1">
          <span className="brand-name text-xs sm:text-base font-extrabold tracking-wider text-center select-none truncate drop-shadow-[0_0_8px_rgba(167,139,250,0.4)]">
            Capital<span>fortune</span>
          </span>
        </div>

        {/* Menu on the right: box window */}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Menu"
          onClick={openMenu}
          className="shrink-0 h-9 w-9 rounded-lg border border-border/60 bg-card/60 hover:bg-card"
        >
          <Menu className="game-icon h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center min-h-0 py-1">
        <div className="mb-0.5 flex items-center justify-center gap-1.5 text-xs uppercase text-muted-foreground">
          <Wallet className="h-3.5 w-3.5 text-gold" />
          Current balance
        </div>
        <div className="num text-2xl sm:text-3xl font-bold">{money(s.cash + opt.cash)}</div>

        {/* Frames Window replacing the coin press with full-area click generator */}
        <div
          onPointerDown={handleFramePointerDown}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="button"
          aria-label="Tap anywhere within frame to generate wealth"
          className="relative my-2 w-full flex-1 min-h-[220px] sm:min-h-[280px] rounded-2xl border border-primary/35 bg-gradient-to-b from-card/70 via-surface/40 to-muted/60 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(167,139,250,0.25)] select-none cursor-pointer overflow-hidden touch-manipulation focus:outline-none focus:ring-1 focus:ring-primary/60 active:border-primary-glow transition-all flex items-center justify-center group"
        >
          {/* Cyberpunk Frames Window Corner Accents */}
          <div className="pointer-events-none absolute inset-2 rounded-xl border border-primary/15" />
          <div className="pointer-events-none absolute left-3 top-3 h-3.5 w-3.5 border-l-2 border-t-2 border-primary-glow/80" />
          <div className="pointer-events-none absolute right-3 top-3 h-3.5 w-3.5 border-r-2 border-t-2 border-primary-glow/80" />
          <div className="pointer-events-none absolute bottom-3 left-3 h-3.5 w-3.5 border-b-2 border-l-2 border-primary-glow/80" />
          <div className="pointer-events-none absolute bottom-3 right-3 h-3.5 w-3.5 border-b-2 border-r-2 border-primary-glow/80" />

          {/* Ambient Window Grid & Glow */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.14),transparent_70%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(139,92,246,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(139,92,246,0.04)_1px,transparent_1px)] bg-[size:28px_28px]" />

          {/* Tap-generated water disturbance. Each wave is clipped by this frame. */}
          {pops.map((pp) => (
            <div
              key={`ripple-${pp.id}`}
              aria-hidden="true"
              className="tap-water-ripple"
              style={{ left: pp.x, top: pp.y } as React.CSSProperties}
            >
              <span className="tap-water-ring tap-water-ring-a" />
              <span className="tap-water-ring tap-water-ring-b" />
              <span className="tap-water-glint" />
            </div>
          ))}

          {/* Center Guide / Interactive Prompt */}
          <div className="pointer-events-none z-0 flex flex-col items-center justify-center opacity-45 group-hover:opacity-75 transition-opacity">
            <div className="h-10 w-10 rounded-full border border-primary/40 flex items-center justify-center mb-1.5 bg-primary/10 shadow-[0_0_12px_rgba(139,92,246,0.2)]">
              <Sparkles className="h-4 w-4 text-gold animate-pulse" />
            </div>
            <span className="text-[11px] font-mono tracking-widest uppercase text-muted-foreground">
              Tap anywhere in frame
            </span>
            <span className="num text-xs font-bold text-gain mt-0.5">+{money(value)} / tap</span>
          </div>

          {/* Upward Floating Small Coin animation till bursting and disappearing */}
          {pops.map((pp) => (
            <div
              key={pp.id}
              className="pointer-events-none absolute z-30"
              style={
                {
                  left: pp.x,
                  top: pp.y,
                  "--drift-x": `${pp.dx}px`,
                  "--drift-y": `${pp.dy}px`,
                  "--wave-x": `${pp.wave}px`,
                  "--rot-start": `${pp.rotStart}deg`,
                  "--rot-end": `${pp.rotEnd}deg`,
                  "--anim-scale": pp.scale,
                  "--anim-duration": `${pp.duration}ms`,
                } as React.CSSProperties
              }
            >
              {/* Floating Cash Text */}
              <div className="float-cash-text num font-bold text-xs sm:text-sm text-gain whitespace-nowrap drop-shadow-[0_0_8px_rgba(34,197,94,0.9)]">
                +{money(value)}
              </div>

              {/* Newly materialising coin: soft reveal, gentle settle, then the existing upward drift */}
              <div className="float-small-coin relative">
                <img
                  src="/assets/aistudio/file_000000001f808246b3f630ace71f936f_d89c4e38.png"
                  alt=""
                  className="h-7 w-7 sm:h-8 sm:w-8 object-contain drop-shadow-[0_0_10px_rgba(250,204,21,0.75)]"
                />
                <span className="coin-liquid-sheen absolute inset-0 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Merged Clicker Controls seamlessly integrated without separating barrier */}
      <div className="shrink-0 w-full pt-1 pb-0.5 text-left">
        <div className="flex items-center justify-between text-xs mb-1">
          {/* "Generating:" followed by small frame box containing per tap amount and Per tap text */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-foreground tracking-wide">Generating:</span>
            <div className="flex items-center gap-1 rounded-lg border border-primary/40 bg-card/70 px-2 py-0.5 shadow-sm">
              <span className="num text-xs sm:text-sm font-bold text-gain">+{money(value)}</span>
              <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
                Per tap
              </span>
            </div>
          </div>

          {/* Current Level */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-muted-foreground font-medium">Level</span>
            <span className="num font-bold text-primary-glow">
              {s.clicker.level}
              <span className="text-muted-foreground font-normal"> / {cap}</span>
            </span>
          </div>
        </div>

        {/* Progress bar component */}
        <Progress value={maxed ? 1 : shownCount / req} className="h-1.5" />

        {/* Remainder of elements: amount of taps left to reach next level and taps/sec */}
        <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>
            {maxed
              ? "MAX LEVEL"
              : `${Math.max(0, req - shownCount).toLocaleString()} taps left to reach level ${s.clicker.level + 1}`}
          </span>
          <span className="font-mono">{BALANCE.maxClicksPerSecond} taps/sec</span>
        </div>
      </div>
    </div>
  );
}

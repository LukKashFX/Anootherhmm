import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Briefcase, Crown, Gem, Rocket, ShieldCheck, Star } from "lucide-react";
import { useAct, useGame, useNow } from "@/hooks/use-game";
import { ACHIEVEMENTS } from "@/game/achievements";
import { COLLECTIBLE_BY_ID } from "@/game/collectibles";
import { levelReward, netWorth, xpForLevel } from "@/game/engine";
import { date, money } from "@/lib/format";
import { Card, GameImg, Loading, PageHeader, Pill, Progress, Row } from "@/components/game/ui";
import { art, getPlayerTier } from "@/components/game/art";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Private Profile — Capitalfortune" },
      { name: "description", content: "Your private profile, only visible to you." },
      { property: "og:title", content: "Private Profile — Capitalfortune" },
      { property: "og:description", content: "Your private profile, only visible to you." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

const AVATARS = {
  briefcase: Briefcase,
  crown: Crown,
  gem: Gem,
  rocket: Rocket,
  star: Star,
} as const;

function ProfilePage() {
  const { data } = useGame();
  const now = useNow(data?.offset ?? 0, 30_000);
  const { run, pending } = useAct();
  const [title, setTitle] = useState("");
  const [bio, setBio] = useState("");
  useEffect(() => {
    if (data) {
      setTitle(data.state.profile.title);
      setBio(data.state.profile.bio);
    }
  }, [data?.state.profile.title, data?.state.profile.bio]); // eslint-disable-line react-hooks/exhaustive-deps
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!auth.currentUser) return;
    if (auth.currentUser.email === "lukass16.ivanovs@gmail.com") {
      setIsAdmin(true);
      return;
    }
    getDoc(doc(db, "admins", auth.currentUser.uid))
      .then((snap) => setIsAdmin(snap.exists()))
      .catch(() => setIsAdmin(false));
  }, []);
  if (!data) return <Loading />;
  const s = data.state;
  const Av = AVATARS[s.profile.avatar as keyof typeof AVATARS] ?? Briefcase;
  const titles = [
    "Aspiring Tycoon",
    "Entrepreneur",
    ...(s.level >= 10 ? ["Mogul"] : []),
    ...(s.level >= 25 ? ["Magnate"] : []),
    ...(Object.keys(s.achievements).length >= 50 ? ["Achiever"] : []),
  ];
  const featured = s.profile.featured ? s.collectibles[s.profile.featured] : null;
  return (
    <div>
      <PageHeader
        title="Private Profile"
        subtitle={
          <span className="inline-flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-gain" />
            Only you can see this
          </span>
        }
      />
      <div className="scene-cover mb-4 h-28">
        <GameImg
          src={art("skyline")}
          fallbackKey="skyline"
          alt="Capitalfortune skyline"
          className="w-full h-full object-cover"
        />
      </div>
      <Card className="mb-4">
        <div className="flex items-center gap-4">
          {(() => {
            const tierInfo = getPlayerTier(s.level);
            return (
              <div className="relative shrink-0">
                <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl border-2 border-primary-glow/80 bg-gradient-to-b from-primary/20 via-surface/60 to-card/90 p-1 flex items-center justify-center shadow-[0_0_16px_rgba(139,92,246,0.45)]">
                  <img
                    src={tierInfo.badgePath}
                    alt={`${tierInfo.tierName} badge`}
                    className="h-full w-full object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]"
                  />
                </div>
                <Av className="absolute -bottom-1 -right-1 h-5 w-5 rounded-md bg-primary text-primary-foreground p-0.5 shadow-md border border-background" />
              </div>
            );
          })()}
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xl font-bold">
              {s.username}
              {isAdmin && <Pill tone="gold">Administrator</Pill>}
            </div>
            {(() => {
              const tierInfo = getPlayerTier(s.level);
              return (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-sm font-semibold text-primary">{s.profile.title}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 border border-primary/40 font-mono text-primary-glow">
                    {tierInfo.tierName} · {tierInfo.romanSublevel}
                  </span>
                </div>
              );
            })()}
            <div className="text-xs text-muted-foreground">Since {date(s.createdAt)}</div>
          </div>
        </div>
        <div className="mt-3 flex justify-between text-xs">
          <span>Level {s.level}</span>
          <span className="num">
            {Math.floor(s.xp)}/{xpForLevel(s.level)} XP
          </span>
        </div>
        <Progress value={s.xp / xpForLevel(s.level)} className="mt-1" />
        <div className="mt-1 text-[11px] text-muted-foreground">
          Next level reward: {money(levelReward(s.level + 1))}
        </div>
        {s.profile.bio && <p className="mt-3 text-sm text-muted-foreground">{s.profile.bio}</p>}
        {featured && (
          <div className="mt-3">
            <Pill tone="gold">Featured: {COLLECTIBLE_BY_ID[featured.itemId]?.name}</Pill>
          </div>
        )}
      </Card>
      <Card className="mb-4">
        <Row label="Net worth" value={money(netWorth(s, now).total)} />
        <Row label="Companies" value={Object.keys(s.companies).length} />
        <Row label="Properties" value={Object.keys(s.properties).length} />
        <Row label="Collectibles" value={Object.keys(s.collectibles).length} />
        <Row
          label="Achievements"
          value={`${Object.keys(s.achievements).length}/${ACHIEVEMENTS.length}`}
        />
        <Row label="Research completed" value={s.research.done.length} />
      </Card>
      <Card className="space-y-3">
        <div className="text-sm font-semibold">Customize</div>
        <div className="flex gap-2">
          {Object.entries(AVATARS).map(([k, I]) => (
            <Button
              variant="ghost"
              size="sm"
              key={k}
              aria-label={k}
              onClick={() => run({ type: "setProfile", avatar: k })}
              className={`flex h-11 w-11 items-center justify-center rounded-xl border ${s.profile.avatar === k ? "border-primary bg-primary/15" : "border-border"}`}
            >
              <I className="h-5 w-5" />
            </Button>
          ))}
        </div>
        <Select
          value={titles.includes(title) ? title : titles[0]}
          onValueChange={(v) => {
            setTitle(v);
            void run({ type: "setProfile", title: v }, "Title updated");
          }}
        >
          <SelectTrigger className="h-11">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {titles.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={s.profile.featured ?? "none"}
          onValueChange={(v) => run({ type: "setProfile", featured: v === "none" ? null : v })}
        >
          <SelectTrigger className="h-11">
            <SelectValue placeholder="Featured item" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No featured item</SelectItem>
            {Object.values(s.collectibles).map((o) => (
              <SelectItem key={o.inst} value={o.inst}>
                {COLLECTIBLE_BY_ID[o.itemId]?.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Textarea
          placeholder="Short description"
          value={bio}
          maxLength={280}
          onChange={(e) => setBio(e.target.value)}
        />
        <Button
          className="w-full"
          disabled={pending}
          onClick={() => run({ type: "setProfile", bio }, "Profile saved")}
        >
          Save description
        </Button>
        <UsernameEdit current={s.username} />
      </Card>
    </div>
  );
}

function UsernameEdit({ current }: { current: string }) {
  const { run, pending } = useAct();
  const [v, setV] = useState(current);
  return (
    <div className="flex gap-2">
      <Input value={v} onChange={(e) => setV(e.target.value)} maxLength={20} className="h-11" />
      <Button
        variant="secondary"
        className="h-11"
        disabled={pending || v === current}
        onClick={() => run({ type: "setProfile", username: v }, "Username changed")}
      >
        Rename
      </Button>
    </div>
  );
}

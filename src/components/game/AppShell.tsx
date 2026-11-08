import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { MenuContext } from "@/context/menu";
import {
  Award,
  BarChart3,
  Dices,
  Briefcase,
  Building2,
  Coins,
  FlaskConical,
  Maximize,
  Minimize,
  Gem,
  Home,
  LineChart,
  LogOut,
  User,
  Users,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGame, useAct } from "@/hooks/use-game";
import { logOut } from "@/lib/firebase";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loading } from "./ui";
import { OfflineReportDialog } from "./OfflineReport";

const NAV = [
  { to: "/realestate", label: "Assets", icon: Gem, also: ["/collectibles"] },
  { to: "/markets", label: "Trade-HUB", icon: LineChart },
  { to: "/home", label: "Tap", icon: Home, center: true },
  { to: "/empire", label: "Empire", icon: Building2 },
  { to: "/corporation", label: "Corp", icon: Briefcase },
] as const;

const MORE = [
  { to: "/leaderboard", label: "Online Leaderboard", icon: Trophy },
  { to: "/corporation", label: "Corporation", icon: Users },
  { to: "/casino", label: "Casino", icon: Dices },
  { to: "/research", label: "Research & Development", icon: FlaskConical },
  { to: "/achievements", label: "Achievements", icon: Award },
  { to: "/stats", label: "Statistics & Net Worth", icon: BarChart3 },
  { to: "/profile", label: "Private Profile & Settings", icon: User },
] as const;

export function AppShell() {
  const { data, isLoading, error, refetch } = useGame();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [menu, setMenu] = useState(false);
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await logOut();
    navigate({ to: "/auth", replace: true });
  }

  if (isLoading)
    return (
      <div className="min-h-screen">
        <Loading />
      </div>
    );
  if (error || !data)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Couldn't load your save: {error instanceof Error ? error.message : "unknown error"}
        </p>
        <Button onClick={() => refetch()}>Retry</Button>
      </div>
    );
  const s = data.state;

  return (
    <MenuContext.Provider value={{ openMenu: () => setMenu(true) }}>
      <div className="game-shell h-screen overflow-hidden flex flex-col bg-background text-foreground">
        <main className="game-content mx-auto w-full max-w-2xl flex-1 overflow-hidden px-3.5 pb-20 pt-2 flex flex-col min-h-0">
          <Outlet />
        </main>

        <nav className="game-nav fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur pb-safe">
          <div className="mx-auto grid max-w-2xl grid-cols-5">
            {NAV.map((n) => {
              const active =
                path.startsWith(n.to) || ("also" in n && n.also.some((a) => path.startsWith(a)));
              return "center" in n ? (
                <Link
                  key={n.to}
                  to={n.to}
                  aria-label="Clicker"
                  className="flex flex-col items-center justify-end pb-1.5"
                >
                  <span
                    className={cn(
                      "-mt-6 flex h-14 w-14 items-center justify-center rounded-xl border border-primary-glow bg-gradient-primary text-primary-foreground shadow-glow ring-4 ring-background",
                      !active && "opacity-85",
                    )}
                  >
                    <Coins className="h-7 w-7" />
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 text-[11px]",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {n.label}
                  </span>
                </Link>
              ) : (
                <Link
                  key={n.to}
                  to={n.to}
                  data-active={active}
                  className="game-nav-link flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground"
                >
                  <n.icon className="game-icon h-5 w-5" />
                  {n.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <Sheet open={menu} onOpenChange={setMenu}>
          <SheetContent side="right" className="w-[300px]">
            <SheetHeader>
              <SheetTitle className="brand-name">
                Capital<span>fortune</span>
              </SheetTitle>
              <div className="text-xs text-muted-foreground">
                {s.username || "Tycoon"} · Level {s.level}
              </div>
            </SheetHeader>
            <div className="mt-4 space-y-1">
              {MORE.map((m) => (
                <Link
                  key={m.to}
                  to={m.to}
                  onClick={() => setMenu(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm hover:bg-muted"
                >
                  <m.icon className="h-5 w-5 text-primary" />
                  {m.label}
                </Link>
              ))}
              <Link
                to="/collectibles"
                onClick={() => setMenu(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm hover:bg-muted"
              >
                <Gem className="h-5 w-5 text-primary" />
                Collectibles
              </Link>
              <FullscreenToggle />
              <Button
                variant="ghost"
                onClick={signOut}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-loss hover:bg-muted"
              >
                <LogOut className="h-5 w-5" />
                Sign out
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {!s.username && <UsernameDialog />}
        {s.username && s.lastOffline && <OfflineReportDialog report={s.lastOffline} />}
      </div>
    </MenuContext.Provider>
  );
}

function UsernameDialog() {
  const { run, pending } = useAct();
  const [name, setName] = useState("");
  return (
    <Dialog open>
      <DialogContent className="max-w-sm [&>button]:hidden">
        <DialogHeader>
          <DialogTitle>Choose your tycoon name</DialogTitle>
          <DialogDescription>
            You start with $0 and no assets. Tap the coin on Home to earn your first dollars.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void run({ type: "setProfile", username: name }, "Welcome, " + name);
          }}
          className="space-y-3"
        >
          <Input
            autoFocus
            placeholder="e.g. GoldenMogul"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={20}
            className="h-11"
          />
          <Button
            type="submit"
            disabled={pending || name.length < 3}
            className="h-11 w-full bg-gradient-primary"
          >
            Start my empire
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function FullscreenToggle() {
  const [supported, setSupported] = useState(false);
  const [on, setOn] = useState(false);
  useEffect(() => {
    setSupported(!!document.documentElement.requestFullscreen);
    const sync = () => setOn(!!document.fullscreenElement);
    sync();
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);
  if (!supported) return null;
  const toggle = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen().catch(() => {});
  };
  const Icon = on ? Minimize : Maximize;
  return (
    <Button
      variant="ghost"
      onClick={toggle}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm hover:bg-muted"
    >
      <Icon className="h-5 w-5 text-primary" />
      {on ? "Exit full screen" : "Full screen"}
    </Button>
  );
}

import { AppShell } from "@/components/AppShell";
import { Overlays } from "@/components/overlays/Overlays";
import { Toaster } from "@/components/ui/toast";
import { AppProvider, useApp } from "@/store/app-store";
import { FocusProvider, useFocus } from "@/store/focus-store";
import { UIProvider } from "@/store/ui-store";
import { SyncProvider } from "@/store/sync-store";
import { useRoute } from "@/lib/router";
import { TodayPage } from "@/features/today/TodayPage";
import { CalendarPage } from "@/features/today/CalendarPage";
import { MonthlyReviewPage } from "@/features/today/MonthlyReviewPage";
import { MomentsPage } from "@/features/today/MomentsPage";
import { JourneyTabPage } from "@/features/hobby/HobbiesPage";
import { HobbyDetailPage } from "@/features/hobby/HobbyDetailPage";
import { JourneyDetailPage } from "@/features/journey/JourneyDetailPage";
import { LedgerPage, type LedgerSection } from "@/features/ledger/LedgerPage";
import { AssetsPage, AssetDetailPage } from "@/features/assets/AssetsPage";
import { MePage } from "@/features/me/MePage";
import { Play } from "lucide-react";

function Routing() {
  const { segments } = useRoute();
  const [root, param] = segments;

  switch (root) {
    case undefined:
    case "":
    case "today":
      return <TodayPage />;
    case "journey":
      return param ? <JourneyDetailPage journeyId={param} /> : <JourneyTabPage segment="journeys" />;
    case "hobby":
      return param ? <HobbyDetailPage hobbyId={param} /> : <JourneyTabPage segment="hobbies" />;
    case "ledger": {
      const section: LedgerSection =
        param === "income" || param === "time" || param === "savings" || param === "investing"
          ? param
          : "savings";
      return <LedgerPage section={section} />;
    }
    case "assets":
      return param ? <AssetDetailPage assetId={param} /> : <AssetsPage />;
    case "me":
      return <MePage />;
    case "calendar":
      return <CalendarPage />;
    case "review":
      return <MonthlyReviewPage month={param ?? new Date().toISOString().slice(0, 7)} />;
    case "moments":
      return <MomentsPage />;
    default:
      return <TodayPage />;
  }
}

function RunningSessionPill() {
  const focus = useFocus();
  if (!focus.target || focus.sheetOpen || focus.pendingSummary) return null;

  const seconds = focus.plannedMinutes
    ? Math.max(0, focus.remainingSec ?? 0)
    : focus.elapsedSec;
  const label = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(
    2,
    "0",
  )}`;

  return (
    <button
      type="button"
      onClick={focus.openSheet}
      className="fixed left-4 z-40 flex items-center gap-2.5 rounded-full border border-border bg-popover/95 py-2 pl-2.5 pr-3.5 shadow-soft backdrop-blur transition-transform active:scale-[0.98]"
      style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 76px)" }}
    >
      <span className="grid size-7 place-items-center rounded-full bg-primary/12 text-primary">
        <Play className="size-3.5" />
      </span>
      <span className="text-left">
        <span className="block numeral text-[14px] font-medium leading-none text-foreground">{label}</span>
        <span className="mt-0.5 block text-[10.5px] leading-none text-muted-foreground">
          {focus.target.label}
          {focus.plannedMinutes ? "" : " · free"}
        </span>
      </span>
    </button>
  );
}

function Splash() {
  return (
    <div className="grid min-h-dvh place-items-center bg-background">
      <div className="text-center">
        <div className="text-[20px] font-semibold tracking-[-0.02em] text-foreground">人生账本</div>
        <div className="mt-2 animate-soft-pulse text-[12.5px] text-muted-foreground">
          正在打开你的记录…
        </div>
      </div>
    </div>
  );
}

function Shell() {
  const { ready } = useApp();
  if (!ready) return <Splash />;
  return (
    <>
      <AppShell>
        <Routing />
      </AppShell>
      <RunningSessionPill />
      <Overlays />
    </>
  );
}

export default function App() {
  return (
    <AppProvider>
      <UIProvider>
        <FocusProvider>
          <SyncProvider>
            <Shell />
            <Toaster />
          </SyncProvider>
        </FocusProvider>
      </UIProvider>
    </AppProvider>
  );
}

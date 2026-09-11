import type { ReactNode } from "react";
import { useRoute } from "@/lib/router";
import { BottomNav } from "./BottomNav";
import { SideNav } from "./SideNav";
import { QuickAddFab } from "./QuickAddFab";

export function AppShell({ children }: { children: ReactNode }) {
  const { segments } = useRoute();

  return (
    <div className="min-h-dvh bg-background">
      <div className="grain pointer-events-none fixed inset-0 opacity-60" aria-hidden />
      <div className="relative mx-auto flex w-full max-w-[1440px]">
        <SideNav current={segments} />
        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-[1120px] px-4 pb-[132px] pt-1 sm:px-6 lg:px-10 lg:pb-20 lg:pt-8">
            {children}
          </div>
        </main>
      </div>
      <QuickAddFab />
      <BottomNav current={segments} />
    </div>
  );
}

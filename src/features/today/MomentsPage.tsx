import { useMemo } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Card, EmptyState } from "@/components/ui/display";
import { PhotoThumb } from "@/components/PhotoGrid";
import { useApp } from "@/store/app-store";
import { useUI } from "@/store/ui-store";
import { recentPhotoEvents } from "@/lib/stats";
import { fmtMonthLong } from "@/lib/format";
import type { LifeEvent } from "@/lib/types";

export function MomentsPage() {
  const { data } = useApp();
  const { openModal } = useUI();
  const events = useMemo(() => recentPhotoEvents(data, 120), [data]);

  const groups = useMemo(() => {
    const map = new Map<string, LifeEvent[]>();
    for (const event of events) {
      const key = event.date.slice(0, 7);
      const bucket = map.get(key) ?? [];
      bucket.push(event);
      map.set(key, bucket);
    }
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [events]);

  return (
    <div className="animate-fade-up">
      <PageHeader back title="Life Moments" subtitle="所有记录里的照片，按月份排好" searchable={false} />

      {groups.length === 0 ? (
        <Card className="mt-2 px-2 py-2">
          <EmptyState
            icon={<span className="text-[20px]">📷</span>}
            title="还没有照片。"
            description="在 Session、资产或记录里添加照片，它们会出现在这里。"
          />
        </Card>
      ) : (
        <div className="space-y-8">
          {groups.map(([month, items]) => (
            <section key={month}>
              <h3 className="mb-3 text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {fmtMonthLong(`${month}-01`)}
              </h3>
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 lg:grid-cols-6">
                {items.flatMap((event) =>
                  event.photoIds.map((photoId) => (
                    <button
                      key={photoId}
                      type="button"
                      onClick={() => openModal("event", { initial: event })}
                      className="group relative aspect-square overflow-hidden rounded-md"
                    >
                      <PhotoThumb id={photoId} className="size-full" />
                      <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink/70 to-transparent px-2 pb-1.5 pt-5 text-left text-[10.5px] leading-tight text-white opacity-0 transition-opacity group-hover:opacity-100">
                        {event.title}
                      </span>
                    </button>
                  )),
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

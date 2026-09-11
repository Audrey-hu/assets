import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@radix-ui/react-dialog";
import { Search } from "lucide-react";
import { SheetBody, SheetContent, SheetHeader } from "@/components/ui/dialog";
import { Input } from "@/components/ui/form";
import { useApp } from "@/store/app-store";
import { useUI } from "@/store/ui-store";
import { navigate } from "@/lib/router";
import { searchAll } from "@/lib/stats";

const SUGGESTIONS = ["SQE", "架子鼓", "Contract", "资产", "定存", "摄影"];

export function SearchSheet() {
  const { modal, closeModal } = useUI();
  const open = modal === "search";
  const { data } = useApp();
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const results = useMemo(() => searchAll(data, query), [data, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, typeof results>();
    for (const item of results) {
      const bucket = map.get(item.kind) ?? [];
      bucket.push(item);
      map.set(item.kind, bucket);
    }
    return [...map.entries()];
  }, [results]);

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeModal()}>
      <SheetContent size="md" className="h-[80dvh] sm:h-auto">
        <SheetHeader title="Search" description="兴趣、项目、记录、资产、存款，都可以搜。" />
        <div className="px-5 pb-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              placeholder="搜索…"
              className="pl-9"
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
          {!query && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setQuery(item)}
                  className="rounded-full border border-border px-3 py-1 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>
        <SheetBody className="pb-6">
          {query && results.length === 0 && (
            <p className="py-8 text-center text-[13px] text-muted-foreground">
              没有找到「{query}」。换个词试试。
            </p>
          )}
          <div className="space-y-5">
            {grouped.map(([kind, items]) => (
              <section key={kind}>
                <h3 className="label-caps mb-2">{kind}</h3>
                <div className="row-divide overflow-hidden rounded-lg border border-border/70">
                  {items.map((item) => (
                    <button
                      key={`${item.kind}-${item.id}`}
                      type="button"
                      onClick={() => {
                        navigate(item.href);
                        closeModal();
                      }}
                      className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-secondary/50"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] text-foreground">{item.title}</span>
                        <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">
                          {item.date ? `${item.date} · ` : ""}
                          {item.subtitle}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </SheetBody>
      </SheetContent>
    </Dialog>
  );
}

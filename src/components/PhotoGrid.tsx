import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ImageIcon, ImagePlus, X } from "lucide-react";
import { usePhotoUrl } from "@/store/app-store";
import { cn } from "@/lib/utils";

export function PhotoThumb({
  id,
  className,
  onClick,
  rounded = "rounded-md",
}: {
  id: string;
  className?: string;
  onClick?: () => void;
  rounded?: string;
}) {
  const { url, missing } = usePhotoUrl(id);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative overflow-hidden border border-border/70 bg-secondary",
        rounded,
        className,
      )}
    >
      {url ? (
        <img src={url} alt="" loading="lazy" className="size-full object-cover" />
      ) : missing ? (
        <span className="grid size-full place-items-center bg-secondary text-muted-foreground/60">
          <ImageIcon className="size-4" strokeWidth={1.5} />
        </span>
      ) : (
        <span className="block size-full animate-soft-pulse bg-secondary" />
      )}
    </button>
  );
}

export function PhotoGrid({
  ids,
  className,
  columns = 3,
  onRemove,
  onAdd,
  max = 6,
  compact = false,
}: {
  ids: string[];
  className?: string;
  columns?: number;
  onRemove?: (id: string) => void;
  onAdd?: () => void;
  max?: number;
  compact?: boolean;
}) {
  const [viewer, setViewer] = useState<number | null>(null);
  if (!ids.length && !onAdd) return null;

  return (
    <>
      <div
        className={cn("grid gap-1.5", className)}
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {ids.map((id, index) => (
          <div key={id} className="group relative aspect-square">
            <PhotoThumb id={id} className="size-full" onClick={() => setViewer(index)} />
            {onRemove && (
              <button
                type="button"
                aria-label="删除照片"
                onClick={() => onRemove(id)}
                className="absolute right-1 top-1 grid size-6 place-items-center rounded-full bg-ink/60 text-white backdrop-blur transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        ))}
        {onAdd && ids.length < max && (
          <button
            type="button"
            onClick={onAdd}
            className={cn(
              "grid aspect-square place-items-center rounded-md border border-dashed border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary",
              compact && "gap-1 text-[11px]",
            )}
          >
            <ImagePlus className="mx-auto size-5" strokeWidth={1.6} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {viewer !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setViewer(null)}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/90 p-4"
          >
            <ViewerContent ids={ids} index={viewer} onChange={setViewer} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ViewerContent({
  ids,
  index,
  onChange,
}: {
  ids: string[];
  index: number;
  onChange: (index: number) => void;
}) {
  const { url } = usePhotoUrl(ids[index]);
  return (
    <motion.div
      initial={{ scale: 0.96, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.97, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="relative max-h-full w-full max-w-3xl"
      onClick={(event) => event.stopPropagation()}
    >
      {url && <img src={url} alt="" className="mx-auto max-h-[80dvh] w-auto rounded-lg object-contain" />}
      <div className="mt-4 flex items-center justify-center gap-2">
        {ids.map((id, i) => (
          <button
            key={id}
            type="button"
            aria-label={`第 ${i + 1} 张`}
            onClick={() => onChange(i)}
            className={cn(
              "size-1.5 rounded-full transition-colors",
              i === index ? "bg-white" : "bg-white/35",
            )}
          />
        ))}
      </div>
      <button
        type="button"
        aria-label="关闭"
        onClick={() => onChange(-1)}
        className="absolute -top-11 right-0 grid size-9 place-items-center rounded-full border border-white/20 text-white/80"
      >
        <X className="size-4" />
      </button>
    </motion.div>
  );
}

export function PhotoPickerInput({
  onFiles,
  children,
  className,
  remaining,
}: {
  onFiles: (files: File[]) => void;
  children: React.ReactNode;
  className?: string;
  remaining: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (inputRef.current) inputRef.current.value = "";
  }, [busy]);

  return (
    <>
      <button type="button" onClick={() => inputRef.current?.click()} className={className}>
        {children}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={async (event) => {
          const files = Array.from(event.target.files ?? []).slice(0, remaining);
          if (!files.length) return;
          setBusy(true);
          onFiles(files);
          setBusy(false);
        }}
      />
    </>
  );
}

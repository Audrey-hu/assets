import { useEffect, useState } from "react";
import { Dialog } from "@radix-ui/react-dialog";
import { SheetBody, SheetContent, SheetFooter, SheetHeader } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, Field, Input, Textarea } from "@/components/ui/form";
import { MoneyInput } from "./fields";
import { PhotoGrid, PhotoPickerInput } from "@/components/PhotoGrid";
import { ASSET_TYPE, ASSET_TYPE_ORDER } from "@/lib/labels";
import { todayISO } from "@/lib/format";
import { uid } from "@/lib/utils";
import { useApp } from "@/store/app-store";
import { useUI } from "@/store/ui-store";
import type { Asset, AssetType } from "@/lib/types";

export function AssetEditor() {
  const { modal, payload, closeModal, askConfirm } = useUI();
  const open = modal === "asset";
  const initial = (payload.initial ?? {}) as Partial<Asset>;
  const { data, saveAsset, deleteAsset, addPhotos, deletePhotos } = useApp();

  const [name, setName] = useState("");
  const [type, setType] = useState<AssetType>("skill");
  const [createdDate, setCreatedDate] = useState(todayISO());
  const [hours, setHours] = useState<number | undefined>();
  const [cost, setCost] = useState<number | undefined>();
  const [incomeGenerated, setIncomeGenerated] = useState<number | undefined>();
  const [sourceHobbyId, setSourceHobbyId] = useState("");
  const [sourceJourneyId, setSourceJourneyId] = useState("");
  const [link, setLink] = useState("");
  const [note, setNote] = useState("");
  const [photoIds, setPhotoIds] = useState<string[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(initial.name ?? "");
    setType(initial.type ?? "skill");
    setCreatedDate(initial.createdDate ?? todayISO());
    setHours(initial.minutes ? Math.round((initial.minutes / 60) * 10) / 10 : undefined);
    setCost(initial.cost);
    setIncomeGenerated(initial.incomeGenerated);
    setSourceHobbyId(initial.sourceHobbyId ?? "");
    setSourceJourneyId(initial.sourceJourneyId ?? "");
    setLink(initial.link ?? "");
    setNote(initial.note ?? "");
    setPhotoIds(initial.photoIds ?? []);
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSave() {
    if (!name.trim()) {
      setError("给这个资产起个名字。");
      return;
    }
    const now = new Date().toISOString();
    await saveAsset({
      id: initial.id ?? uid("ast"),
      name: name.trim(),
      type,
      createdDate,
      minutes: hours ? Math.round(hours * 60) : 0,
      cost: cost ?? 0,
      incomeGenerated: incomeGenerated ?? 0,
      sourceHobbyId: sourceHobbyId || undefined,
      sourceJourneyId: sourceJourneyId || undefined,
      sourceIncomeId: initial.sourceIncomeId,
      photoIds,
      link: link.trim() || undefined,
      note: note.trim() || undefined,
      createdAt: initial.createdAt ?? now,
      updatedAt: now,
    });
    closeModal();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && closeModal()}>
      <SheetContent>
        <SheetHeader
          title={initial.id ? "编辑资产" : "新增沉淀资产"}
          description="你投入的时间，最终会留下东西。"
        />
        <SheetBody className="space-y-4">
          <Field label="资产名称" error={error}>
            <Input
              autoFocus
              value={name}
              placeholder="例如：MakeChoice Website"
              onChange={(event) => setName(event.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="类型">
              <Select value={type} onChange={(event) => setType(event.target.value as AssetType)}>
                {ASSET_TYPE_ORDER.map((key) => (
                  <option key={key} value={key}>
                    {ASSET_TYPE[key]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="创建日期">
              <Input
                type="date"
                value={createdDate}
                onChange={(event) => setCreatedDate(event.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="投入小时">
              <Input
                inputMode="decimal"
                className="numeral"
                placeholder="16"
                value={hours ?? ""}
                onChange={(event) => {
                  const raw = event.target.value.replace(/[^\d.]/g, "");
                  setHours(raw === "" ? undefined : Number(raw));
                }}
              />
            </Field>
            <Field label="成本">
              <MoneyInput value={cost} onChange={setCost} />
            </Field>
            <Field label="带来收入">
              <MoneyInput value={incomeGenerated} onChange={setIncomeGenerated} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="来源兴趣" hint="可选">
              <Select
                value={sourceHobbyId}
                onChange={(event) => {
                  setSourceHobbyId(event.target.value);
                  if (event.target.value) setSourceJourneyId("");
                }}
              >
                <option value="">不关联</option>
                {data.hobbies.map((hobby) => (
                  <option key={hobby.id} value={hobby.id}>
                    {hobby.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="来源 Journey" hint="可选">
              <Select
                value={sourceJourneyId}
                onChange={(event) => {
                  setSourceJourneyId(event.target.value);
                  if (event.target.value) setSourceHobbyId("");
                }}
              >
                <option value="">不关联</option>
                {data.journeys.map((journey) => (
                  <option key={journey.id} value={journey.id}>
                    {journey.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="链接" hint="可选">
            <Input
              value={link}
              placeholder="https://"
              inputMode="url"
              onChange={(event) => setLink(event.target.value)}
            />
          </Field>
          <Field label="备注">
            <Textarea value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>
          <Field label="照片" hint={`最多 6 张 · ${photoIds.length}/6`}>
            <PhotoGrid
              ids={photoIds}
              onRemove={async (id) => {
                setPhotoIds((prev) => prev.filter((photoId) => photoId !== id));
                if (initial.id) await deletePhotos([id]);
              }}
              className="max-w-[260px]"
            />
            {photoIds.length < 6 && (
              <PhotoPickerInput
                remaining={6 - photoIds.length}
                onFiles={async (files) => {
                  const ids = await addPhotos(files);
                  setPhotoIds((prev) => [...prev, ...ids].slice(0, 6));
                }}
                className="mt-2 inline-flex h-9 items-center gap-2 rounded-md border border-dashed border-border px-3 text-[13px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                添加照片
              </PhotoPickerInput>
            )}
          </Field>
        </SheetBody>
        <SheetFooter className="flex items-center gap-2">
          {initial.id && (
            <Button
              variant="destructive"
              size="lg"
              onClick={() =>
                askConfirm({
                  title: "删除这个资产？",
                  description: "照片会一起删除。收入项目会保留，但不再关联。",
                  confirmLabel: "删除",
                  destructive: true,
                  onConfirm: async () => {
                    await deleteAsset(initial.id!);
                    closeModal();
                  },
                })
              }
            >
              删除
            </Button>
          )}
          <Button variant="ghost" size="lg" className="ml-auto" onClick={closeModal}>
            取消
          </Button>
          <Button size="lg" onClick={handleSave}>
            保存
          </Button>
        </SheetFooter>
      </SheetContent>
    </Dialog>
  );
}

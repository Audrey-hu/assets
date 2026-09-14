import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type ModalName =
  | "quickAdd"
  | "quickTime"
  | "search"
  | "focusSetup"
  | "event"
  | "hobby"
  | "journey"
  | "stage"
  | "course"
  | "income"
  | "asset"
  | "savings"
  | "investment"
  | "savingsTx";

export interface ConfirmRequest {
  title: string;
  description?: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}

interface UIContextValue {
  modal: ModalName | null;
  payload: Record<string, unknown>;
  openModal: (name: ModalName, payload?: Record<string, unknown>) => void;
  closeModal: () => void;

  confirm: ConfirmRequest | null;
  askConfirm: (request: ConfirmRequest) => void;
  closeConfirm: () => void;
}

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const [modal, setModal] = useState<ModalName | null>(null);
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const [confirm, setConfirm] = useState<ConfirmRequest | null>(null);

  const openModal = useCallback((name: ModalName, nextPayload: Record<string, unknown> = {}) => {
    setPayload(nextPayload);
    setModal(name);
  }, []);

  const closeModal = useCallback(() => {
    setModal(null);
    setPayload({});
  }, []);

  const value = useMemo<UIContextValue>(
    () => ({
      modal,
      payload,
      openModal,
      closeModal,
      confirm,
      askConfirm: (request) => setConfirm(request),
      closeConfirm: () => setConfirm(null),
    }),
    [modal, payload, openModal, closeModal, confirm],
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error("useUI must be used inside UIProvider");
  return ctx;
}

/* Convenience wrappers so call sites stay short and typed. */
export function useEditors() {
  const { openModal } = useUI();
  return useMemo(
    () => ({
      newEvent: (payload: Record<string, unknown> = {}) => openModal("event", payload),
      /** 不打计时器，直接补记一段时间 */
      logTime: (payload: Record<string, unknown> = {}) => openModal("quickTime", payload),
      newExpense: (payload: Record<string, unknown> = {}) =>
        openModal("event", { ...payload, lockType: "expense" }),
      newIncome: (payload: Record<string, unknown> = {}) =>
        openModal("event", { ...payload, lockType: "income" }),
      newMilestone: (payload: Record<string, unknown> = {}) =>
        openModal("event", { ...payload, lockType: "milestone" }),
      newNote: (payload: Record<string, unknown> = {}) =>
        openModal("event", { ...payload, lockType: "note" }),
      newHobby: (payload: Record<string, unknown> = {}) => openModal("hobby", payload),
      newJourney: (payload: Record<string, unknown> = {}) => openModal("journey", payload),
      newStage: (payload: Record<string, unknown> = {}) => openModal("stage", payload),
      newCourse: (payload: Record<string, unknown> = {}) => openModal("course", payload),
      newIncomeProject: (payload: Record<string, unknown> = {}) => openModal("income", payload),
      newAsset: (payload: Record<string, unknown> = {}) => openModal("asset", payload),
      newSavings: (payload: Record<string, unknown> = {}) => openModal("savings", payload),
      newInvestment: (payload: Record<string, unknown> = {}) => openModal("investment", payload),
      newSavingsTx: (payload: Record<string, unknown> = {}) => openModal("savingsTx", payload),
    }),
    [openModal],
  );
}

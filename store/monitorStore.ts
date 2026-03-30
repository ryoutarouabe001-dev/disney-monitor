import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  buildDisneyUrl,
  type ChildGuestInput,
  type HotelId,
} from "@/lib/urlBuilder";
import type { AvailabilitySignal } from "@/lib/checker";

export type CheckLogEntry = {
  id: string;
  monitorId: string;
  at: string;
  result: AvailabilitySignal;
};

export type Monitor = {
  id: string;
  hotelId: HotelId;
  checkIn: string;
  nights: number;
  guests: number;
  childGuests: number;
  childSlots: ChildGuestInput[];
  roomType?: string;
  notifyLine: boolean;
  notifyEmail: boolean;
  notifyEmailAddress?: string;
  enabled: boolean;
  bookingUrl: string;
  previousStatus: AvailabilitySignal | null;
  currentStatus: AvailabilitySignal | null;
  lastChecked: string | null;
  createdAt: string;
};

/** フォーム・API から渡す新規監視条件（checkIn は addMonitor 内で生成） */
export type AddMonitorInput = {
  hotelId: HotelId;
  checkInDate: Date;
  nights: number;
  guests: number;
  childGuests?: number;
  childSlots?: ChildGuestInput[];
  roomType?: string;
  notifyLine: boolean;
  notifyEmail: boolean;
  notifyEmailAddress?: string;
};

const FREE_MAX_MONITORS = 1;
const MIN_INTERVAL_MS = 60_000;
const PRO_INTERVAL_MS = 10_000;

type MonitorState = {
  monitors: Monitor[];
  logs: CheckLogEntry[];
  /** Free tier: false. Pro UI prepared; no payment yet. */
  isPro: boolean;
  checkIntervalMs: number;
  /**
   * "今すぐチェック要求" のためのカウンタ。
   * 追加直後に UI が即時でステータス反映されるように使う。
   * 永続化しない（サーバー/別タブで意味が変わるため）。
   */
  tickNonce: number;
  addMonitor: (input: AddMonitorInput) => { ok: true } | { ok: false; reason: string };
  updateMonitor: (id: string, patch: Partial<Monitor>) => void;
  removeMonitor: (id: string) => void;
  setStatuses: (
    id: string,
    patch: {
      previousStatus: AvailabilitySignal | null;
      currentStatus: AvailabilitySignal | null;
      lastChecked: string;
    }
  ) => void;
  pushLog: (entry: Omit<CheckLogEntry, "id">) => void;
  setPro: (v: boolean) => void;
  getIntervalMs: () => number;
  canAddMonitor: () => boolean;
  requestCheckNow: () => void;
};

function newId() {
  return crypto.randomUUID?.() ?? `m_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export const useMonitorStore = create<MonitorState>()(
  persist(
    (set, get) => ({
      monitors: [],
      logs: [],
      // リクエストに合わせて「Pro制限なし」で動かす（課金UIは残すが実機能は常時有効）
      isPro: true,
      checkIntervalMs: PRO_INTERVAL_MS,
      tickNonce: 0,

      getIntervalMs: () => {
        const { isPro } = get();
        return isPro ? PRO_INTERVAL_MS : MIN_INTERVAL_MS;
      },

      canAddMonitor: () => {
        return true;
      },

      addMonitor: (input: AddMonitorInput) => {
        const { canAddMonitor } = get();
        if (!canAddMonitor()) {
          return { ok: false, reason: "監視を追加できませんでした" };
        }
        const slots = (input.childSlots ?? []).slice(
          0,
          Math.min(Math.max(input.childGuests ?? 0, 0), 4)
        );
        const bookingUrl = buildDisneyUrl({
          hotelId: input.hotelId,
          date: input.checkInDate,
          nights: input.nights,
          guests: input.guests,
          childGuests: input.childGuests ?? 0,
          childSlots: slots,
          roomType: input.roomType,
        });

        const monitor: Monitor = {
          id: newId(),
          hotelId: input.hotelId,
          checkIn: input.checkInDate.toISOString(),
          nights: input.nights,
          guests: input.guests,
          childGuests: input.childGuests ?? 0,
          childSlots: slots,
          roomType: input.roomType,
          notifyLine: input.notifyLine,
          notifyEmail: input.notifyEmail,
          notifyEmailAddress: input.notifyEmailAddress,
          enabled: true,
          bookingUrl,
          previousStatus: null,
          currentStatus: null,
          lastChecked: null,
          createdAt: new Date().toISOString(),
        };

        set((s) => ({
          monitors: [monitor, ...s.monitors],
          tickNonce: Date.now(),
        }));
        return { ok: true };
      },

      updateMonitor: (id, patch) =>
        set((s) => ({
          monitors: s.monitors.map((m) =>
            m.id === id ? { ...m, ...patch } : m
          ),
        })),

      removeMonitor: (id) =>
        set((s) => ({
          monitors: s.monitors.filter((m) => m.id !== id),
        })),

      setStatuses: (id, patch) =>
        set((s) => ({
          monitors: s.monitors.map((m) =>
            m.id === id
              ? {
                  ...m,
                  previousStatus: patch.previousStatus,
                  currentStatus: patch.currentStatus,
                  lastChecked: patch.lastChecked,
                }
              : m
          ),
        })),

      pushLog: (entry) =>
        set((s) => {
          const row: CheckLogEntry = { ...entry, id: newId() };
          const logs = [row, ...s.logs].slice(0, 10);
          return { logs };
        }),

      setPro: (v) => set({ isPro: v }),
      requestCheckNow: () => set({ tickNonce: Date.now() }),
    }),
    {
      name: "magic-vacancy-monitors",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        monitors: s.monitors,
        logs: s.logs,
        isPro: s.isPro,
      }),
      version: 3,
      migrate: (persistedState: any, fromVersion?: number) => {
        const v = typeof fromVersion === "number" ? fromVersion : 0;
        const next = {
          ...persistedState,
          isPro: true,
        };
        if (v < 3 && Array.isArray(next.monitors)) {
          next.monitors = next.monitors.map((m: any) => {
            if (Array.isArray(m.childSlots)) return m;
            const n = Math.min(Math.max(m.childGuests ?? 0, 0), 4);
            const ages: number[] = Array.isArray(m.childAges) ? m.childAges : [];
            const childSlots: ChildGuestInput[] = ages.slice(0, n).map((ageYears: number) => ({
              ageYears,
              sixTrack: ageYears === 6 ? ("preschool" as const) : undefined,
              bedKey: "defaultExample" as const,
            }));
            const { childAges: _omit, ...rest } = m;
            return { ...rest, childSlots };
          });
        }
        return next;
      },
    }
  )
);

export { MIN_INTERVAL_MS, PRO_INTERVAL_MS, FREE_MAX_MONITORS };

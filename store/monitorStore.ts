import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  buildDisneyUrl,
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
  childAges: number[];
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
  childAges?: number[];
  roomType?: string;
  notifyLine: boolean;
  notifyEmail: boolean;
  notifyEmailAddress?: string;
};

const FREE_MAX_MONITORS = 1;
const MIN_INTERVAL_MS = 60_000;

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
      isPro: false,
      checkIntervalMs: MIN_INTERVAL_MS,
      tickNonce: 0,

      getIntervalMs: () => {
        const { isPro } = get();
        return isPro ? 10_000 : MIN_INTERVAL_MS;
      },

      canAddMonitor: () => {
        const { monitors, isPro } = get();
        if (isPro) return true;
        return monitors.length < FREE_MAX_MONITORS;
      },

      addMonitor: (input: AddMonitorInput) => {
        const { canAddMonitor } = get();
        if (!canAddMonitor()) {
          return {
            ok: false,
            reason: "無料プランは1件までです。Proで無制限にできます。",
          };
        }
        const bookingUrl = buildDisneyUrl({
          hotelId: input.hotelId,
          date: input.checkInDate,
          nights: input.nights,
          guests: input.guests,
          childGuests: input.childGuests ?? 0,
          childAges: input.childAges ?? [],
          roomType: input.roomType,
        });

        const monitor: Monitor = {
          id: newId(),
          hotelId: input.hotelId,
          checkIn: input.checkInDate.toISOString(),
          nights: input.nights,
          guests: input.guests,
          childGuests: input.childGuests ?? 0,
          childAges: (input.childAges ?? []).slice(
            0,
            Math.min(Math.max(input.childGuests ?? 0, 0), 4)
          ),
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
    }
  )
);

export { MIN_INTERVAL_MS, FREE_MAX_MONITORS };

export type BrowserAlertPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  sound?: boolean;
};

let audioUnlocked = false;
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as
    | typeof AudioContext
    | undefined;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  return audioCtx;
}

export async function unlockAudio(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;
  try {
    if (ctx.state === "suspended") await ctx.resume();
    // unlock のための無音ブリップ
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    g.gain.value = 0.0001;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.02);
    audioUnlocked = true;
    return true;
  } catch {
    return false;
  }
}

export async function playBeep(): Promise<boolean> {
  const ctx = getAudioContext();
  if (!ctx) return false;
  try {
    if (ctx.state === "suspended") {
      // ユーザー操作なしでは resume できないことがある
      if (!audioUnlocked) return false;
      await ctx.resume();
    }
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.value = 0.06;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.18);
    return true;
  } catch {
    return false;
  }
}

export async function requestBrowserNotificationPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    const p = await Notification.requestPermission();
    return p;
  } catch {
    return Notification.permission;
  }
}

export async function sendBrowserAlert(
  payload: BrowserAlertPayload
): Promise<{ notified: boolean; sounded: boolean; permission: NotificationPermission | "unsupported" }> {
  try {
    const permission = await requestBrowserNotificationPermission();
    let notified = false;
    let sounded = false;

    if (permission === "granted") {
      try {
        const n = new Notification(payload.title, {
          body: payload.body,
          tag: payload.tag,
        });
        if (payload.url) {
          n.onclick = () => {
            try {
              window.open(payload.url, "_blank", "noopener,noreferrer");
            } catch {
              /* ignore */
            }
          };
        }
        notified = true;
      } catch {
        notified = false;
      }
    }

    if (payload.sound) {
      sounded = await playBeep();
    }

    return { notified, sounded, permission };
  } catch {
    return { notified: false, sounded: false, permission: "unsupported" };
  }
}


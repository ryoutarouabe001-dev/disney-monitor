export type NotifyPayload = {
  bookingUrl: string;
  summary: string;
  methods: {
    line: boolean;
    email: boolean;
  };
  /** Optional recipient when email channel is on */
  emailTo?: string;
};

export async function requestNotify(payload: NotifyPayload): Promise<{
  ok: boolean;
  line?: boolean;
  email?: boolean;
  error?: string;
  warning?: string;
}> {
  const res = await fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  let data: Record<string, unknown> = {};
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    return {
      ok: false,
      error: typeof data.error === "string" ? data.error : "通知に失敗しました",
    };
  }
  return {
    ok: true,
    line: Boolean(data.line),
    email: Boolean(data.email),
    warning:
      typeof data.warning === "string" ? data.warning : undefined,
  };
}

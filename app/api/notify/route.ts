import { NextResponse } from "next/server";
import nodemailer from "nodemailer";

export const runtime = "nodejs";

type Body = {
  bookingUrl?: string;
  summary?: string;
  methods?: { line?: boolean; email?: boolean };
  emailTo?: string;
};

async function sendLine(message: string, token: string) {
  const body = new URLSearchParams({ message });
  const res = await fetch("https://notify-api.line.me/api/notify", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  return res.ok;
}

async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  url: string;
}) {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) return false;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  await transporter.sendMail({
    from: user,
    to: opts.to,
    subject: opts.subject,
    text: `${opts.text}\n\n${opts.url}`,
  });
  return true;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const bookingUrl = body.bookingUrl?.trim();
  if (!bookingUrl) {
    return NextResponse.json({ error: "bookingUrl required" }, { status: 400 });
  }

  const lineToken = process.env.LINE_NOTIFY_TOKEN?.trim();
  const userWantsLine = Boolean(body.methods?.line);
  const userWantsEmail = Boolean(body.methods?.email);

  if (userWantsEmail && !body.emailTo?.trim()) {
    return NextResponse.json(
      { error: "メール通知ONのときは emailTo が必要です" },
      { status: 400 }
    );
  }

  if (!userWantsLine && !userWantsEmail) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      line: false,
      email: false,
    });
  }

  const wantLine = userWantsLine && Boolean(lineToken);
  const wantEmail = userWantsEmail;

  const message = [
    "空きが出ました！今すぐ予約👇",
    "",
    body.summary ?? "",
    bookingUrl,
  ]
    .filter(Boolean)
    .join("\n");

  let lineOk = false;
  let emailOk = false;

  if (wantLine && lineToken) {
    try {
      lineOk = await sendLine(message, lineToken);
    } catch {
      lineOk = false;
    }
  }

  if (wantEmail && body.emailTo?.trim()) {
    try {
      emailOk = await sendEmail({
        to: body.emailTo.trim(),
        subject: "【Magic Vacancy】ディズニーホテルに空室が出ました",
        text: "空きが出ました。以下から予約ページを開いてください。",
        url: bookingUrl,
      });
    } catch {
      emailOk = false;
    }
  }

  if (userWantsLine && !lineToken) {
    if (emailOk) {
      return NextResponse.json({
        ok: true,
        line: false,
        email: true,
        warning:
          "LINE通知はサーバー未設定のためスキップ。メールは送信しました。",
      });
    }
    if (!userWantsEmail) {
      return NextResponse.json(
        {
          error:
            "LINE通知が選択されていますが、サーバーにLINE_NOTIFY_TOKENが設定されていません。",
          line: false,
          email: false,
        },
        { status: 503 }
      );
    }
  }

  const lineAttempted = userWantsLine && Boolean(lineToken);
  const emailAttempted = userWantsEmail && Boolean(body.emailTo?.trim());

  const anySuccess =
    (lineAttempted && lineOk) || (emailAttempted && emailOk);

  if (!anySuccess && (lineAttempted || emailAttempted)) {
    return NextResponse.json(
      {
        error:
          "通知の送信に失敗しました。LINEトークンまたはメール設定（EMAIL_USER / EMAIL_PASS）をご確認ください。",
        line: lineOk,
        email: emailOk,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true, line: lineOk, email: emailOk });
}

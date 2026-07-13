import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  OBIRA_CHAN_SYSTEM_PROMPT,
  localReply,
  type ChatMessage,
} from "@/lib/obira-chan";

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(2000),
      })
    )
    .min(1)
    .max(30),
});

// 直近のやりとりだけ送ってトークンを節約する
const HISTORY_LIMIT = 12;

// 公開APIのため、IPごとの簡易レート制限（サーバレスではインスタンス単位のベストエフォート）
const RATE_LIMIT = 10; // 回 / 窓
const RATE_WINDOW_MS = 60_000;
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  bucket.count += 1;
  return bucket.count > RATE_LIMIT;
}

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json(
      {
        reply:
          "ちょ、ちょっと待って！話しかけられすぎてヒレが追いつかないよ🐟 1分くらい休ませてね。",
        source: "local",
      },
      { status: 429 }
    );
  }

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "メッセージの形式が正しくありません。" },
      { status: 400 }
    );
  }

  const messages: ChatMessage[] = parsed.data.messages.slice(-HISTORY_LIMIT);
  const lastUserMessage =
    [...messages].reverse().find((m) => m.role === "user")?.content ?? "";

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic();
      const response = await client.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 1024,
        system: OBIRA_CHAN_SYSTEM_PROMPT,
        messages,
      });

      const reply = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("");

      if (reply) {
        return NextResponse.json({ reply, source: "ai" });
      }
    } catch (e) {
      // API障害時はローカル応答にフォールバック（チャットを止めない）
      console.error("obira-chan: Claude API error", e);
    }
  }

  return NextResponse.json({
    reply: localReply(lastUserMessage),
    source: "local",
  });
}

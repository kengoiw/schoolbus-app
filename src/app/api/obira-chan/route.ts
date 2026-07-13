import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-guard";
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

export async function POST(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

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

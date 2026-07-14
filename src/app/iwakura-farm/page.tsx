"use client";

import { useEffect, useRef, useState } from "react";
import { BOT_GREETING, BOT_NAME, BOT_TAGLINE, type ChatMessage } from "@/lib/iwakura-farm";

const SUGGESTIONS = [
  "何を栽培していますか？",
  "トルコギキョウについて教えて",
  "アイボリーメロンって何？",
  "小平町の農業について教えて",
  "お米ができるまでを子ども向けに教えて",
];

export default function IwakuraFarmPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [rateLimited, setRateLimited] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setRateLimited(false);

    try {
      const res = await fetch("/api/iwakura-farm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json();

      if (res.status === 429) {
        setRateLimited(true);
      }

      const reply: string = res.ok && data.reply
        ? data.reply
        : "うまく返事ができませんでした。もう一度試してみてください。";
      setMessages([...nextMessages, { role: "assistant", content: reply }]);
    } catch {
      setMessages([
        ...nextMessages,
        { role: "assistant", content: "通信の調子が悪いようです。少し待ってからもう一度お試しください。" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* プロフィールカード */}
      <div className="bg-white rounded-xl border border-green-100 p-4 flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-2xl shrink-0">
          🌾
        </div>
        <div>
          <p className="font-bold text-gray-900">{BOT_NAME}</p>
          <p className="text-xs text-gray-500">{BOT_TAGLINE}</p>
          <p className="text-[11px] text-amber-600 mt-1">
            ※AIによる案内です。在庫・価格・注文などは正式な窓口へご確認ください。
          </p>
        </div>
      </div>

      {/* 個人情報の注意書き */}
      <p className="text-[11px] text-gray-500 px-1">
        氏名、住所、電話番号などの個人情報は入力しないでください。
      </p>

      {/* チャット欄 */}
      <div className="flex flex-col gap-2">
        <ChatBubble role="assistant" content={BOT_GREETING} />
        {messages.map((m, i) => (
          <ChatBubble key={i} role={m.role} content={m.content} />
        ))}
        {loading && (
          <ChatBubble role="assistant" content="（考え中…）" />
        )}
        {rateLimited && (
          <div className="alert-warning text-center">1分ほど待ってからお試しください。</div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* サジェスト */}
      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className="text-xs bg-white border border-green-200 text-green-700 rounded-full px-3 py-1.5 hover:bg-green-100 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* 入力欄 */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-0 bg-green-50 pt-1 pb-3 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="岩倉農場について聞いてみる…"
          maxLength={500}
          className="flex-1 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <button
          type="submit"
          disabled={loading || input.trim() === ""}
          className="rounded-full bg-green-700 text-white text-sm px-4 py-2 disabled:opacity-40 hover:bg-green-800 transition-colors"
        >
          送信
        </button>
      </form>
    </div>
  );
}

function ChatBubble({ role, content }: ChatMessage) {
  const isBot = role === "assistant";
  return (
    <div className={`flex ${isBot ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words ${
          isBot
            ? "bg-white border border-green-100 text-gray-800 rounded-bl-sm"
            : "bg-green-700 text-white rounded-br-sm"
        }`}
      >
        {isBot && <span className="mr-1">🌾</span>}
        {content}
      </div>
    </div>
  );
}

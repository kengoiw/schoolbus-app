"use client";

import { useEffect, useRef, useState } from "react";
import { BOT_GREETING, BOT_NAME, BOT_TAGLINE, type ChatMessage } from "@/lib/obira-chan";

const SUGGESTIONS = [
  "小平町のおすすめ教えて！",
  "ニシンって何？",
  "おいしいものある？",
  "おびらちゃんって公式なの？",
];

export default function ObiraChanPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
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

    try {
      const res = await fetch("/api/obira-chan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });
      const data = await res.json();
      const reply: string = res.ok && data.reply
        ? data.reply
        : "ごめんね、波が高くて返事が流されちゃった🌊 もう一回試してみて！";
      setMessages([...nextMessages, { role: "assistant", content: reply }]);
    } catch {
      setMessages([
        ...nextMessages,
        { role: "assistant", content: "海底ケーブルの調子が悪いみたい…🐟 少し待ってからもう一回話しかけてね。" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* プロフィールカード */}
      <div className="bg-white rounded-xl border border-sky-100 p-4 flex items-start gap-3">
        <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center text-2xl shrink-0">
          🐟
        </div>
        <div>
          <p className="font-bold text-gray-900">{BOT_NAME}</p>
          <p className="text-xs text-gray-500">{BOT_TAGLINE}</p>
          <p className="text-[11px] text-amber-600 mt-1">
            ※非公式ボットです。正式な情報は町役場・学校の案内をご確認ください。
          </p>
        </div>
      </div>

      {/* チャット欄 */}
      <div className="flex flex-col gap-2">
        <ChatBubble role="assistant" content={BOT_GREETING} />
        {messages.map((m, i) => (
          <ChatBubble key={i} role={m.role} content={m.content} />
        ))}
        {loading && (
          <ChatBubble role="assistant" content="（おびらちゃんが考え中…🫧）" />
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
              className="text-xs bg-white border border-sky-200 text-sky-700 rounded-full px-3 py-1.5 hover:bg-sky-100 transition-colors"
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
        className="sticky bottom-0 bg-sky-50 pt-1 pb-3 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="おびらちゃんに話しかける…"
          maxLength={500}
          className="flex-1 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-400"
        />
        <button
          type="submit"
          disabled={loading || input.trim() === ""}
          className="rounded-full bg-sky-600 text-white text-sm px-4 py-2 disabled:opacity-40 hover:bg-sky-700 transition-colors"
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
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap ${
          isBot
            ? "bg-white border border-sky-100 text-gray-800 rounded-bl-sm"
            : "bg-sky-600 text-white rounded-br-sm"
        }`}
      >
        {isBot && <span className="mr-1">🐟</span>}
        {content}
      </div>
    </div>
  );
}

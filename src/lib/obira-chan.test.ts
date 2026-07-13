import { describe, it, expect } from "vitest";
import { localReply, BOT_GREETING, OBIRA_CHAN_SYSTEM_PROMPT } from "./obira-chan";

describe("localReply", () => {
  it("あいさつに反応する", () => {
    const reply = localReply("こんにちは！", () => 0);
    expect(reply).toContain("おびらちゃん");
  });

  it("バスの質問にはアプリ準備中の案内を返す", () => {
    const reply = localReply("バスを欠席したいときはどうすればいい？");
    expect(reply).toMatch(/準備中/);
    expect(reply).toMatch(/学校/);
  });

  it("ニシンの話題に食いつく", () => {
    const reply = localReply("ニシンって美味しいの？");
    expect(reply).toMatch(/ニシン|番屋/);
  });

  it("読み方ネタ（おびら/こだいら）に反応する", () => {
    const reply = localReply("小平町ってなんて読むの？");
    expect(reply).toContain("おびら");
  });

  it("知らない話題はフォールバックで正直に答える", () => {
    const reply = localReply("量子コンピュータの誤り訂正について教えて");
    expect(reply).toMatch(/わからない|ヒレに余る|ニシンにも及ばず/);
  });

  it("空文字にも安全に応答する", () => {
    const reply = localReply("   ");
    expect(reply.length).toBeGreaterThan(0);
  });

  it("乱数を注入すると応答が決定的になる", () => {
    const first = localReply("こんにちは", () => 0);
    const again = localReply("こんにちは", () => 0);
    expect(first).toBe(again);
    const last = localReply("こんにちは", () => 0.999);
    expect(last).not.toBe(first);
  });
});

describe("キャラクター設定", () => {
  it("あいさつ文とシステムプロンプトが非公式であることを明示する", () => {
    expect(BOT_GREETING).toContain("非公式");
    expect(OBIRA_CHAN_SYSTEM_PROMPT).toContain("非公式");
  });

  it("システムプロンプトがバスアプリ準備中であることを含む", () => {
    expect(OBIRA_CHAN_SYSTEM_PROMPT).toContain("準備中");
  });
});

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewObservationPointPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [memo, setMemo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/observation-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, memo: memo || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error ?? "登録に失敗しました。");
        return;
      }
      router.push(`/observations/${data.id}`);
    } catch {
      setErrorMessage("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">観測地点を追加</h1>

      <form onSubmit={handleSubmit} className="card card-body space-y-4">
        {errorMessage && <div className="alert-error">{errorMessage}</div>}

        <div>
          <label className="form-label" htmlFor="name">
            地点名
          </label>
          <input
            id="name"
            className="form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：北圃場A・ビニールハウス1号"
            maxLength={100}
            required
          />
        </div>

        <div>
          <label className="form-label" htmlFor="memo">
            メモ（任意）
          </label>
          <textarea
            id="memo"
            className="form-input"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="作物の種類、栽培開始日など"
            maxLength={500}
            rows={3}
          />
        </div>

        <button type="submit" className="btn-primary w-full" disabled={submitting || !name.trim()}>
          {submitting ? "登録中…" : "登録する"}
        </button>
      </form>
    </div>
  );
}

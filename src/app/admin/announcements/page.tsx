"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1, "タイトルを入力してください").max(100),
  body: z.string().min(1, "本文を入力してください").max(2000),
  targetRole: z.enum(["all", "guardian", "admin", "driver"]),
  publishFrom: z.string().min(1, "公開開始日時を設定してください"),
  publishTo: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Announcement {
  id: string;
  title: string;
  targetRole: string;
  publishFrom: string;
  publishTo?: string;
  createdAt: string;
}

const roleLabel: Record<string, string> = {
  all: "全員", guardian: "保護者", admin: "管理者", driver: "ドライバー",
};

export default function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const now = new Date();
  const nowStr = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      targetRole: "guardian",
      publishFrom: nowStr,
    },
  });

  const fetchAnnouncements = async () => {
    try {
      const res = await fetch("/api/announcements?limit=50");
      if (res.ok) {
        const data = await res.json();
        setAnnouncements(data);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => { fetchAnnouncements(); }, []);

  const onSubmit = async (data: FormData) => {
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          publishFrom: new Date(data.publishFrom).toISOString(),
          publishTo: data.publishTo ? new Date(data.publishTo).toISOString() : null,
        }),
      });
      const result = await res.json();
      if (res.ok) {
        setMsg({ type: "ok", text: "お知らせを作成しました" });
        reset({ targetRole: "guardian", publishFrom: nowStr });
        setShowForm(false);
        fetchAnnouncements();
      } else {
        setMsg({ type: "err", text: result.error ?? "作成に失敗しました" });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("このお知らせを削除しますか？")) return;
    try {
      const res = await fetch(`/api/admin/announcements/${id}`, { method: "DELETE" });
      if (res.ok) {
        setAnnouncements((prev) => prev.filter((a) => a.id !== id));
        setMsg({ type: "ok", text: "削除しました" });
      } else {
        setMsg({ type: "err", text: "削除に失敗しました" });
      }
    } catch { setMsg({ type: "err", text: "通信エラーが発生しました" }); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">お知らせ管理</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          {showForm ? "× キャンセル" : "＋ 新しいお知らせ"}
        </button>
      </div>

      {msg && (
        <div className={`rounded-lg px-4 py-2 text-sm ${msg.type === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {msg.type === "ok" ? "✅" : "❌"} {msg.text}
        </div>
      )}

      {/* 作成フォーム */}
      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="card card-body space-y-4">
          <h2 className="font-semibold text-gray-700">新規お知らせ作成</h2>
          <div>
            <label className="form-label">タイトル <span className="text-red-500">*</span></label>
            <input type="text" className="form-input" placeholder="例: 4月の運行スケジュールについて" {...register("title")} />
            {errors.title && <p className="form-error">{errors.title.message}</p>}
          </div>
          <div>
            <label className="form-label">本文 <span className="text-red-500">*</span></label>
            <textarea className="form-input" rows={6} placeholder="お知らせ内容を入力してください" {...register("body")} />
            {errors.body && <p className="form-error">{errors.body.message}</p>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="form-label">対象ロール</label>
              <select className="form-input" {...register("targetRole")}>
                {Object.entries(roleLabel).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">公開開始日時 <span className="text-red-500">*</span></label>
              <input type="datetime-local" className="form-input" {...register("publishFrom")} />
              {errors.publishFrom && <p className="form-error">{errors.publishFrom.message}</p>}
            </div>
            <div>
              <label className="form-label">公開終了日時（任意）</label>
              <input type="datetime-local" className="form-input" {...register("publishTo")} />
            </div>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? "作成中..." : "📢 お知らせを作成する"}
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
              キャンセル
            </button>
          </div>
        </form>
      )}

      {/* 一覧 */}
      <div className="card">
        {announcements.length === 0 ? (
          <div className="p-8 text-center text-gray-500">お知らせがありません。</div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>タイトル</th>
                  <th>対象</th>
                  <th>公開期間</th>
                  <th>作成日</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {announcements.map((a) => {
                  const now = new Date();
                  const from = new Date(a.publishFrom);
                  const to = a.publishTo ? new Date(a.publishTo) : null;
                  const isActive = from <= now && (!to || to >= now);
                  return (
                    <tr key={a.id}>
                      <td>
                        <div className="font-medium flex items-center gap-2">
                          {isActive && <span className="inline-block w-2 h-2 rounded-full bg-green-500" title="公開中" />}
                          {a.title}
                        </div>
                      </td>
                      <td>
                        <span className="badge-default">{roleLabel[a.targetRole]}</span>
                      </td>
                      <td className="text-xs text-gray-600">
                        {new Date(a.publishFrom).toLocaleDateString("ja-JP")}
                        {a.publishTo && ` 〜 ${new Date(a.publishTo).toLocaleDateString("ja-JP")}`}
                      </td>
                      <td className="text-xs text-gray-500">
                        {new Date(a.createdAt).toLocaleDateString("ja-JP")}
                      </td>
                      <td>
                        <button
                          onClick={() => handleDelete(a.id)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          削除
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

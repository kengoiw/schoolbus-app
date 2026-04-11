"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  childId: z.string().min(1, "児童を選択してください"),
  date: z.string().min(1, "日付を選択してください"),
  attendanceStatus: z.enum(["attend", "absent"]),
  morningUseType: z.enum(["default", "use", "not_use"]),
  eveningUseType: z.enum(["default", "use", "not_use"]),
  note: z.string().max(500).optional(),
  callerName: z.string().max(100).optional(),
  overrideExisting: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

interface Child {
  id: string;
  name: string;
  kana: string;
  grade: number;
  className: string;
  school: { id: string; name: string };
}

interface ExistingContact {
  id: string;
  attendanceStatus: string;
  morningUseType: string;
  eveningUseType: string;
  note?: string;
  version: number;
  source: string;
  submittedBy?: { name: string };
  submittedAt: string;
}

function PhoneEntryFormInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const preChildId = searchParams.get("childId") ?? "";
  const preDate = searchParams.get("date") ?? new Date().toISOString().split("T")[0];

  const [children, setChildren] = useState<Child[]>([]);
  const [existingContact, setExistingContact] = useState<ExistingContact | null>(null);
  const [overrideWarning, setOverrideWarning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      childId: preChildId,
      date: preDate,
      attendanceStatus: "attend",
      morningUseType: "default",
      eveningUseType: "default",
      overrideExisting: false,
    },
  });

  const selectedChildId = watch("childId");
  const selectedDate = watch("date");
  const attendanceStatus = watch("attendanceStatus");

  // 欠席時はバス不要に自動設定
  useEffect(() => {
    if (attendanceStatus === "absent") {
      setValue("morningUseType", "not_use");
      setValue("eveningUseType", "not_use");
    }
  }, [attendanceStatus, setValue]);

  // 全児童リストを取得
  useEffect(() => {
    fetch("/api/admin/children")
      .then((r) => r.json())
      .then((data) => setChildren(data))
      .catch(() => {});
  }, []);

  // 既存連絡を確認
  const checkExisting = useCallback(async () => {
    if (!selectedChildId || !selectedDate) return;
    try {
      const res = await fetch(
        `/api/admin/daily-contacts?childId=${selectedChildId}&date=${selectedDate}&exact=true`
      );
      if (res.ok) {
        const data = await res.json();
        const existing = data.contacts?.[0] ?? null;
        setExistingContact(existing);
        setOverrideWarning(!!existing);
        if (existing) {
          // 既存値を初期値に設定
          reset({
            childId: selectedChildId,
            date: selectedDate,
            attendanceStatus: existing.attendanceStatus as "attend" | "absent",
            morningUseType: existing.morningUseType as "default" | "use" | "not_use",
            eveningUseType: existing.eveningUseType as "default" | "use" | "not_use",
            note: existing.note ?? "",
            overrideExisting: false,
          });
        }
      }
    } catch { /* ignore */ }
  }, [selectedChildId, selectedDate, reset]);

  useEffect(() => { checkExisting(); }, [checkExisting]);

  const onSubmit = async (formData: FormData) => {
    if (overrideWarning && !formData.overrideExisting) {
      alert("既存の連絡を上書きする場合は「既存を上書きする」にチェックして送信してください。");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/daily-contacts/phone-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          version: existingContact?.version,
        }),
      });
      const result = await res.json();

      if (!res.ok) {
        setError(result.error ?? "送信に失敗しました。");
        return;
      }
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setExistingContact(null);
        setOverrideWarning(false);
        setValue("childId", "");
        setValue("note", "");
        setValue("callerName", "");
      }, 2000);
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
          ← 戻る
        </button>
        <h1 className="text-2xl font-bold">📞 電話代理入力</h1>
      </div>
      <p className="text-sm text-gray-500">
        電話で受け付けた乗車連絡を管理者が代わりに入力します。
      </p>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-2 text-green-700">
          <span>✅ 連絡を登録しました。</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* 児童と日付 */}
        <div className="card card-body space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">対象の設定</h2>
          <div>
            <label className="form-label">日付 <span className="text-red-500">*</span></label>
            <input type="date" className="form-input" {...register("date")} />
            {errors.date && <p className="form-error">{errors.date.message}</p>}
          </div>
          <div>
            <label className="form-label">児童 <span className="text-red-500">*</span></label>
            <select className="form-input" {...register("childId")}>
              <option value="">-- 選択してください --</option>
              {children.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}（{c.grade}年{c.className}組｜{c.school.name}）
                </option>
              ))}
            </select>
            {errors.childId && <p className="form-error">{errors.childId.message}</p>}
          </div>

          {/* 既存連絡の警告 */}
          {existingContact && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium text-yellow-800">⚠️ この日の連絡が既に登録されています</p>
              <div className="text-xs text-yellow-700 space-y-1">
                <p>登録方法: {existingContact.source === "app" ? "アプリ" : existingContact.source === "phone" ? "電話" : "管理者"}</p>
                <p>登録者: {existingContact.submittedBy?.name ?? "不明"}</p>
                <p>登録日時: {new Date(existingContact.submittedAt).toLocaleString("ja-JP")}</p>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" {...register("overrideExisting")} />
                <span className="font-medium text-yellow-800">既存の連絡を上書きする</span>
              </label>
            </div>
          )}
        </div>

        {/* 連絡内容 */}
        <div className="card card-body space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">連絡内容</h2>

          <div>
            <label className="form-label">出欠 <span className="text-red-500">*</span></label>
            <div className="grid grid-cols-2 gap-3">
              {(["attend", "absent"] as const).map((v) => (
                <label key={v} className={`flex items-center justify-center py-3 rounded-lg border-2 cursor-pointer transition-colors ${watch("attendanceStatus") === v ? (v === "attend" ? "border-green-500 bg-green-50 text-green-700" : "border-red-500 bg-red-50 text-red-700") : "border-gray-200 text-gray-500"}`}>
                  <input type="radio" value={v} className="sr-only" {...register("attendanceStatus")} />
                  {v === "attend" ? "✅ 登校" : "❌ 欠席"}
                </label>
              ))}
            </div>
          </div>

          {attendanceStatus === "attend" && (
            <>
              <div>
                <label className="form-label">朝便</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["default", "use", "not_use"] as const).map((v) => {
                    const labels = { default: "標準", use: "利用する", not_use: "利用しない" };
                    return (
                      <label key={v} className={`flex items-center justify-center py-2 rounded-lg border-2 cursor-pointer text-xs font-medium transition-colors ${watch("morningUseType") === v ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500"}`}>
                        <input type="radio" value={v} className="sr-only" {...register("morningUseType")} />
                        {labels[v]}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="form-label">帰り便</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["default", "use", "not_use"] as const).map((v) => {
                    const labels = { default: "標準", use: "利用する", not_use: "利用しない" };
                    return (
                      <label key={v} className={`flex items-center justify-center py-2 rounded-lg border-2 cursor-pointer text-xs font-medium transition-colors ${watch("eveningUseType") === v ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-500"}`}>
                        <input type="radio" value={v} className="sr-only" {...register("eveningUseType")} />
                        {labels[v]}
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          <div>
            <label className="form-label">発信者名（任意）</label>
            <input
              type="text"
              className="form-input"
              placeholder="例: 山田 花子"
              {...register("callerName")}
            />
          </div>

          <div>
            <label className="form-label">備考（任意）</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="申し送り事項を入力してください"
              {...register("note")}
            />
          </div>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full py-3"
        >
          {submitting ? "送信中..." : "📞 電話受付として登録する"}
        </button>
      </form>
    </div>
  );
}

export default function PhoneEntryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">読み込み中...</div>}>
      <PhoneEntryFormInner />
    </Suspense>
  );
}

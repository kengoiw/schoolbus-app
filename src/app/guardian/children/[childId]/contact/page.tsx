"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const contactSchema = z.object({
  attendanceStatus: z.enum(["attend", "absent"]),
  morningUseType: z.enum(["default", "use", "not_use"]),
  eveningUseType: z.enum(["default", "use", "not_use"]),
  note: z.string().max(500).optional(),
}).refine(
  (data) => {
    if (data.attendanceStatus === "absent") {
      return data.morningUseType === "not_use" && data.eveningUseType === "not_use";
    }
    return true;
  },
  { message: "欠席の場合はバス利用を「利用しない」に設定してください", path: ["morningUseType"] }
);

type ContactForm = z.infer<typeof contactSchema>;

interface ContactData {
  attendanceStatus: string;
  morningUseType: string;
  eveningUseType: string;
  note?: string;
  version?: number;
  source?: string;
  submittedAt?: string;
}

interface OperationDayData {
  status: string;
  morningDeadlineAt?: string;
  eveningDeadlineAt?: string;
}

interface Meta {
  morningDeadlinePassed: boolean;
  eveningDeadlinePassed: boolean;
}

export default function ContactPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const childId = params.childId as string;
  const date = searchParams.get("date") ?? new Date().toISOString().split("T")[0];

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [existingContact, setExistingContact] = useState<ContactData | null>(null);
  const [operationDay, setOperationDay] = useState<OperationDayData | null>(null);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [childName, setChildName] = useState("");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      attendanceStatus: "attend",
      morningUseType: "default",
      eveningUseType: "default",
    },
  });

  const attendanceStatus = watch("attendanceStatus");

  // 欠席選択時に自動的にバス不要に設定
  useEffect(() => {
    if (attendanceStatus === "absent") {
      setValue("morningUseType", "not_use");
      setValue("eveningUseType", "not_use");
    }
  }, [attendanceStatus, setValue]);

  // 既存連絡データを読込
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 児童名取得
        const childRes = await fetch("/api/guardian/children");
        if (childRes.ok) {
          const children = await childRes.json();
          const child = children.find((c: { id: string; name: string }) => c.id === childId);
          if (child) setChildName(child.name);
        }

        // 既存の連絡データ取得
        const res = await fetch(
          `/api/guardian/children/${childId}/daily-contact?date=${date}`
        );
        if (res.ok) {
          const data = await res.json();
          setOperationDay(data.operationDay);
          setMeta(data.meta);
          if (data.contact) {
            setExistingContact(data.contact);
            reset({
              attendanceStatus: data.contact.attendanceStatus,
              morningUseType: data.contact.morningUseType,
              eveningUseType: data.contact.eveningUseType,
              note: data.contact.note ?? "",
            });
          }
        }
      } catch {
        setError("データの読み込みに失敗しました。");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [childId, date, reset]);

  const onSubmit = async (formData: ContactForm) => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/guardian/children/${childId}/daily-contact`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            childId,
            date,
            ...formData,
            version: existingContact?.version,
          }),
        }
      );

      const result = await res.json();

      if (!res.ok) {
        setError(result.error ?? "送信に失敗しました。");
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push("/guardian"), 1500);
    } catch {
      setError("通信エラーが発生しました。再度お試しください。");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center text-gray-500">
          <svg className="animate-spin h-8 w-8 mx-auto mb-2 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          読み込み中...
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">連絡を送信しました</h2>
          <p className="text-sm text-gray-500 mt-1">ホーム画面に戻ります...</p>
        </div>
      </div>
    );
  }

  const fullyDeadlinePassed = meta?.morningDeadlinePassed && meta?.eveningDeadlinePassed;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        {childName} - バス乗車連絡
      </h2>
      <p className="text-sm text-gray-500">{date}</p>

      {fullyDeadlinePassed ? (
        <div className="card card-body space-y-3">
          <div className="alert-error">
            <p className="font-medium">⏰ すべての締切時刻が過ぎています</p>
          </div>
          <div className="alert-warning">
            <p className="text-sm font-medium">📞 変更が必要な場合は電話でご連絡ください</p>
            <p className="text-sm mt-1"><strong>小平町立学校: 0164-56-XXXX</strong></p>
          </div>
          {existingContact && (
            <div className="border-t pt-3">
              <p className="text-xs text-gray-500 mb-2">最後に送信した内容:</p>
              <div className="space-y-1 text-sm">
                <p>出欠: {existingContact.attendanceStatus === "attend" ? "登校" : "欠席"}</p>
                <p>朝便: {existingContact.morningUseType === "default" ? "標準" : existingContact.morningUseType === "use" ? "利用" : "利用しない"}</p>
                <p>帰り便: {existingContact.eveningUseType === "default" ? "標準" : existingContact.eveningUseType === "use" ? "利用" : "利用しない"}</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* 出欠選択 */}
          <div className="card card-body">
            <h3 className="text-sm font-semibold mb-3">出欠の状況</h3>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center justify-center py-3 rounded-lg border-2 cursor-pointer transition-colors ${attendanceStatus === "attend" ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-500"}`}>
                <input type="radio" value="attend" className="sr-only" {...register("attendanceStatus")} />
                <span className="text-sm font-medium">✅ 登校</span>
              </label>
              <label className={`flex items-center justify-center py-3 rounded-lg border-2 cursor-pointer transition-colors ${attendanceStatus === "absent" ? "border-red-500 bg-red-50 text-red-700" : "border-gray-200 text-gray-500"}`}>
                <input type="radio" value="absent" className="sr-only" {...register("attendanceStatus")} />
                <span className="text-sm font-medium">❌ 欠席</span>
              </label>
            </div>
          </div>

          {/* バス利用 */}
          {attendanceStatus === "attend" && (
            <div className="card card-body space-y-4">
              <h3 className="text-sm font-semibold">バス利用の設定</h3>

              {/* 朝便 - 締切チェック */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-700 font-medium">朝便</label>
                  {meta?.morningDeadlinePassed && (
                    <span className="badge-deadline">締切済み</span>
                  )}
                </div>
                {meta?.morningDeadlinePassed ? (
                  <div className="alert-warning text-xs">
                    朝便の締切が過ぎています。変更はお電話でお願いします。
                  </div>
                ) : (
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
                )}
                {errors.morningUseType && (
                  <p className="form-error">{errors.morningUseType.message}</p>
                )}
              </div>

              {/* 帰り便 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-700 font-medium">帰り便</label>
                  {meta?.eveningDeadlinePassed && (
                    <span className="badge-deadline">締切済み</span>
                  )}
                </div>
                {meta?.eveningDeadlinePassed ? (
                  <div className="alert-warning text-xs">
                    帰り便の締切が過ぎています。変更はお電話でお願いします。
                  </div>
                ) : (
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
                )}
              </div>
            </div>
          )}

          {/* 備考 */}
          <div className="card card-body">
            <label className="form-label">備考（任意）</label>
            <textarea
              className="form-input"
              rows={3}
              placeholder="連絡事項があれば入力してください（500文字まで）"
              {...register("note")}
            />
          </div>

          {error && <div className="alert-error">{error}</div>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary flex-1"
            >
              戻る
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex-1"
            >
              {submitting ? "送信中..." : existingContact ? "更新する" : "連絡する"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

interface TripDetail {
  id: string;
  segment: string;
  status: string;
  route: { id: string; name: string };
  operationDay: {
    operationDate: string;
    school: { name: string };
  };
  driver?: { id: string; name: string; phone?: string };
  passengers: Array<{
    id: string;
    expectedBoarding: boolean;
    boardingStatus: string;
    boardedAt?: string;
    stop: { name: string };
    child: { id: string; name: string; grade: number; className: string };
    contact?: { attendanceStatus: string; morningUseType: string; eveningUseType: string; note?: string };
  }>;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

interface Driver {
  id: string;
  name: string;
}

const segmentLabel: Record<string, string> = { morning: "朝便", evening: "帰り便" };
const statusLabel: Record<string, string> = {
  planned: "計画中", confirmed: "確認済", in_service: "🚌 運行中", completed: "✅ 完了", canceled: "❌ キャンセル",
};
const boardingStatusLabel: Record<string, string> = {
  expected: "待機中", boarded: "乗車済", no_show: "未乗車", not_applicable: "対象外",
};
const boardingStatusColor: Record<string, string> = {
  expected: "text-gray-500",
  boarded: "text-green-600 font-medium",
  no_show: "text-red-500",
  not_applicable: "text-gray-300",
};

export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.id as string;

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      const [tripRes, driversRes] = await Promise.all([
        fetch(`/api/admin/trips/${tripId}`),
        fetch("/api/admin/drivers"),
      ]);
      if (tripRes.ok) {
        const t = await tripRes.json();
        setTrip(t);
        setSelectedDriverId(t.driver?.id ?? "");
      }
      if (driversRes.ok) setDrivers(await driversRes.json());
      setLoading(false);
    };
    fetchAll();
  }, [tripId]);

  const handleSaveDriver = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/trips/${tripId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ driverUserId: selectedDriverId || null }),
      });
      const result = await res.json();
      if (res.ok) {
        setTrip(result);
        setMsg({ type: "ok", text: "ドライバーを更新しました" });
      } else {
        setMsg({ type: "err", text: result.error ?? "更新に失敗しました" });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/trips/${tripId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "confirmed" }),
      });
      const result = await res.json();
      if (res.ok) { setTrip(result); setMsg({ type: "ok", text: "便を確認済みにしました" }); }
      else setMsg({ type: "err", text: result.error ?? "更新に失敗しました" });
    } finally { setSaving(false); }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">読み込み中...</div>;
  if (!trip) return <div className="p-8 text-center text-red-500">便が見つかりません。</div>;

  const expectedCount = trip.passengers.filter((p) => p.expectedBoarding).length;
  const boardedCount = trip.passengers.filter((p) => p.boardingStatus === "boarded").length;
  const noShowCount = trip.passengers.filter((p) => p.boardingStatus === "no_show").length;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
          ← 便一覧
        </button>
        <h1 className="text-2xl font-bold">
          {segmentLabel[trip.segment]} - {trip.route.name}
        </h1>
        <span className="ml-auto text-sm px-3 py-1 rounded-full font-medium bg-gray-100">
          {statusLabel[trip.status]}
        </span>
      </div>

      {msg && (
        <div className={`rounded-lg px-4 py-2 text-sm ${msg.type === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {msg.type === "ok" ? "✅" : "❌"} {msg.text}
        </div>
      )}

      {/* 便情報 */}
      <div className="card card-body space-y-2">
        <h2 className="text-sm font-semibold text-gray-700">基本情報</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-gray-500">学校</span>
          <span>{trip.operationDay.school.name}</span>
          <span className="text-gray-500">運行日</span>
          <span>{new Date(trip.operationDay.operationDate).toLocaleDateString("ja-JP")}</span>
          <span className="text-gray-500">路線</span>
          <span>{trip.route.name}</span>
          {trip.startedAt && (
            <>
              <span className="text-gray-500">出発時刻</span>
              <span>{new Date(trip.startedAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}</span>
            </>
          )}
          {trip.completedAt && (
            <>
              <span className="text-gray-500">完了時刻</span>
              <span>{new Date(trip.completedAt).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}</span>
            </>
          )}
        </div>
      </div>

      {/* ドライバー設定 */}
      {(trip.status === "planned" || trip.status === "confirmed") && (
        <div className="card card-body space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">ドライバー割当</h2>
          <div className="flex gap-3">
            <select
              value={selectedDriverId}
              onChange={(e) => setSelectedDriverId(e.target.value)}
              className="form-input flex-1"
            >
              <option value="">-- 未割当 --</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <button onClick={handleSaveDriver} disabled={saving} className="btn-secondary whitespace-nowrap">
              保存
            </button>
          </div>
          {trip.status === "planned" && trip.driver && (
            <button onClick={handleConfirm} disabled={saving} className="btn-primary w-full">
              ✅ この便を確認済みにする
            </button>
          )}
        </div>
      )}

      {/* 乗車統計 */}
      <div className="card card-body">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">乗車状況</h2>
        <div className="flex gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">{expectedCount}</p>
            <p className="text-xs text-gray-500">乗車予定</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{boardedCount}</p>
            <p className="text-xs text-gray-500">乗車済</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-500">{noShowCount}</p>
            <p className="text-xs text-gray-500">未乗車</p>
          </div>
        </div>
      </div>

      {/* 乗車予定者一覧 */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold">乗車予定者一覧</h2>
        </div>
        {trip.passengers.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">乗車予定者なし</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {trip.passengers.map((p) => (
              <div key={p.id} className={`px-4 py-3 flex items-center justify-between ${!p.expectedBoarding ? "opacity-50" : ""}`}>
                <div>
                  <p className={`text-sm font-medium ${!p.expectedBoarding ? "line-through" : ""}`}>
                    {p.child.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {p.child.grade}年{p.child.className}組 | {p.stop.name}
                  </p>
                  {p.contact?.note && (
                    <p className="text-xs text-yellow-600 mt-0.5">📝 {p.contact.note}</p>
                  )}
                </div>
                <span className={`text-xs ${boardingStatusColor[p.boardingStatus]}`}>
                  {boardingStatusLabel[p.boardingStatus]}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

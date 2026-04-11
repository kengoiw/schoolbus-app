"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Trip {
  id: string;
  segment: string;
  status: string;
  route: { id: string; name: string };
  operationDay: {
    operationDate: string;
    status: string;
    school: { name: string };
  };
  driver?: { id: string; name: string };
  _count: { passengers: number };
  startedAt?: string;
  completedAt?: string;
}

const segmentLabel: Record<string, string> = { morning: "🌅 朝便", evening: "🌆 帰便" };
const statusLabel: Record<string, string> = {
  planned: "計画中", confirmed: "確認済", in_service: "運行中", completed: "完了", canceled: "キャンセル",
};
const statusColor: Record<string, string> = {
  planned: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  in_service: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-600",
  canceled: "bg-red-100 text-red-600",
};

export default function AdminTripsPage() {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genMsg, setGenMsg] = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/trips?date=${date}`);
      if (res.ok) {
        const data = await res.json();
        setTrips(data.trips ?? data);
      }
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  const handleGenerate = async () => {
    if (!confirm(`${date} の便を自動生成しますか？（既存の計画中の便は再生成されます）`)) return;
    setGenerating(true);
    setGenMsg(null);
    try {
      const res = await fetch("/api/admin/trips/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date }),
      });
      const result = await res.json();
      if (res.ok) {
        setGenMsg(`✅ ${result.created ?? 0}便を生成しました（既存${result.skipped ?? 0}件はスキップ）`);
        fetchTrips();
      } else {
        setGenMsg(`❌ ${result.error ?? "生成に失敗しました"}`);
      }
    } finally {
      setGenerating(false);
    }
  };

  const handleCancel = async (tripId: string) => {
    if (!confirm("この便をキャンセルしますか？")) return;
    try {
      const res = await fetch(`/api/admin/trips/${tripId}`, { method: "DELETE" });
      if (res.ok) fetchTrips();
      else {
        const d = await res.json();
        alert(d.error ?? "キャンセルに失敗しました");
      }
    } catch { alert("通信エラーが発生しました"); }
  };

  const morningTrips = trips.filter((t) => t.segment === "morning");
  const eveningTrips = trips.filter((t) => t.segment === "evening");

  function TripTable({ tripList, title }: { tripList: Trip[]; title: string }) {
    return (
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold">{title}</h2>
          <span className="text-sm text-gray-500">{tripList.length}便</span>
        </div>
        {tripList.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">便が生成されていません</div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>路線</th>
                  <th>担当ドライバー</th>
                  <th>乗車予定</th>
                  <th>状態</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {tripList.map((trip) => (
                  <tr key={trip.id}>
                    <td className="font-medium">{trip.route.name}</td>
                    <td>
                      {trip.driver ? (
                        <span className="text-sm">{trip.driver.name}</span>
                      ) : (
                        <span className="text-xs text-red-500">未割当</span>
                      )}
                    </td>
                    <td>
                      <span className="font-medium">{trip._count.passengers}</span>
                      <span className="text-xs text-gray-400 ml-1">名</span>
                    </td>
                    <td>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[trip.status]}`}>
                        {statusLabel[trip.status]}
                      </span>
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <Link href={`/admin/trips/${trip.id}`} className="text-xs text-blue-600 hover:underline">
                          詳細
                        </Link>
                        {(trip.status === "planned" || trip.status === "confirmed") && (
                          <button
                            onClick={() => handleCancel(trip.id)}
                            className="text-xs text-red-500 hover:underline"
                          >
                            キャンセル
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">便管理</h1>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="form-input text-sm"
          />
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary whitespace-nowrap"
          >
            {generating ? "生成中..." : "🚌 便を自動生成"}
          </button>
        </div>
      </div>

      {genMsg && (
        <div className={`rounded-lg px-4 py-2 text-sm ${genMsg.startsWith("✅") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {genMsg}
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-gray-500">読み込み中...</div>
      ) : (
        <>
          <TripTable tripList={morningTrips} title="🌅 朝便" />
          <TripTable tripList={eveningTrips} title="🌆 帰り便" />
        </>
      )}
    </div>
  );
}

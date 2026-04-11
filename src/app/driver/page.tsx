"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Trip {
  id: string;
  segment: string;
  status: string;
  route: { name: string };
  operationDay: { operationDate: string; school: { name: string } };
  passengers: Array<{
    id: string;
    childId: string;
    boardingStatus: string;
    expectedBoarding: boolean;
    child: { id: string; name: string; grade: number; className: string };
    stop: { name: string };
  }>;
}

const segmentLabel: Record<string, string> = {
  morning: "🌅 朝便",
  evening: "🌆 帰り便",
};

const statusLabel: Record<string, string> = {
  planned: "計画中",
  confirmed: "確認済",
  in_service: "🚌 運行中",
  completed: "✅ 完了",
  canceled: "キャンセル",
};

const statusColor: Record<string, string> = {
  planned: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  in_service: "bg-green-100 text-green-800",
  completed: "bg-gray-100 text-gray-600",
  canceled: "bg-red-100 text-red-600",
};

export default function DriverHomePage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchTrips = async () => {
    try {
      const res = await fetch("/api/driver/trips/today");
      if (!res.ok) throw new Error("データの取得に失敗しました。");
      const data = await res.json();
      setTrips(data);
    } catch {
      setError("配送情報の取得に失敗しました。再読み込みしてください。");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrips();
    // 5分ごとに自動更新
    const interval = setInterval(fetchTrips, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async (tripId: string) => {
    setActionLoading(tripId + "-start");
    try {
      const res = await fetch(`/api/driver/trips/${tripId}/start`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "出発処理に失敗しました。");
        return;
      }
      await fetchTrips();
    } finally {
      setActionLoading(null);
    }
  };

  const handleComplete = async (tripId: string) => {
    if (!confirm("この便の運行を完了しますか？")) return;
    setActionLoading(tripId + "-complete");
    try {
      const res = await fetch(`/api/driver/trips/${tripId}/complete`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "完了処理に失敗しました。");
        return;
      }
      await fetchTrips();
    } finally {
      setActionLoading(null);
    }
  };

  const handleBoarding = async (tripId: string, childId: string, status: "boarded" | "no_show") => {
    setActionLoading(`${tripId}-${childId}`);
    try {
      const endpoint = status === "boarded" ? "board" : "no-show";
      const res = await fetch(`/api/driver/trips/${tripId}/passengers/${childId}/${endpoint}`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error ?? "記録に失敗しました。");
        return;
      }
      await fetchTrips();
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center text-gray-500">
          <svg className="animate-spin h-8 w-8 mx-auto mb-2 text-green-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          読み込み中...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="alert-error">{error}</div>
        <button onClick={fetchTrips} className="btn-primary w-full">
          再読み込み
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">今日の担当便</h2>
        <button onClick={fetchTrips} className="text-xs text-gray-500 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          更新
        </button>
      </div>

      {trips.length === 0 ? (
        <div className="card card-body text-center text-gray-500 py-12">
          <p className="text-4xl mb-2">🚌</p>
          <p>本日の担当便はありません。</p>
        </div>
      ) : (
        trips.map((trip) => (
          <div key={trip.id} className="card">
            {/* 便ヘッダー */}
            <div className="card-header">
              <div>
                <p className="font-semibold">{segmentLabel[trip.segment]}</p>
                <p className="text-xs text-gray-500">{trip.route.name}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[trip.status]}`}>
                {statusLabel[trip.status]}
              </span>
            </div>

            {/* 乗客一覧 */}
            <div className="divide-y divide-gray-100">
              {trip.passengers.filter((p) => p.expectedBoarding).map((passenger) => {
                const isLoading = actionLoading === `${trip.id}-${passenger.child.id}`;
                return (
                  <div key={passenger.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{passenger.child.name}</p>
                      <p className="text-xs text-gray-500">
                        {passenger.child.grade}年{passenger.child.className}組 | {passenger.stop.name}
                      </p>
                    </div>
                    {trip.status === "in_service" && (
                      <div className="flex gap-2">
                        {passenger.boardingStatus === "expected" ? (
                          <>
                            <button
                              onClick={() => handleBoarding(trip.id, passenger.child.id, "boarded")}
                              disabled={isLoading}
                              className="btn-success text-xs py-1 px-2"
                            >
                              乗車✓
                            </button>
                            <button
                              onClick={() => handleBoarding(trip.id, passenger.child.id, "no_show")}
                              disabled={isLoading}
                              className="btn-danger text-xs py-1 px-2"
                            >
                              未乗
                            </button>
                          </>
                        ) : (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            passenger.boardingStatus === "boarded"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-600"
                          }`}>
                            {passenger.boardingStatus === "boarded" ? "乗車済" : "未乗車"}
                          </span>
                        )}
                      </div>
                    )}
                    {trip.status !== "in_service" && (
                      <span className="text-xs text-gray-400">
                        {passenger.boardingStatus === "boarded" ? "✅ 乗車済" :
                         passenger.boardingStatus === "no_show" ? "❌ 未乗車" : "待機中"}
                      </span>
                    )}
                  </div>
                );
              })}
              {trip.passengers.filter((p) => p.expectedBoarding).length === 0 && (
                <div className="px-4 py-3 text-sm text-gray-500 text-center">
                  乗車予定者なし
                </div>
              )}
            </div>

            {/* アクションボタン */}
            <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
              {(trip.status === "planned" || trip.status === "confirmed") && (
                <button
                  onClick={() => handleStart(trip.id)}
                  disabled={actionLoading === trip.id + "-start"}
                  className="btn-primary flex-1"
                >
                  {actionLoading === trip.id + "-start" ? "処理中..." : "🚌 出発する"}
                </button>
              )}
              {trip.status === "in_service" && (
                <button
                  onClick={() => handleComplete(trip.id)}
                  disabled={actionLoading === trip.id + "-complete"}
                  className="btn-success flex-1"
                >
                  {actionLoading === trip.id + "-complete" ? "処理中..." : "✅ 運行完了"}
                </button>
              )}
              {(trip.status === "completed" || trip.status === "canceled") && (
                <p className="text-sm text-gray-500 text-center w-full py-1">
                  {trip.status === "completed" ? "完了した便です" : "キャンセルされた便です"}
                </p>
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

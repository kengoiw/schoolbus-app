"use client";

import { useState, useEffect, useCallback } from "react";

interface AuditLog {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actedByUser?: { name: string; email: string; role: string };
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  createdAt: string;
}

const actionColor: Record<string, string> = {
  CREATE: "text-green-600 bg-green-50",
  UPDATE: "text-blue-600 bg-blue-50",
  DELETE: "text-red-600 bg-red-50",
};

const entityLabel: Record<string, string> = {
  daily_contact: "日次連絡",
  trip: "便",
  trip_passenger: "乗車記録",
  announcement: "お知らせ",
  user: "ユーザー",
  child: "児童",
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // フィルタ
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (entityType) params.set("entityType", entityType);
    if (action) params.set("action", action);

    try {
      const res = await fetch(`/api/admin/audit-logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [page, entityType, action]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">監査ログ</h1>

      {/* フィルタ */}
      <div className="card card-body">
        <div className="flex flex-wrap gap-3">
          <div>
            <label className="form-label">エンティティ</label>
            <select
              value={entityType}
              onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
              className="form-input text-sm"
            >
              <option value="">すべて</option>
              {Object.entries(entityLabel).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">操作種別</label>
            <select
              value={action}
              onChange={(e) => { setAction(e.target.value); setPage(1); }}
              className="form-input text-sm"
            >
              <option value="">すべて</option>
              <option value="CREATE">作成</option>
              <option value="UPDATE">更新</option>
              <option value="DELETE">削除</option>
            </select>
          </div>
        </div>
      </div>

      <div className="text-sm text-gray-500">合計 {total} 件</div>

      <div className="card">
        {loading ? (
          <div className="p-8 text-center text-gray-500">読み込み中...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">ログがありません。</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs.map((log) => (
              <div key={log.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${actionColor[log.action] ?? "text-gray-600 bg-gray-100"}`}>
                      {log.action}
                    </span>
                    <span className="text-sm font-medium text-gray-800">
                      {entityLabel[log.entityType] ?? log.entityType}
                    </span>
                    <span className="text-xs text-gray-400 font-mono truncate max-w-xs">
                      {log.entityId}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {log.actedByUser?.name ?? "システム"}
                      <span className="text-gray-400 ml-1">({log.actedByUser?.role})</span>
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(log.createdAt).toLocaleString("ja-JP", {
                        month: "2-digit", day: "2-digit",
                        hour: "2-digit", minute: "2-digit", second: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                {/* 変更内容の展開表示 */}
                {(log.before || log.after) && (
                  <div className="mt-2">
                    <button
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {expandedId === log.id ? "▲ 変更内容を閉じる" : "▼ 変更内容を表示"}
                    </button>
                    {expandedId === log.id && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {log.before && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">変更前</p>
                            <pre className="text-xs bg-gray-50 rounded p-2 overflow-auto max-h-32 text-gray-600">
                              {JSON.stringify(log.before, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.after && (
                          <div>
                            <p className="text-xs font-medium text-gray-500 mb-1">変更後</p>
                            <pre className="text-xs bg-blue-50 rounded p-2 overflow-auto max-h-32 text-blue-800">
                              {JSON.stringify(log.after, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ページネーション */}
      {total > 50 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary px-3 py-1 text-xs"
          >
            ← 前へ
          </button>
          <span className="text-sm text-gray-600 py-1 px-2">
            {page} / {Math.ceil(total / 50)}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= Math.ceil(total / 50)}
            className="btn-secondary px-3 py-1 text-xs"
          >
            次へ →
          </button>
        </div>
      )}
    </div>
  );
}

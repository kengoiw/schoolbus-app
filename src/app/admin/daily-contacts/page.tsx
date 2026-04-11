"use client";

import { useState, useCallback, useEffect } from "react";
import { formatJst } from "@/lib/date";
import Link from "next/link";

interface Contact {
  id: string;
  attendanceStatus: string;
  morningUseType: string;
  eveningUseType: string;
  source: string;
  afterDeadlineFlag: boolean;
  submittedAt: string;
  note?: string;
  version: number;
  child: {
    id: string;
    name: string;
    kana: string;
    grade: number;
    className: string;
    school: { name: string };
    defaultMorningStop?: { name: string };
    defaultEveningStop?: { name: string };
  };
  operationDay: {
    operationDate: string;
    status: string;
    morningDeadlineAt?: string;
    eveningDeadlineAt?: string;
  };
  submittedBy: { name: string };
  receivedBy?: { name: string };
}

const attendanceLabel: Record<string, string> = { attend: "登校", absent: "欠席" };
const useLabel: Record<string, string> = { default: "標準", use: "利用", not_use: "不要" };
const sourceLabel: Record<string, string> = { app: "アプリ", phone: "電話", admin: "管理者" };
const sourceColor: Record<string, string> = { app: "text-blue-600", phone: "text-orange-600", admin: "text-purple-600" };

export default function AdminDailyContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // フィルタ
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [childName, setChildName] = useState("");

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page) });
    if (date) params.set("date", date);
    if (childName) params.set("childName", childName);

    try {
      const res = await fetch(`/api/admin/daily-contacts?${params}`);
      if (res.ok) {
        const data = await res.json();
        setContacts(data.contacts);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [date, childName, page]);

  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchContacts();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold">日次連絡一覧</h1>
        <Link href="/admin/phone-entry" className="btn-primary">
          📞 電話代理入力
        </Link>
      </div>

      {/* 検索フィルタ */}
      <form onSubmit={handleSearch} className="card card-body">
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="form-label">日付</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label">児童名</label>
            <input
              type="text"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              placeholder="例: 山田"
              className="form-input"
            />
          </div>
          <button type="submit" className="btn-primary">
            🔍 絞り込み
          </button>
          <button
            type="button"
            onClick={() => { setDate(today); setChildName(""); setPage(1); }}
            className="btn-secondary"
          >
            リセット
          </button>
        </div>
      </form>

      {/* 統計バー */}
      <div className="flex gap-4 text-sm text-gray-600">
        <span>合計 <strong>{total}</strong> 件</span>
        <span>欠席 <strong className="text-red-600">{contacts.filter(c => c.attendanceStatus === "absent").length}</strong> 件</span>
        <span>電話受付 <strong className="text-orange-600">{contacts.filter(c => c.source === "phone").length}</strong> 件</span>
      </div>

      {/* 一覧テーブル */}
      <div className="card">
        {loading ? (
          <div className="p-8 text-center text-gray-500">読み込み中...</div>
        ) : contacts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">該当する連絡がありません。</div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>児童名</th>
                  <th>学年/組</th>
                  <th>出欠</th>
                  <th>朝便</th>
                  <th>帰便</th>
                  <th>連絡方法</th>
                  <th>締切後</th>
                  <th>提出時刻</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div className="font-medium text-gray-900">{c.child.name}</div>
                      <div className="text-xs text-gray-400">{c.child.kana}</div>
                    </td>
                    <td className="text-xs text-gray-600">
                      {c.child.grade}年{c.child.className}組
                      <div className="text-gray-400">{c.child.school.name}</div>
                    </td>
                    <td>
                      <span className={c.attendanceStatus === "attend" ? "badge-attend" : "badge-absent"}>
                        {attendanceLabel[c.attendanceStatus]}
                      </span>
                    </td>
                    <td>
                      <span className="badge-default">{useLabel[c.morningUseType]}</span>
                    </td>
                    <td>
                      <span className="badge-default">{useLabel[c.eveningUseType]}</span>
                    </td>
                    <td>
                      <span className={`text-xs font-medium ${sourceColor[c.source]}`}>
                        {sourceLabel[c.source]}
                      </span>
                    </td>
                    <td>
                      {c.afterDeadlineFlag && (
                        <span className="badge-deadline">締切後</span>
                      )}
                    </td>
                    <td className="text-xs text-gray-500 whitespace-nowrap">
                      {formatJst(new Date(c.submittedAt), "HH:mm")}
                    </td>
                    <td>
                      <Link
                        href={`/admin/phone-entry?contactId=${c.id}&childId=${c.child.id}&date=${date}`}
                        className="text-xs text-blue-600 hover:underline whitespace-nowrap"
                      >
                        修正
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            {page} / {Math.ceil(total / 50)} ページ
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

      {/* 印刷ボタン */}
      <div className="flex justify-end no-print">
        <button onClick={() => window.print()} className="btn-secondary text-xs">
          🖨️ 印刷
        </button>
      </div>
    </div>
  );
}

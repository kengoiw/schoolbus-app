import { prisma } from "@/lib/prisma";
import { todayJst, dateToJstStart, formatJst } from "@/lib/date";
import Link from "next/link";

export default async function AdminDashboard() {
  const today = todayJst();
  const todayDate = dateToJstStart(today).toDate();

  const [
    totalChildren,
    totalContacts,
    pendingTrips,
    recentContacts,
  ] = await Promise.all([
    prisma.child.count({ where: { status: "active" } }),
    prisma.dailyContact.count({
      where: {
        operationDay: { operationDate: todayDate },
        isActive: true,
      },
    }),
    prisma.trip.count({
      where: {
        status: { in: ["planned", "confirmed"] },
        operationDay: { operationDate: todayDate },
      },
    }),
    prisma.dailyContact.findMany({
      where: {
        operationDay: { operationDate: todayDate },
        isActive: true,
      },
      include: {
        child: { select: { name: true, grade: true, className: true } },
        operationDay: { include: { school: { select: { name: true } } } },
      },
      orderBy: { submittedAt: "desc" },
      take: 10,
    }),
  ]);

  const absentCount = recentContacts.filter(
    (c) => c.attendanceStatus === "absent"
  ).length;

  const statusMap: Record<string, string> = {
    planned: "計画中",
    confirmed: "確認済",
    in_service: "運行中",
    completed: "完了",
    canceled: "キャンセル",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <p className="text-sm text-gray-500">
          {new Date().toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "short",
          })}
        </p>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "登録児童数", value: totalChildren, color: "blue", unit: "名" },
          { label: "本日の連絡数", value: totalContacts, color: "green", unit: "件" },
          { label: "本日の欠席", value: absentCount, color: "red", unit: "名" },
          { label: "未確認の便", value: pendingTrips, color: "yellow", unit: "便" },
        ].map((item) => (
          <div key={item.label} className="card card-body">
            <p className="text-xs text-gray-500 font-medium">{item.label}</p>
            <p className={`text-3xl font-bold text-${item.color}-600 mt-1`}>
              {item.value}
              <span className={`text-sm text-${item.color}-400 ml-1`}>{item.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* クイックアクション */}
      <div className="card card-body">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">クイックアクション</h2>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/phone-entry" className="btn-primary">
            📞 電話代理入力
          </Link>
          <Link href={`/admin/trips?date=${today}`} className="btn-secondary">
            🚌 本日の便確認
          </Link>
          <Link href="/admin/daily-contacts" className="btn-secondary">
            📋 連絡一覧
          </Link>
        </div>
      </div>

      {/* 本日の連絡一覧（最新10件） */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold">本日の連絡（直近10件）</h2>
          <Link href="/admin/daily-contacts" className="text-xs text-blue-600">
            すべて見る →
          </Link>
        </div>

        {recentContacts.length === 0 ? (
          <div className="card-body text-center text-gray-500 py-8">
            <p>本日の連絡はまだありません。</p>
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>児童名</th>
                  <th>出欠</th>
                  <th>朝便</th>
                  <th>帰り便</th>
                  <th>連絡方法</th>
                  <th>提出時刻</th>
                </tr>
              </thead>
              <tbody>
                {recentContacts.map((c) => (
                  <tr key={c.id}>
                    <td className="font-medium">
                      {c.child.name}
                      <span className="text-xs text-gray-400 ml-1">
                        {c.child.grade}年
                      </span>
                    </td>
                    <td>
                      <span className={c.attendanceStatus === "attend" ? "badge-attend" : "badge-absent"}>
                        {c.attendanceStatus === "attend" ? "登校" : "欠席"}
                      </span>
                    </td>
                    <td>
                      <span className="badge-default text-xs">
                        {c.morningUseType === "default" ? "標準" : c.morningUseType === "use" ? "利用" : "不要"}
                      </span>
                    </td>
                    <td>
                      <span className="badge-default text-xs">
                        {c.eveningUseType === "default" ? "標準" : c.eveningUseType === "use" ? "利用" : "不要"}
                      </span>
                    </td>
                    <td>
                      <span className={`text-xs ${c.source === "phone" ? "text-orange-600" : "text-blue-600"}`}>
                        {c.source === "app" ? "アプリ" : c.source === "phone" ? "電話" : "管理者"}
                      </span>
                    </td>
                    <td className="text-xs text-gray-500">
                      {formatJst(c.submittedAt, "HH:mm")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

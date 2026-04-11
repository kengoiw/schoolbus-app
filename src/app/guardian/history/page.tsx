import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatJst } from "@/lib/date";
import Link from "next/link";

export default async function GuardianHistoryPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const guardianChildren = await prisma.guardianChild.findMany({
    where: { guardianUserId: userId },
    include: { child: { select: { id: true, name: true } } },
  });

  const childIds = guardianChildren.map((gc) => gc.child.id);

  const contacts = await prisma.dailyContact.findMany({
    where: {
      childId: { in: childIds },
      isActive: true,
    },
    include: {
      child: { select: { name: true, grade: true, className: true } },
      operationDay: { select: { operationDate: true } },
    },
    orderBy: [
      { operationDay: { operationDate: "desc" } },
      { submittedAt: "desc" },
    ],
    take: 60,
  });

  // 日付でグループ化
  const grouped: Record<string, typeof contacts> = {};
  for (const c of contacts) {
    const date = new Date(c.operationDay.operationDate).toLocaleDateString("ja-JP", {
      year: "numeric", month: "long", day: "numeric", weekday: "short",
    });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(c);
  }

  const attendanceLabel: Record<string, string> = { attend: "登校", absent: "欠席" };
  const useLabel: Record<string, string> = { default: "標準", use: "利用", not_use: "不要" };
  const sourceLabel: Record<string, string> = { app: "アプリ", phone: "電話", admin: "管理者" };

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">連絡履歴</h1>
      <p className="text-xs text-gray-500">直近60件の連絡を表示しています。</p>

      {contacts.length === 0 ? (
        <div className="card card-body text-center text-gray-500 py-10">
          <p>連絡履歴がありません。</p>
          <Link href="/guardian" className="text-blue-600 text-sm mt-2 inline-block">
            今日の連絡へ →
          </Link>
        </div>
      ) : (
        Object.entries(grouped).map(([date, dayContacts]) => (
          <div key={date} className="card">
            <div className="card-header bg-gray-50 rounded-t-xl">
              <h2 className="text-sm font-semibold text-gray-700">{date}</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {dayContacts.map((c) => (
                <div key={c.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{c.child.name}</span>
                    <span className={c.attendanceStatus === "attend" ? "badge-attend" : "badge-absent"}>
                      {attendanceLabel[c.attendanceStatus]}
                    </span>
                  </div>
                  <div className="flex gap-4 text-xs text-gray-600">
                    <span>朝: <strong>{useLabel[c.morningUseType]}</strong></span>
                    <span>帰: <strong>{useLabel[c.eveningUseType]}</strong></span>
                    <span className={`ml-auto ${c.source === "phone" ? "text-orange-500" : "text-gray-400"}`}>
                      {sourceLabel[c.source]}
                    </span>
                    <span className="text-gray-400">
                      {formatJst(c.submittedAt, "HH:mm")}
                    </span>
                  </div>
                  {c.afterDeadlineFlag && (
                    <span className="badge-deadline text-xs mt-1 inline-block">締切後受付</span>
                  )}
                  {c.note && (
                    <p className="text-xs text-gray-500 mt-1">📝 {c.note}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

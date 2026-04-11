import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { todayJst, dateToJstStart, formatJst, isAfterDeadline } from "@/lib/date";
import Link from "next/link";

export default async function GuardianHomePage() {
  const session = await auth();
  const userId = session!.user!.id!;
  const today = todayJst();
  const todayDate = dateToJstStart(today).toDate();

  // 保護者の児童を取得
  const guardianChildren = await prisma.guardianChild.findMany({
    where: { guardianUserId: userId },
    include: {
      child: {
        include: {
          school: { select: { id: true, name: true } },
        },
      },
    },
  });

  // 今日の運行日と連絡状況を取得
  const childrenWithStatus = await Promise.all(
    guardianChildren.map(async (gc) => {
      const child = gc.child;
      const operationDay = await prisma.operationDay.findUnique({
        where: {
          schoolId_operationDate: {
            schoolId: child.schoolId,
            operationDate: todayDate,
          },
        },
      });

      const contact = operationDay
        ? await prisma.dailyContact.findUnique({
            where: {
              childId_operationDayId: {
                childId: child.id,
                operationDayId: operationDay.id,
              },
            },
          })
        : null;

      const morningPassed = isAfterDeadline(operationDay?.morningDeadlineAt ?? null);
      const eveningPassed = isAfterDeadline(operationDay?.eveningDeadlineAt ?? null);

      return {
        child,
        operationDay,
        contact,
        morningPassed,
        eveningPassed,
      };
    })
  );

  // お知らせ（最新3件）
  const announcements = await prisma.announcement.findMany({
    where: {
      AND: [
        { publishFrom: { lte: new Date() } },
        {
          OR: [{ publishTo: null }, { publishTo: { gte: new Date() } }],
        },
        {
          OR: [{ targetRole: "all" }, { targetRole: "guardian" }],
        },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 3,
  });

  const attendanceLabel: Record<string, string> = {
    attend: "登校",
    absent: "欠席",
  };
  const useTypeLabel: Record<string, string> = {
    default: "標準",
    use: "利用",
    not_use: "不要",
  };

  return (
    <div className="space-y-4">
      {/* 日付バナー */}
      <div className="bg-blue-600 text-white rounded-xl p-4">
        <p className="text-sm text-blue-200">本日の連絡確認</p>
        <p className="text-xl font-bold mt-1">
          {new Date().toLocaleDateString("ja-JP", {
            year: "numeric",
            month: "long",
            day: "numeric",
            weekday: "long",
          })}
        </p>
      </div>

      {/* 児童ごとの今日の状況 */}
      {childrenWithStatus.length === 0 ? (
        <div className="card card-body text-center text-gray-500 py-8">
          <p>登録されているお子さんがいません。</p>
          <p className="text-xs mt-1">学校へお問い合わせください。</p>
        </div>
      ) : (
        childrenWithStatus.map(({ child, operationDay, contact, morningPassed, eveningPassed }) => (
          <div key={child.id} className="card">
            <div className="card-header">
              <div>
                <h2 className="text-base font-semibold">{child.name}</h2>
                <p className="text-xs text-gray-500">
                  {child.school.name} {child.grade}年{child.className}組
                </p>
              </div>
              {operationDay && (
                <Link
                  href={`/guardian/children/${child.id}/contact?date=${today}`}
                  className="btn-primary text-xs py-1.5 px-3 no-print"
                >
                  {contact ? "変更する" : "連絡する"}
                </Link>
              )}
            </div>

            <div className="card-body space-y-3">
              {!operationDay ? (
                <div className="alert-info text-xs">本日の運行日設定がありません。</div>
              ) : operationDay.status === "holiday" ? (
                <div className="alert-info text-xs">🎌 本日は休校日です。</div>
              ) : operationDay.status === "canceled" ? (
                <div className="alert-error text-xs">🚫 本日はバス運休です。</div>
              ) : (
                <>
                  {/* 連絡状態 */}
                  {contact ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">出欠</span>
                        <span className={contact.attendanceStatus === "attend" ? "badge-attend" : "badge-absent"}>
                          {attendanceLabel[contact.attendanceStatus]}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">朝便</span>
                        <span className="badge-default">{useTypeLabel[contact.morningUseType]}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">帰り便</span>
                        <span className="badge-default">{useTypeLabel[contact.eveningUseType]}</span>
                      </div>
                      <p className="text-xs text-gray-400">
                        {formatJst(contact.submittedAt)} 連絡済み
                        {contact.source === "phone" && " (電話)"}
                      </p>
                    </div>
                  ) : (
                    <div className="alert-warning text-xs">
                      ⚠️ 本日の連絡がまだ届いていません。
                    </div>
                  )}

                  {/* 締切情報 */}
                  <div className="border-t pt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">朝便締切</span>
                      {operationDay.morningDeadlineAt ? (
                        <span className={morningPassed ? "text-red-600 font-medium" : "text-gray-700"}>
                          {morningPassed ? "締切済み" : formatJst(operationDay.morningDeadlineAt, "HH:mm")}
                        </span>
                      ) : (
                        <span className="text-gray-400">設定なし</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500">帰り便締切</span>
                      {operationDay.eveningDeadlineAt ? (
                        <span className={eveningPassed ? "text-red-600 font-medium" : "text-gray-700"}>
                          {eveningPassed ? "締切済み" : formatJst(operationDay.eveningDeadlineAt, "HH:mm")}
                        </span>
                      ) : (
                        <span className="text-gray-400">設定なし</span>
                      )}
                    </div>
                  </div>

                  {/* 締切後の電話案内 */}
                  {(morningPassed || eveningPassed) && (
                    <div className="alert-warning text-xs">
                      📞 締切が過ぎています。変更が必要な場合は<br />
                      <strong>お電話で直接ご連絡ください。</strong>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ))
      )}

      {/* お知らせ */}
      {announcements.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-sm font-semibold">📢 お知らせ</h2>
            <Link href="/guardian/announcements" className="text-xs text-blue-600">
              すべて見る
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {announcements.map((a) => (
              <Link
                key={a.id}
                href={`/guardian/announcements/${a.id}`}
                className="block px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {formatJst(a.publishFrom, "YYYY年MM月DD日")}
                </p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { todayJst } from "@/lib/date";

export default async function GuardianChildrenPage() {
  const session = await auth();
  const userId = session!.user!.id!;
  const today = todayJst();

  const guardianChildren = await prisma.guardianChild.findMany({
    where: { guardianUserId: userId },
    include: {
      child: {
        include: {
          school: { select: { name: true } },
          defaultMorningRoute: { select: { name: true } },
          defaultEveningRoute: { select: { name: true } },
          defaultMorningStop: { select: { name: true } },
          defaultEveningStop: { select: { name: true } },
        },
      },
    },
    orderBy: { child: { grade: "asc" } },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold">お子さんの情報確認</h1>

      {guardianChildren.length === 0 ? (
        <div className="card card-body text-center text-gray-500 py-10">
          <p>登録されているお子さんがいません。</p>
          <p className="text-xs mt-1">学校へお問い合わせください。</p>
        </div>
      ) : (
        guardianChildren.map(({ child, relationship }) => (
          <div key={child.id} className="card">
            <div className="card-header">
              <div>
                <h2 className="text-base font-semibold">{child.name}</h2>
                <p className="text-xs text-gray-400">（{relationship}）{child.kana}</p>
              </div>
              <Link
                href={`/guardian/children/${child.id}/contact?date=${today}`}
                className="btn-primary text-xs py-1.5 px-3"
              >
                今日の連絡
              </Link>
            </div>
            <div className="card-body space-y-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                <span className="text-gray-500">学校</span>
                <span>{child.school.name}</span>
                <span className="text-gray-500">学年・組</span>
                <span>{child.grade}年{child.className}組</span>
              </div>

              <div className="border-t pt-3">
                <p className="text-xs font-medium text-gray-500 mb-2">標準のバス利用設定</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className={`rounded-lg p-3 ${child.defaultMorningUse ? "bg-blue-50 border border-blue-200" : "bg-gray-50 border border-gray-200"}`}>
                    <p className="text-xs font-medium text-gray-600">朝便</p>
                    <p className={`text-sm font-bold mt-0.5 ${child.defaultMorningUse ? "text-blue-700" : "text-gray-400"}`}>
                      {child.defaultMorningUse ? "利用する" : "利用しない"}
                    </p>
                    {child.defaultMorningRoute && (
                      <p className="text-xs text-blue-600 mt-1">{child.defaultMorningRoute.name}</p>
                    )}
                    {child.defaultMorningStop && (
                      <p className="text-xs text-gray-500">🚏 {child.defaultMorningStop.name}</p>
                    )}
                  </div>
                  <div className={`rounded-lg p-3 ${child.defaultEveningUse ? "bg-orange-50 border border-orange-200" : "bg-gray-50 border border-gray-200"}`}>
                    <p className="text-xs font-medium text-gray-600">帰り便</p>
                    <p className={`text-sm font-bold mt-0.5 ${child.defaultEveningUse ? "text-orange-700" : "text-gray-400"}`}>
                      {child.defaultEveningUse ? "利用する" : "利用しない"}
                    </p>
                    {child.defaultEveningRoute && (
                      <p className="text-xs text-orange-600 mt-1">{child.defaultEveningRoute.name}</p>
                    )}
                    {child.defaultEveningStop && (
                      <p className="text-xs text-gray-500">🚏 {child.defaultEveningStop.name}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t pt-2">
                <p className="text-xs text-gray-400">
                  ※標準設定と異なる日のみ連絡してください。変更がない日は連絡不要です。
                </p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

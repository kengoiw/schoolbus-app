import { prisma } from "@/lib/prisma";
import { formatJst } from "@/lib/date";
import Link from "next/link";

export default async function ObservationsListPage() {
  const points = await prisma.observationPoint.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      memo: true,
      createdBy: { select: { name: true } },
      observations: {
        orderBy: { takenAt: "desc" },
        take: 1,
        select: { id: true, takenAt: true, greenRatio: true },
      },
      _count: { select: { observations: true } },
    },
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">観測地点</h1>
        <Link href="/observations/new" className="btn-primary">
          + 地点を追加
        </Link>
      </div>

      {points.length === 0 ? (
        <div className="card card-body text-center text-gray-500 py-10">
          <p>観測地点がまだありません。</p>
          <p className="text-xs mt-1">「地点を追加」から圃場や観測ポイントを登録してください。</p>
        </div>
      ) : (
        <div className="card divide-y divide-gray-100">
          {points.map((p) => {
            const latest = p.observations[0];
            return (
              <Link
                key={p.id}
                href={`/observations/${p.id}`}
                className="flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors"
              >
                <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  {latest ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/api/observation-points/${p.id}/observations/${latest.id}/image`}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl">🌱</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.name}</p>
                  <p className="text-xs text-gray-500 truncate">
                    {p._count.observations}件の記録
                    {latest ? ` ・ 最終 ${formatJst(latest.takenAt, "MM/DD HH:mm")}` : ""}
                  </p>
                </div>
                {latest && (
                  <span className="badge-use whitespace-nowrap">
                    緑 {Math.round(latest.greenRatio * 100)}%
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

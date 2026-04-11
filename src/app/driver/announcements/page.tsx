import { prisma } from "@/lib/prisma";
import { formatJst } from "@/lib/date";
import Link from "next/link";

export default async function DriverAnnouncementsPage() {
  const now = new Date();
  const announcements = await prisma.announcement.findMany({
    where: {
      AND: [
        { publishFrom: { lte: now } },
        { OR: [{ publishTo: null }, { publishTo: { gte: now } }] },
        { OR: [{ targetRole: "all" }, { targetRole: "driver" }] },
      ],
    },
    orderBy: { publishFrom: "desc" },
    take: 30,
  });

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-bold">📢 お知らせ</h1>

      {announcements.length === 0 ? (
        <div className="card card-body text-center text-gray-500 py-10">
          <p>お知らせはありません。</p>
        </div>
      ) : (
        <div className="card divide-y divide-gray-100">
          {announcements.map((a) => (
            <div key={a.id} className="px-4 py-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-gray-900">{a.title}</p>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {formatJst(a.publishFrom, "MM/DD")}
                </span>
              </div>
              <p className="text-sm text-gray-600 mt-2 leading-relaxed whitespace-pre-wrap">
                {a.body}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

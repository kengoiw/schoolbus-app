import { prisma } from "@/lib/prisma";
import { formatJst } from "@/lib/date";
import Link from "next/link";

export default async function GuardianAnnouncementsPage() {
  const now = new Date();
  const announcements = await prisma.announcement.findMany({
    where: {
      AND: [
        { publishFrom: { lte: now } },
        { OR: [{ publishTo: null }, { publishTo: { gte: now } }] },
        { OR: [{ targetRole: "all" }, { targetRole: "guardian" }] },
      ],
    },
    orderBy: { publishFrom: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">📢 お知らせ</h1>

      {announcements.length === 0 ? (
        <div className="card card-body text-center text-gray-500 py-10">
          <p>お知らせはありません。</p>
        </div>
      ) : (
        <div className="card divide-y divide-gray-100">
          {announcements.map((a) => (
            <Link
              key={a.id}
              href={`/guardian/announcements/${a.id}`}
              className="block px-4 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-gray-900 leading-relaxed">{a.title}</p>
                <span className="text-xs text-gray-400 whitespace-nowrap mt-0.5">
                  {formatJst(a.publishFrom, "MM/DD")}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1 line-clamp-2">{a.body}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

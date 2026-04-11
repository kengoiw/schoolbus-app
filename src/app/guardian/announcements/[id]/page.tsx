import { prisma } from "@/lib/prisma";
import { formatJst } from "@/lib/date";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function AnnouncementDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const announcement = await prisma.announcement.findUnique({
    where: { id: params.id },
    include: { createdBy: { select: { name: true } } },
  });

  const now = new Date();
  const isVisible =
    announcement &&
    announcement.publishFrom <= now &&
    (!announcement.publishTo || announcement.publishTo >= now) &&
    (announcement.targetRole === "all" || announcement.targetRole === "guardian");

  if (!announcement || !isVisible) notFound();

  return (
    <div className="space-y-4">
      <Link href="/guardian/announcements" className="text-sm text-blue-600 flex items-center gap-1">
        ← お知らせ一覧
      </Link>

      <div className="card card-body space-y-4">
        <div className="border-b pb-3">
          <h1 className="text-lg font-bold text-gray-900 leading-relaxed">
            {announcement.title}
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            {formatJst(announcement.publishFrom, "YYYY年MM月DD日")} 公開
            {announcement.createdBy && `｜${announcement.createdBy.name}`}
          </p>
        </div>
        <div className="text-sm text-gray-700 leading-7 whitespace-pre-wrap">
          {announcement.body}
        </div>
      </div>
    </div>
  );
}

import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function MastersPage() {
  const [schools, children, routes, stops, users] = await Promise.all([
    prisma.school.findMany({ orderBy: { name: "asc" } }),
    prisma.child.findMany({
      where: { status: "active" },
      include: { school: { select: { name: true } } },
      orderBy: [{ school: { name: "asc" } }, { grade: "asc" }, { name: "asc" }],
    }),
    prisma.route.findMany({
      where: { status: "active" },
      include: {
        school: { select: { name: true } },
        routeStops: { include: { stop: true }, orderBy: { stopOrder: "asc" } },
      },
    }),
    prisma.stop.findMany({ orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: { status: "active" },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
  ]);

  const roleLabel: Record<string, string> = {
    admin: "管理者", guardian: "保護者", driver: "ドライバー",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">マスタ管理</h1>
      <p className="text-sm text-gray-500">
        ※ マスタデータの変更は慎重に行ってください。変更はすべての運用に影響します。
      </p>

      {/* ユーザー一覧 */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold">👤 ユーザー一覧</h2>
          <span className="text-xs text-gray-400">{users.length}件</span>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>名前</th>
                <th>メールアドレス</th>
                <th>ロール</th>
                <th>電話番号</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="font-medium">{u.name}</td>
                  <td className="text-sm text-gray-600">{u.email}</td>
                  <td>
                    <span className={`badge-default text-xs ${u.role === "admin" ? "bg-purple-100 text-purple-700" : u.role === "driver" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}>
                      {roleLabel[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="text-sm text-gray-600">{u.phone ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 児童一覧 */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold">🧒 児童一覧</h2>
          <span className="text-xs text-gray-400">{children.length}件</span>
        </div>
        <div className="table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>氏名（かな）</th>
                <th>学校</th>
                <th>学年/組</th>
                <th>朝便</th>
                <th>帰便</th>
              </tr>
            </thead>
            <tbody>
              {children.map((c) => (
                <tr key={c.id}>
                  <td>
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-gray-400">{c.kana}</div>
                  </td>
                  <td className="text-xs text-gray-600">{c.school.name}</td>
                  <td className="text-sm">{c.grade}年{c.className}組</td>
                  <td>
                    <span className={`text-xs ${c.defaultMorningUse ? "text-green-600" : "text-gray-400"}`}>
                      {c.defaultMorningUse ? "利用" : "不要"}
                    </span>
                  </td>
                  <td>
                    <span className={`text-xs ${c.defaultEveningUse ? "text-green-600" : "text-gray-400"}`}>
                      {c.defaultEveningUse ? "利用" : "不要"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 路線一覧 */}
      <div className="card">
        <div className="card-header">
          <h2 className="font-semibold">🗺️ 路線・停留所</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {routes.map((route) => (
            <div key={route.id} className="px-4 py-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="font-medium">{route.name}</span>
                <span className="text-xs text-gray-400">{route.school.name}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {route.routeStops.map((rs, i) => (
                  <span key={rs.stopId} className="flex items-center gap-1 text-xs">
                    {i > 0 && <span className="text-gray-300">→</span>}
                    <span className="bg-gray-100 rounded px-2 py-0.5 text-gray-700">
                      {rs.stop.name}
                      {rs.plannedTime && <span className="text-gray-400 ml-1">({rs.plannedTime})</span>}
                    </span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 学校・停留所 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold">🏫 学校</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {schools.map((s) => (
              <div key={s.id} className="px-4 py-3 text-sm">{s.name}</div>
            ))}
          </div>
        </div>
        <div className="card">
          <div className="card-header">
            <h2 className="font-semibold">🚏 停留所</h2>
            <span className="text-xs text-gray-400">{stops.length}件</span>
          </div>
          <div className="divide-y divide-gray-100">
            {stops.map((s) => (
              <div key={s.id} className="px-4 py-3 text-sm">
                {s.name}
                {s.lat && s.lng && (
                  <span className="text-xs text-gray-400 ml-2">
                    ({s.lat.toFixed(4)}, {s.lng.toFixed(4)})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card card-body bg-yellow-50 border border-yellow-200">
        <p className="text-sm text-yellow-800">
          ⚠️ マスタデータの追加・編集・削除はデータベースまたは今後実装予定の管理フォームから行ってください。
          誤変更は運行情報に影響するため、変更前に必ずバックアップを取得してください。
        </p>
      </div>
    </div>
  );
}

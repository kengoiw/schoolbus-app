import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";


async function main() {
  console.log("🌱 Seedデータの投入を開始します...");

  // パスワードハッシュ（全員 "password123" に統一）
  const passwordHash = await bcrypt.hash("password123", 12);

  // =====================
  // 1. 学校
  // =====================
  const school = await prisma.school.upsert({
    where: { id: "school-001" },
    update: {},
    create: {
      id: "school-001",
      name: "小平町立小平中学校",
    },
  });
  console.log("✅ 学校:", school.name);

  // =====================
  // 2. 停留所
  // =====================
  const stops = await Promise.all([
    prisma.stop.upsert({
      where: { id: "stop-001" },
      update: {},
      create: { id: "stop-001", name: "小平駅前", lat: 44.0320, lng: 141.6430 },
    }),
    prisma.stop.upsert({
      where: { id: "stop-002" },
      update: {},
      create: { id: "stop-002", name: "小平中央公民館前", lat: 44.0310, lng: 141.6410 },
    }),
    prisma.stop.upsert({
      where: { id: "stop-003" },
      update: {},
      create: { id: "stop-003", name: "達布地区センター", lat: 44.0280, lng: 141.6500 },
    }),
    prisma.stop.upsert({
      where: { id: "stop-004" },
      update: {},
      create: { id: "stop-004", name: "鬼鹿地区センター", lat: 44.0200, lng: 141.6350 },
    }),
    prisma.stop.upsert({
      where: { id: "stop-005" },
      update: {},
      create: { id: "stop-005", name: "幌地区集会所", lat: 44.0150, lng: 141.6600 },
    }),
  ]);
  console.log(`✅ 停留所: ${stops.length}件`);

  // =====================
  // 3. 路線
  // =====================
  const route1 = await prisma.route.upsert({
    where: { id: "route-001" },
    update: {},
    create: {
      id: "route-001",
      schoolId: school.id,
      name: "中央ルート",
      status: "active",
    },
  });

  const route2 = await prisma.route.upsert({
    where: { id: "route-002" },
    update: {},
    create: {
      id: "route-002",
      schoolId: school.id,
      name: "達布・鬼鹿ルート",
      status: "active",
    },
  });
  console.log("✅ 路線: 2件");

  // 路線-停留所 関連
  await prisma.routeStop.upsert({
    where: { routeId_stopId: { routeId: route1.id, stopId: stops[0].id } },
    update: {},
    create: { routeId: route1.id, stopId: stops[0].id, stopOrder: 1, plannedTime: "07:30" },
  });
  await prisma.routeStop.upsert({
    where: { routeId_stopId: { routeId: route1.id, stopId: stops[1].id } },
    update: {},
    create: { routeId: route1.id, stopId: stops[1].id, stopOrder: 2, plannedTime: "07:40" },
  });
  await prisma.routeStop.upsert({
    where: { routeId_stopId: { routeId: route2.id, stopId: stops[2].id } },
    update: {},
    create: { routeId: route2.id, stopId: stops[2].id, stopOrder: 1, plannedTime: "07:20" },
  });
  await prisma.routeStop.upsert({
    where: { routeId_stopId: { routeId: route2.id, stopId: stops[3].id } },
    update: {},
    create: { routeId: route2.id, stopId: stops[3].id, stopOrder: 2, plannedTime: "07:35" },
  });
  await prisma.routeStop.upsert({
    where: { routeId_stopId: { routeId: route2.id, stopId: stops[4].id } },
    update: {},
    create: { routeId: route2.id, stopId: stops[4].id, stopOrder: 3, plannedTime: "07:45" },
  });

  // =====================
  // 4. ユーザー
  // =====================

  // 管理者
  const admin = await prisma.user.upsert({
    where: { email: "admin@kodaira.lg.jp" },
    update: {},
    create: {
      id: "user-admin-001",
      email: "admin@kodaira.lg.jp",
      name: "小平 太郎（管理者）",
      role: "admin",
      passwordHash,
      phone: "0164-56-0001",
      status: "active",
    },
  });
  console.log("✅ 管理者:", admin.email);

  // ドライバー
  const driver1 = await prisma.user.upsert({
    where: { email: "driver1@kodaira.lg.jp" },
    update: {},
    create: {
      id: "user-driver-001",
      email: "driver1@kodaira.lg.jp",
      name: "田中 一郎（ドライバー）",
      role: "driver",
      passwordHash,
      phone: "090-0001-0001",
      status: "active",
    },
  });

  const driver2 = await prisma.user.upsert({
    where: { email: "driver2@kodaira.lg.jp" },
    update: {},
    create: {
      id: "user-driver-002",
      email: "driver2@kodaira.lg.jp",
      name: "鈴木 二郎（ドライバー）",
      role: "driver",
      passwordHash,
      phone: "090-0002-0002",
      status: "active",
    },
  });
  console.log("✅ ドライバー: 2名");

  // 保護者
  const guardian1 = await prisma.user.upsert({
    where: { email: "guardian1@example.com" },
    update: {},
    create: {
      id: "user-guardian-001",
      email: "guardian1@example.com",
      name: "山田 花子（保護者）",
      role: "guardian",
      passwordHash,
      phone: "090-1111-1111",
      status: "active",
    },
  });

  const guardian2 = await prisma.user.upsert({
    where: { email: "guardian2@example.com" },
    update: {},
    create: {
      id: "user-guardian-002",
      email: "guardian2@example.com",
      name: "佐藤 信雄（保護者）",
      role: "guardian",
      passwordHash,
      phone: "090-2222-2222",
      status: "active",
    },
  });
  console.log("✅ 保護者: 2名");

  // =====================
  // 5. 児童
  // =====================
  const child1 = await prisma.child.upsert({
    where: { id: "child-001" },
    update: {},
    create: {
      id: "child-001",
      schoolId: school.id,
      name: "山田 太郎",
      kana: "やまだ たろう",
      grade: 1,
      className: "A",
      defaultMorningUse: true,
      defaultEveningUse: true,
      defaultMorningRouteId: route1.id,
      defaultMorningStopId: stops[0].id,
      defaultEveningRouteId: route1.id,
      defaultEveningStopId: stops[0].id,
      status: "active",
    },
  });

  const child2 = await prisma.child.upsert({
    where: { id: "child-002" },
    update: {},
    create: {
      id: "child-002",
      schoolId: school.id,
      name: "山田 花太郎",
      kana: "やまだ はなたろう",
      grade: 2,
      className: "B",
      defaultMorningUse: true,
      defaultEveningUse: false,
      defaultMorningRouteId: route1.id,
      defaultMorningStopId: stops[1].id,
      defaultEveningRouteId: null,
      defaultEveningStopId: null,
      status: "active",
    },
  });

  const child3 = await prisma.child.upsert({
    where: { id: "child-003" },
    update: {},
    create: {
      id: "child-003",
      schoolId: school.id,
      name: "佐藤 次郎",
      kana: "さとう じろう",
      grade: 3,
      className: "A",
      defaultMorningUse: true,
      defaultEveningUse: true,
      defaultMorningRouteId: route2.id,
      defaultMorningStopId: stops[2].id,
      defaultEveningRouteId: route2.id,
      defaultEveningStopId: stops[2].id,
      status: "active",
    },
  });
  console.log("✅ 児童: 3名");

  // =====================
  // 6. 保護者-児童 関連
  // =====================
  await prisma.guardianChild.upsert({
    where: { guardianUserId_childId: { guardianUserId: guardian1.id, childId: child1.id } },
    update: {},
    create: { guardianUserId: guardian1.id, childId: child1.id, relationship: "母" },
  });
  await prisma.guardianChild.upsert({
    where: { guardianUserId_childId: { guardianUserId: guardian1.id, childId: child2.id } },
    update: {},
    create: { guardianUserId: guardian1.id, childId: child2.id, relationship: "母" },
  });
  await prisma.guardianChild.upsert({
    where: { guardianUserId_childId: { guardianUserId: guardian2.id, childId: child3.id } },
    update: {},
    create: { guardianUserId: guardian2.id, childId: child3.id, relationship: "父" },
  });

  // =====================
  // 7. 運行日（今日）
  // =====================
  // JSTで今日の日付を取得
  const jstOffset = 9 * 60 * 60 * 1000;
  const todayJst = new Date(Date.now() + jstOffset);
  todayJst.setUTCHours(0, 0, 0, 0);
  const todayDate = new Date(todayJst.getTime() - jstOffset);

  // 朝便締切: 今日の7:30 JST
  const morningDeadline = new Date(todayDate.getTime() + jstOffset + (7 * 60 + 30) * 60000 - jstOffset);
  // 帰り便締切: 今日の15:00 JST
  const eveningDeadline = new Date(todayDate.getTime() + jstOffset + (15 * 60) * 60000 - jstOffset);

  const operationDay = await prisma.operationDay.upsert({
    where: { schoolId_operationDate: { schoolId: school.id, operationDate: todayDate } },
    update: {},
    create: {
      id: "opday-001",
      schoolId: school.id,
      operationDate: todayDate,
      status: "normal",
      morningDeadlineAt: morningDeadline,
      eveningDeadlineAt: eveningDeadline,
      note: "通常運行",
    },
  });
  console.log("✅ 運行日（今日）: 設定完了");

  // =====================
  // 8. 日次連絡（サンプル）
  // =====================
  await prisma.dailyContact.upsert({
    where: { childId_operationDayId: { childId: child1.id, operationDayId: operationDay.id } },
    update: {},
    create: {
      childId: child1.id,
      operationDayId: operationDay.id,
      attendanceStatus: "attend",
      morningUseType: "use",
      eveningUseType: "use",
      source: "app",
      submittedByUserId: guardian1.id,
      submittedAt: new Date(),
      afterDeadlineFlag: false,
    },
  });

  await prisma.dailyContact.upsert({
    where: { childId_operationDayId: { childId: child3.id, operationDayId: operationDay.id } },
    update: {},
    create: {
      childId: child3.id,
      operationDayId: operationDay.id,
      attendanceStatus: "absent",
      morningUseType: "not_use",
      eveningUseType: "not_use",
      note: "体調不良のため欠席",
      source: "phone",
      submittedByUserId: admin.id,
      receivedByUserId: admin.id,
      submittedAt: new Date(),
      afterDeadlineFlag: true,
    },
  });
  console.log("✅ 日次連絡: 2件");

  // =====================
  // 9. 便（トリップ）サンプル
  // =====================
  const trip1 = await prisma.trip.upsert({
    where: { id: "trip-001" },
    update: {},
    create: {
      id: "trip-001",
      operationDayId: operationDay.id,
      routeId: route1.id,
      segment: "morning",
      driverUserId: driver1.id,
      status: "confirmed",
    },
  });

  // trip_passengers
  await prisma.tripPassenger.upsert({
    where: { tripId_childId: { tripId: trip1.id, childId: child1.id } },
    update: {},
    create: {
      tripId: trip1.id,
      childId: child1.id,
      stopId: stops[0].id,
      expectedBoarding: true,
      boardingStatus: "expected",
    },
  });
  await prisma.tripPassenger.upsert({
    where: { tripId_childId: { tripId: trip1.id, childId: child2.id } },
    update: {},
    create: {
      tripId: trip1.id,
      childId: child2.id,
      stopId: stops[1].id,
      expectedBoarding: true,
      boardingStatus: "expected",
    },
  });

  // route2 のドライバー2便
  const trip2 = await prisma.trip.upsert({
    where: { id: "trip-002" },
    update: {},
    create: {
      id: "trip-002",
      operationDayId: operationDay.id,
      routeId: route2.id,
      segment: "morning",
      driverUserId: driver2.id,
      status: "planned",
    },
  });
  console.log("✅ 便: 2件");

  // =====================
  // 10. お知らせ
  // =====================
  const now = new Date();
  await prisma.announcement.upsert({
    where: { id: "ann-001" },
    update: {},
    create: {
      id: "ann-001",
      title: "【重要】4月の運行スケジュールについて",
      body: "4月の運行スケジュールをWebシステムで公開しました。ご確認ください。\n\n・朝便締切: 毎日 7:30\n・帰り便締切: 毎日 15:00\n\n上記時刻以降の変更はお電話でご連絡ください。",
      targetRole: "guardian",
      targetSchoolId: school.id,
      publishFrom: now,
      publishTo: null,
      createdByUserId: admin.id,
    },
  });

  await prisma.announcement.upsert({
    where: { id: "ann-002" },
    update: {},
    create: {
      id: "ann-002",
      title: "スクールバス乗車連絡アプリの利用開始について",
      body: "本日よりスクールバス乗車連絡アプリの運用を開始します。\n\nアプリからの連絡締切後は、従来通りお電話でご連絡ください。\n\nご不明な点は学校までお問い合わせください。",
      targetRole: "all",
      publishFrom: now,
      publishTo: null,
      createdByUserId: admin.id,
    },
  });

  await prisma.announcement.upsert({
    where: { id: "ann-003" },
    update: {},
    create: {
      id: "ann-003",
      title: "【ドライバー向け】4月の担当ルートについて",
      body: "4月の担当ルートを更新しました。アプリにてご確認ください。",
      targetRole: "driver",
      publishFrom: now,
      publishTo: null,
      createdByUserId: admin.id,
    },
  });
  console.log("✅ お知らせ: 3件");

  console.log("\n✨ Seedデータの投入が完了しました！");
  console.log("\n📋 テスト用ログイン情報（パスワード共通: password123）");
  console.log("  管理者: admin@kodaira.lg.jp");
  console.log("  ドライバー1: driver1@kodaira.lg.jp");
  console.log("  ドライバー2: driver2@kodaira.lg.jp");
  console.log("  保護者1: guardian1@example.com");
  console.log("  保護者2: guardian2@example.com");
}

main()
  .catch((e) => {
    console.error("❌ Seedエラー:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

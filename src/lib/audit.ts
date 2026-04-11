import { prisma } from "@/lib/prisma";

export type AuditAction = "CREATE" | "UPDATE" | "DELETE";

interface AuditOptions {
  entityType: string;
  entityId: string;
  action: AuditAction;
  beforeJson?: object | null;
  afterJson?: object | null;
  actedByUserId: string;
}

/**
 * 監査ログを記録する
 */
export async function createAuditLog(opts: AuditOptions): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        entityType: opts.entityType,
        entityId: opts.entityId,
        action: opts.action,
        beforeJson: opts.beforeJson ?? undefined,
        afterJson: opts.afterJson ?? undefined,
        actedByUserId: opts.actedByUserId,
      },
    });
  } catch (err) {
    // 監査ログ記録失敗でもメイン処理は止めない
    console.error("[AuditLog] Failed to create audit log:", err);
  }
}

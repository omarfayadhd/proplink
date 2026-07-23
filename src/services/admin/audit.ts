import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

/** Every admin mutation writes an AuditLog row (sprint plan, Task 1.6). */
export async function writeAudit(params: {
  actorUserId: string;
  action: string;
  entity: string;
  entityId: string;
  meta?: Prisma.InputJsonValue;
}) {
  await db.auditLog.create({
    data: {
      actorUserId: params.actorUserId,
      action: params.action,
      entity: params.entity,
      entityId: params.entityId,
      metaJson: params.meta,
    },
  });
}

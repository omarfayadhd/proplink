import { db } from "@/lib/db";
import type { Role } from "@/generated/prisma/enums";
import { writeAudit } from "@/services/admin/audit";

const PAGE_SIZE = 20;

export async function listUsers(params: { q?: string; role?: Role; page?: number }) {
  const page = Math.max(1, params.page ?? 1);
  const where = {
    ...(params.role ? { role: params.role } : {}),
    ...(params.q
      ? {
          OR: [
            { email: { contains: params.q, mode: "insensitive" as const } },
            { name: { contains: params.q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    db.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        kycStatus: true,
        active: true,
        createdAt: true,
      },
    }),
    db.user.count({ where }),
  ]);

  return { users, total, page, pageSize: PAGE_SIZE };
}

export async function setUserActive(params: {
  actorUserId: string;
  userId: string;
  active: boolean;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  if (params.actorUserId === params.userId) {
    return { ok: false, error: "You cannot deactivate your own account" };
  }

  const user = await db.user.findUnique({ where: { id: params.userId } });
  if (!user) return { ok: false, error: "User not found" };

  await db.user.update({
    where: { id: params.userId },
    data: { active: params.active },
  });
  await writeAudit({
    actorUserId: params.actorUserId,
    action: params.active ? "USER_REACTIVATED" : "USER_DEACTIVATED",
    entity: "User",
    entityId: params.userId,
    meta: { email: user.email },
  });

  return { ok: true };
}

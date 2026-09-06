import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { listUsers, setUserActive } from "@/services/admin/users";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { KycPill } from "@/components/layout/KycPill";
import type { Role } from "@/generated/prisma/enums";

export const metadata = { title: "Admin — Users" };

const ROLES: Role[] = ["AGENT", "INVESTOR", "BUYER", "ADMIN"];

async function toggleActive(formData: FormData) {
  "use server";
  const authz = await requireRole("ADMIN");
  if (!authz.ok) return;

  await setUserActive({
    actorUserId: authz.session.user.id,
    userId: String(formData.get("userId")),
    active: formData.get("nextActive") === "true",
  });
  revalidatePath("/admin");
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; page?: string }>;
}) {
  const params = await searchParams;
  const role = ROLES.includes(params.role as Role) ? (params.role as Role) : undefined;
  const { users, total, page, pageSize } = await listUsers({
    q: params.q,
    role,
    page: params.page ? Number(params.page) : 1,
  });
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-4">
      <form method="get" className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="q" className="block text-xs font-medium text-muted">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="email or name"
            className="mt-1 rounded-md border border-line px-3 py-2 text-sm focus:border-accent focus:outline-none"
          />
        </div>
        <div>
          <label htmlFor="role" className="block text-xs font-medium text-muted">
            Role
          </label>
          <select
            id="role"
            name="role"
            defaultValue={role ?? ""}
            className="mt-1 rounded-md border border-line bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
          >
            <option value="">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-accent"
        >
          Filter
        </button>
      </form>

      <DataTable
        rows={users}
        rowKey={(u) => u.id}
        emptyMessage="No users match"
        columns={[
          {
            key: "user",
            header: "User",
            render: (u) => (
              <div>
                <div className="font-medium text-body">{u.name}</div>
                <div className="text-xs text-muted">{u.email}</div>
              </div>
            ),
          },
          { key: "role", header: "Role", render: (u) => <Badge>{u.role}</Badge> },
          { key: "kyc", header: "KYC", render: (u) => <KycPill status={u.kycStatus} /> },
          {
            key: "status",
            header: "Status",
            render: (u) =>
              u.active ? (
                <Badge tone="success">Active</Badge>
              ) : (
                <Badge tone="danger">Deactivated</Badge>
              ),
          },
          {
            key: "joined",
            header: "Joined",
            render: (u) => u.createdAt.toISOString().slice(0, 10),
          },
          {
            key: "actions",
            header: "",
            render: (u) => (
              <form action={toggleActive}>
                <input type="hidden" name="userId" value={u.id} />
                <input type="hidden" name="nextActive" value={String(!u.active)} />
                <button
                  type="submit"
                  className={
                    u.active
                      ? "text-sm font-medium text-danger hover:underline"
                      : "text-sm font-medium text-success hover:underline"
                  }
                >
                  {u.active ? "Deactivate" : "Reactivate"}
                </button>
              </form>
            ),
          },
        ]}
      />

      <p className="text-xs text-muted">
        {total} user{total === 1 ? "" : "s"} · page {page} of {pages}
      </p>
    </div>
  );
}

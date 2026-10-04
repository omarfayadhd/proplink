import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/authz";
import { createAgent, mailerIsConsoleOnly } from "@/services/admin/agents";

export const metadata = { title: "Admin — Add agent" };

const FIELD =
  "mt-1 w-full rounded-md border border-line px-3 py-2 text-sm focus:border-accent focus:outline-none";

async function submit(formData: FormData) {
  "use server";
  const authz = await requireRole("ADMIN");
  if (!authz.ok) redirect("/403");

  const result = await createAgent({
    actorUserId: authz.session.user.id,
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
    agencyName: String(formData.get("agencyName") ?? ""),
    complianceCode: String(formData.get("complianceCode") ?? ""),
  });

  if (!result.ok) {
    redirect(`/admin/agents/new?error=${encodeURIComponent(result.error)}`);
  }

  revalidatePath("/admin");
  // The invite link is only echoed back while the mailer is console-only
  // (H1.7) — otherwise the agent's own inbox is the only place it appears.
  redirect(
    mailerIsConsoleOnly()
      ? `/admin/agents/new?created=${encodeURIComponent(result.inviteUrl)}`
      : "/admin?created=agent",
  );
}

export default async function NewAgentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="max-w-xl space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-primary">Add an agent</h2>
        <p className="mt-1 text-sm text-muted">
          Agent accounts are not self-serve. This creates the account and its agency
          profile, then emails the agent a link to set their own password — no password is
          handled here.
        </p>
      </div>

      {params.error && (
        <p
          role="alert"
          data-testid="agent-form-error"
          className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
        >
          {params.error}
        </p>
      )}

      {params.created && (
        <div className="rounded-xl bg-success/10 px-4 py-3 text-sm text-body">
          <p className="font-medium text-success">Agent created — invite sent.</p>
          <p className="mt-1 text-muted">
            Email delivery is mocked locally (H1.7), so the invite link is shown here
            instead. It expires in 7 days.
          </p>
          <code className="mt-2 block break-all rounded-md bg-white px-2 py-1 text-xs">
            {params.created}
          </code>
        </div>
      )}

      <form action={submit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-xs font-medium text-muted">
            Full name
          </label>
          <input id="name" name="name" required className={FIELD} />
        </div>
        <div>
          <label htmlFor="email" className="block text-xs font-medium text-muted">
            Email
          </label>
          <input id="email" name="email" type="email" required className={FIELD} />
        </div>
        <div>
          <label htmlFor="agencyName" className="block text-xs font-medium text-muted">
            Agency name
          </label>
          <input id="agencyName" name="agencyName" required className={FIELD} />
        </div>
        <div>
          <label
            htmlFor="complianceCode"
            className="block text-xs font-medium text-muted"
          >
            Compliance code
          </label>
          <input id="complianceCode" name="complianceCode" required className={FIELD} />
          <p className="mt-1 text-xs text-muted">
            The agency&rsquo;s redress-scheme or regulator reference. Must be unique.
          </p>
        </div>

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-accent"
          >
            Create agent and send invite
          </button>
          <Link href="/admin" className="text-sm text-muted hover:text-primary">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

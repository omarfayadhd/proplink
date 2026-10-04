import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { listThreads } from "@/services/chat/chatService";
import { BuyerEmpty } from "@/components/buy/BuyerShell";

export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function MessagesPage() {
  const session = await auth();
  const user = session?.user;
  if (!user) redirect("/login");
  if (!["BUYER", "ADMIN"].includes(user.role)) redirect("/403");

  const threads = await listThreads(user.id);

  return (
    <>
      {/* Honest about what this is. Task 5.7 specifies live channels; Pusher is
          H4.2 and not provisioned, so the thread is real but does not push. */}
      <p className="rounded-xl border border-line bg-surface px-5 py-4 text-sm text-muted">
        Messages are saved and delivered, but do not yet update live — refresh to see new
        replies. Live messaging arrives with the realtime service.
      </p>

      {threads.length === 0 ? (
        <div className="mt-8">
          <BuyerEmpty
            title="No conversations yet"
            action={
              <Link
                href="/buy"
                className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-accent"
              >
                Find a property
              </Link>
            }
          >
            Message an agent from any live listing to start one.
          </BuyerEmpty>
        </div>
      ) : (
        <ul className="mt-8 border-t border-line">
          {threads.map((t) => (
            <li key={t.propertyId} className="border-b border-line py-4">
              <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <Link
                  href={`/marketplace/${t.propertyId}`}
                  className="font-medium text-primary underline decoration-line underline-offset-4 hover:decoration-accent"
                >
                  {t.title}
                </Link>
                <span className="flex items-baseline gap-4 text-xs text-muted">
                  {t.unread > 0 ? (
                    <span className="rounded-full bg-accent px-2 py-0.5 font-semibold text-white">
                      {t.unread} new
                    </span>
                  ) : null}
                  <span>{DATE.format(t.at)}</span>
                </span>
              </div>
              <p className="mt-1 line-clamp-1 text-sm text-muted">{t.last}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

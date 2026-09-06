"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

async function parseErrorMessage(res: Response): Promise<string> {
  const data = await res.json().catch(() => null);
  if (data?.issues) {
    const first = Object.values(data.issues as Record<string, string[]>).flat()[0];
    if (first) return first;
  }
  return data?.error ?? `Request failed (${res.status})`;
}

interface EnquiryFormProps {
  propertyId: string;
  sessionUser: { name: string; email: string } | null;
}

/**
 * Public `/marketplace/[id]` "Post Enquiry" form (Task 2.5 brief). `Enquiry.
 * fromUserId` is a required column (`prisma/schema.prisma`) — there is no
 * anonymous-enquiry path, so a logged-out visitor sees a login prompt instead
 * of the form (mirrors `/agents/[id]`'s `<AppraisalForm>` not-logged-in
 * pattern). The "name" field the brief describes is read-only, sourced from
 * the session (there is nowhere to persist an edited one — the account IS
 * the identity behind `fromUserId`); `contactPhone` is the one genuinely
 * optional/editable extra, folded into the stored message server-side
 * (`enquiryService.ts`) since `Enquiry` has no dedicated column for it.
 */
export function EnquiryForm({ propertyId, sessionUser }: EnquiryFormProps) {
  const toast = useToast();
  const [message, setMessage] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!sessionUser) {
    return (
      <div className="rounded-lg border border-line bg-white p-4 text-sm text-muted">
        <Link href="/login" className="text-accent underline">
          Log in
        </Link>{" "}
        to contact the agent about this property.
      </div>
    );
  }

  const canSubmit = message.trim().length >= 10;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId,
          message: message.trim(),
          ...(contactPhone.trim() ? { contactPhone: contactPhone.trim() } : {}),
        }),
      });
      if (!res.ok) {
        setError(await parseErrorMessage(res));
        return;
      }
      toast("Enquiry sent", "success");
      setMessage("");
      setContactPhone("");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-label="Post enquiry"
      className="max-w-lg space-y-3 rounded-lg border border-line bg-white p-4"
    >
      <div>
        <span className="block text-xs font-medium uppercase tracking-wide text-muted">
          From
        </span>
        <p className="mt-0.5 text-sm text-body">
          {sessionUser.name} &lt;{sessionUser.email}&gt;
        </p>
      </div>

      <div>
        <label htmlFor="enquiry-message" className="block text-sm font-medium text-body">
          Message
        </label>
        <textarea
          id="enquiry-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          required
          placeholder="I'd like to know more about this property…"
          className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="enquiry-phone" className="block text-sm font-medium text-body">
          Contact phone <span className="font-normal text-muted">(optional)</span>
        </label>
        <input
          id="enquiry-phone"
          type="tel"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          placeholder="07700 900123"
          className="mt-1 w-full rounded-md border border-line bg-white px-3 py-2 text-sm focus:border-accent focus:outline-none"
        />
      </div>

      {error && (
        <p role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}

      <Button type="submit" disabled={!canSubmit || submitting}>
        {submitting ? "Sending…" : "Post enquiry"}
      </Button>
    </form>
  );
}

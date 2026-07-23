"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";

const STORAGE_KEY = "proplink-cookie-consent"; // "accepted" | "essential"
const CHANGE_EVENT = "proplink-consent-change";

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  return () => window.removeEventListener(CHANGE_EVENT, callback);
}

const getSnapshot = () => localStorage.getItem(STORAGE_KEY);
// During SSR pretend a choice exists so the banner only appears after hydration.
const getServerSnapshot = () => "ssr";

export function CookieBanner() {
  const consent = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (consent) return null;

  function choose(value: "accepted" | "essential") {
    localStorage.setItem(STORAGE_KEY, value);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-primary px-6 py-4 text-white">
      <div className="mx-auto flex max-w-6xl flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm">
          We use essential cookies to run PropLink UK. Analytics cookies are only set with
          your consent.{" "}
          <Link href="/privacy" className="underline">
            Privacy policy
          </Link>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => choose("essential")}
            className="rounded-md border border-white/40 px-4 py-2 text-sm font-medium hover:bg-white/10"
          >
            Essential only
          </button>
          <button
            onClick={() => choose("accepted")}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold hover:opacity-90"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}

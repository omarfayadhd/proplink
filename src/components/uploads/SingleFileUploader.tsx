"use client";

import { useRef, useState } from "react";
import { cn } from "@/lib/cn";
import type { UploadKind } from "@/services/storage/types";
import {
  ALLOWED_IMAGE_TYPES,
  ALLOWED_PDF_TYPES,
  MAX_IMAGE_BYTES,
  MAX_PDF_BYTES,
} from "@/services/storage/validation";

export interface SingleFileUploaderProps {
  /**
   * Which presign kind(s) (Task 2.1's POST /api/uploads/presign) this field
   * accepts. `kind` is resolved per-file from its mime type — e.g. `["image",
   * "pdf"]` for an EPC certificate that may be scanned as either.
   */
  kinds: UploadKind[];
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  className?: string;
}

const ACCEPT_BY_KIND: Record<UploadKind, readonly string[]> = {
  image: ALLOWED_IMAGE_TYPES,
  pdf: ALLOWED_PDF_TYPES,
};

const MAX_BYTES_BY_KIND: Record<UploadKind, number> = {
  image: MAX_IMAGE_BYTES,
  pdf: MAX_PDF_BYTES,
};

function resolveKindForFile(file: File, kinds: UploadKind[]): UploadKind | null {
  return kinds.find((k) => ACCEPT_BY_KIND[k].includes(file.type as never)) ?? null;
}

/**
 * Single-file presigned upload (EPC certificate / floor plan) — a lighter
 * sibling of `<ImageUploader>` (Task 2.1) for the one-file, image-and/or-PDF
 * case that component doesn't cover.
 */
export function SingleFileUploader({
  kinds,
  value,
  onChange,
  label,
  className,
}: SingleFileUploaderProps) {
  const [status, setStatus] = useState<"idle" | "uploading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const allowedTypes = kinds.flatMap((k) => ACCEPT_BY_KIND[k]);

  async function upload(file: File) {
    const kind = resolveKindForFile(file, kinds);
    if (!kind) {
      setError(
        kinds.includes("image")
          ? "Use a PDF, JPEG, PNG or WebP"
          : "Unsupported file type — use PDF",
      );
      setStatus("error");
      return;
    }
    const maxBytes = MAX_BYTES_BY_KIND[kind];
    if (file.size > maxBytes) {
      setStatus("error");
      setError(`File is too large — max ${maxBytes / (1024 * 1024)}MB`);
      return;
    }

    setStatus("uploading");
    setError(null);
    try {
      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          contentType: file.type,
          sizeBytes: file.size,
          filename: file.name,
        }),
      });
      if (!presignRes.ok) {
        const data = await presignRes.json().catch(() => null);
        throw new Error(data?.error ?? "Could not start upload");
      }
      const presigned = (await presignRes.json()) as {
        uploadUrl: string;
        fields: Record<string, string>;
        fileFieldName: string;
        publicUrl: string;
      };

      const form = new FormData();
      for (const [key, val] of Object.entries(presigned.fields)) form.append(key, val);
      form.append(presigned.fileFieldName, file);

      const uploadRes = await fetch(presigned.uploadUrl, { method: "POST", body: form });
      if (!uploadRes.ok) throw new Error("Upload failed — please try again");

      setStatus("idle");
      onChange(presigned.publicUrl);
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  return (
    <div className={className}>
      {label && <p className="text-sm font-medium text-body">{label}</p>}
      <div className="mt-1 flex flex-wrap items-center gap-3">
        {value ? (
          <>
            <a
              href={value}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-accent underline"
            >
              View uploaded file
            </a>
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setStatus("idle");
                setError(null);
              }}
              className="text-xs font-semibold text-danger hover:underline"
            >
              Remove
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={status === "uploading"}
            className={cn(
              "rounded-md border border-line bg-white px-3 py-1.5 text-sm font-medium text-secondary hover:border-accent disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {status === "uploading" ? "Uploading…" : "Upload file"}
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={allowedTypes.join(",")}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
            e.target.value = "";
          }}
        />
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

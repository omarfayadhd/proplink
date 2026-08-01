"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Badge } from "@/components/ui/badge";
import { reorderImages } from "@/components/uploads/reorder";
import type { UploadedImage } from "@/components/uploads/types";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES } from "@/services/storage/validation";

export type { UploadedImage } from "@/components/uploads/types";

export interface ImageUploaderProps {
  value: UploadedImage[];
  onChange: (next: UploadedImage[]) => void;
  /** Maximum number of images (persisted + in-flight). Default 20. */
  max?: number;
  className?: string;
}

interface PendingUpload {
  id: string;
  file: File;
  previewUrl: string;
  status: "uploading" | "error";
  error?: string;
}

const MAX_IMAGE_MB = MAX_IMAGE_BYTES / (1024 * 1024);

function isSameImages(a: UploadedImage[], b: UploadedImage[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((img, i) => img.url === b[i].url && img.sortOrder === b[i].sortOrder);
}

function clientValidate(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
    return "Unsupported file type — use JPEG, PNG or WebP";
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `File is too large — max ${MAX_IMAGE_MB}MB`;
  }
  return null;
}

/**
 * Drag-drop + click-to-browse image uploader. Presigns via
 * POST /api/uploads/presign (StorageService — mock in local dev, S3 once
 * H1.4/H2.1 land), uploads directly to the returned target, then reports
 * `{ url, sortOrder }[]` through `onChange`.
 *
 * Semi-controlled: `value` seeds the initial list (and resyncs if the parent
 * replaces it with genuinely different content, e.g. loading a draft after
 * mount); all user-driven mutations — add/remove/reorder — flow outward via
 * `onChange` from internal state, so concurrent upload completions never
 * clobber each other.
 */
export function ImageUploader({
  value,
  onChange,
  max = 20,
  className,
}: ImageUploaderProps) {
  const [images, setImages] = useState<UploadedImage[]>(value);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const dragImageIndex = useRef<number | null>(null);
  const imagesRef = useRef(images);
  const lastExternalValue = useRef(value);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isSameImages(value, lastExternalValue.current)) {
      lastExternalValue.current = value;
      imagesRef.current = value;
      setImages(value);
    }
  }, [value]);

  useEffect(
    () => () => {
      // Revoke any outstanding preview object URLs on unmount.
      for (const p of pending) URL.revokeObjectURL(p.previewUrl);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  function commit(next: UploadedImage[]) {
    imagesRef.current = next;
    lastExternalValue.current = next;
    setImages(next);
    onChange(next);
  }

  function slotsRemaining() {
    return max - imagesRef.current.length - pending.length;
  }

  async function uploadOne(file: File, id: string) {
    try {
      const presignRes = await fetch("/api/uploads/presign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "image",
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

      setPending((prev) => {
        const item = prev.find((p) => p.id === id);
        if (item) URL.revokeObjectURL(item.previewUrl);
        return prev.filter((p) => p.id !== id);
      });
      const current = imagesRef.current;
      commit([...current, { url: presigned.publicUrl, sortOrder: current.length }]);
    } catch (err) {
      setPending((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                status: "error",
                error: err instanceof Error ? err.message : "Upload failed",
              }
            : p,
        ),
      );
    }
  }

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).slice(0, Math.max(0, slotsRemaining()));

    const accepted: PendingUpload[] = [];
    for (const file of files) {
      const clientError = clientValidate(file);
      const id = crypto.randomUUID();
      const previewUrl = URL.createObjectURL(file);
      if (clientError) {
        accepted.push({ id, file, previewUrl, status: "error", error: clientError });
      } else {
        accepted.push({ id, file, previewUrl, status: "uploading" });
      }
    }
    setPending((prev) => [...prev, ...accepted]);
    for (const item of accepted) {
      if (item.status === "uploading") void uploadOne(item.file, item.id);
    }
  }

  function removeImage(url: string) {
    commit(
      imagesRef.current
        .filter((i) => i.url !== url)
        .map((i, idx) => ({ ...i, sortOrder: idx })),
    );
  }

  function removePending(id: string) {
    setPending((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  function retryPending(id: string) {
    const item = pending.find((p) => p.id === id);
    if (!item) return;
    setPending((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, status: "uploading", error: undefined } : p,
      ),
    );
    void uploadOne(item.file, id);
  }

  function onThumbDragStart(index: number, e: React.DragEvent) {
    dragImageIndex.current = index;
    // Some browsers (Firefox) only fire drop if dragstart set some data.
    e.dataTransfer.setData("text/plain", String(index));
    e.dataTransfer.effectAllowed = "move";
  }

  function onThumbDrop(index: number) {
    const from = dragImageIndex.current;
    dragImageIndex.current = null;
    if (from === null || from === index) return;
    commit(reorderImages(imagesRef.current, from, index));
  }

  const atCapacity = slotsRemaining() <= 0;

  return (
    <div className={className}>
      <div
        role="button"
        tabIndex={0}
        aria-disabled={atCapacity}
        onClick={() => !atCapacity && fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !atCapacity)
            fileInputRef.current?.click();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!atCapacity) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!atCapacity) handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors",
          atCapacity
            ? "cursor-not-allowed border-line bg-surface text-muted"
            : "cursor-pointer border-line bg-white text-muted hover:border-accent",
          dragOver && !atCapacity && "border-accent bg-pale",
        )}
      >
        <p className="text-sm font-medium text-body">
          {atCapacity
            ? `Maximum ${max} images reached`
            : "Drag photos here, or click to browse"}
        </p>
        <p className="text-xs text-muted">
          JPEG, PNG or WebP — up to {MAX_IMAGE_MB}MB each —{" "}
          {images.length + pending.length}/{max}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(",")}
          multiple
          className="sr-only"
          disabled={atCapacity}
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {(images.length > 0 || pending.length > 0) && (
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {images.map((img, index) => (
            <li
              key={img.url}
              draggable
              onDragStart={(e) => onThumbDragStart(index, e)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => onThumbDrop(index)}
              className="group relative aspect-[4/3] cursor-grab overflow-hidden rounded-md border border-line bg-surface active:cursor-grabbing"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={`Property photo ${index + 1}`}
                className="h-full w-full object-cover"
              />
              {index === 0 && (
                <Badge tone="intel" className="absolute left-1.5 top-1.5">
                  Cover
                </Badge>
              )}
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => removeImage(img.url)}
                className="absolute right-1.5 top-1.5 hidden h-6 w-6 items-center justify-center rounded-full bg-primary/80 text-xs font-bold text-white group-hover:flex"
              >
                ×
              </button>
            </li>
          ))}

          {pending.map((p) => (
            <li
              key={p.id}
              className="relative aspect-[4/3] overflow-hidden rounded-md border border-line bg-surface"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.previewUrl}
                alt=""
                className="h-full w-full object-cover opacity-60"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-primary/40 p-2 text-center">
                {p.status === "uploading" ? (
                  <Badge tone="default">Uploading…</Badge>
                ) : (
                  <>
                    <Badge tone="danger">{p.error ?? "Upload failed"}</Badge>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => retryPending(p.id)}
                        className="rounded bg-white px-2 py-0.5 text-xs font-semibold text-secondary"
                      >
                        Retry
                      </button>
                      <button
                        type="button"
                        onClick={() => removePending(p.id)}
                        className="rounded bg-white px-2 py-0.5 text-xs font-semibold text-danger"
                      >
                        Remove
                      </button>
                    </div>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { Badge, EpcBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { MultiSelect } from "@/components/ui/multi-select";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Select } from "@/components/ui/select";
import { ToastProvider, useToast } from "@/components/ui/toast";

const DISTRESS_TAGS = [
  "SUBSIDENCE",
  "DAMP",
  "RENOVATION_NEEDED",
  "PROBATE",
  "ASBESTOS",
  "ROOF_REQUIRED",
  "WATER_DAMAGE",
  "FIRE_DAMAGE",
].map((t) => ({ value: t, label: t.replace(/_/g, " ").toLowerCase() }));

const EPC_RATINGS = ["A", "B", "C", "D", "E", "F", "G"] as const;

const SAMPLE_ROWS = [
  { id: "1", title: "3-bed terrace, Worcester", price: "£125,000", status: "LIVE" },
  { id: "2", title: "Probate bungalow, Leeds", price: "£89,500", status: "DRAFT" },
  {
    id: "3",
    title: "Fire-damaged semi, Cardiff",
    price: "£64,000",
    status: "PENDING_REVIEW",
  },
];

function Showcase() {
  const toast = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [tags, setTags] = useState<string[]>(["DAMP"]);

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-10 px-6 py-12">
      <div>
        <h1 className="text-3xl font-bold text-primary">Design system</h1>
        <p className="mt-1 text-sm text-muted">
          Dev-only showcase of every UI primitive (Task 1.5). Brand tokens only — no
          hardcoded hex.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold text-secondary">Buttons</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="ghost">Ghost</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-secondary">Badges & EPC ratings</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Badge>Default</Badge>
          <Badge tone="success">Funded</Badge>
          <Badge tone="warning">Probate</Badge>
          <Badge tone="danger">Fire damage</Badge>
          <Badge tone="intel">Intel</Badge>
          {EPC_RATINGS.map((r) => (
            <EpcBadge key={r} rating={r} />
          ))}
          <EpcBadge rating={null} />
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardTitle>Inputs</CardTitle>
          <CardBody className="space-y-4">
            <Input id="demo-input" label="Asking price (£)" placeholder="125,000" />
            <Input
              id="demo-input-err"
              label="With error"
              defaultValue="not-a-number"
              error="Enter a whole number"
            />
            <Select
              id="demo-select"
              label="Property type"
              placeholder="Choose…"
              options={[
                { value: "RESIDENTIAL", label: "Residential" },
                { value: "COMMERCIAL", label: "Commercial" },
                { value: "HMO", label: "HMO" },
                { value: "LAND", label: "Land" },
              ]}
            />
          </CardBody>
        </Card>
        <Card>
          <CardTitle>Distress tags (MultiSelect)</CardTitle>
          <CardBody>
            <MultiSelect options={DISTRESS_TAGS} value={tags} onChange={setTags} />
            <p className="mt-3 text-xs text-muted">
              Selected: {tags.join(", ") || "none"}
            </p>
          </CardBody>
        </Card>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-secondary">Progress</h2>
        <ProgressBar value={54} label="£35,000 of £65,000 pledged" />
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-secondary">Modal & Toast</h2>
        <div className="flex gap-3">
          <Button onClick={() => setModalOpen(true)}>Open modal</Button>
          <Button variant="outline" onClick={() => toast("Listing saved", "success")}>
            Success toast
          </Button>
          <Button variant="outline" onClick={() => toast("Something failed", "danger")}>
            Danger toast
          </Button>
        </div>
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Confirm action"
        >
          <p className="text-sm text-body">
            Modals stop event propagation, close on Escape and backdrop click.
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setModalOpen(false)}>Confirm</Button>
          </div>
        </Modal>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-secondary">DataTable</h2>
        <DataTable
          columns={[
            { key: "title", header: "Listing", render: (r) => r.title },
            { key: "price", header: "Price", render: (r) => r.price },
            {
              key: "status",
              header: "Status",
              render: (r) => (
                <Badge tone={r.status === "LIVE" ? "success" : "default"}>
                  {r.status}
                </Badge>
              ),
            },
          ]}
          rows={SAMPLE_ROWS}
          rowKey={(r) => r.id}
        />
      </section>
    </main>
  );
}

export default function DevUiPage() {
  return (
    <ToastProvider>
      <Showcase />
    </ToastProvider>
  );
}

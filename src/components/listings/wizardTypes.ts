import type { DistressTag, EpcRating, PropertyType } from "@/generated/prisma/enums";
import type { UploadedImage } from "@/components/uploads/types";

export const WIZARD_STEPS = [
  { id: 1, label: "Address" },
  { id: 2, label: "Details" },
  { id: 3, label: "Distress tags" },
  { id: 4, label: "Media" },
  { id: 5, label: "Review" },
] as const;

export type WizardStepId = (typeof WIZARD_STEPS)[number]["id"];

/** Client-side wizard state — pounds/percent as editable strings, converted at the API boundary. */
export interface WizardFormState {
  id: string | null;
  agentProfileId: string;
  title: string;
  description: string;
  addressLine1: string;
  city: string;
  region: string;
  postcode: string;
  propertyType: PropertyType | "";
  bedrooms: number;
  askingPricePounds: string;
  targetRoiPct: string;
  distressTags: DistressTag[];
  pricingSafeguardAck: boolean;
  epcRating: EpcRating | "";
  epcCertUrl: string | null;
  floorPlanUrl: string | null;
  images: UploadedImage[];
}

export const PROPERTY_TYPE_OPTIONS: { value: PropertyType; label: string }[] = [
  { value: "RESIDENTIAL", label: "Residential" },
  { value: "COMMERCIAL", label: "Commercial" },
  { value: "HMO", label: "HMO" },
  { value: "LAND", label: "Land" },
];

export const EPC_RATING_OPTIONS: { value: EpcRating; label: string }[] = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
].map((r) => ({ value: r as EpcRating, label: r }));

export const DISTRESS_TAG_OPTIONS: { value: DistressTag; label: string }[] = [
  { value: "SUBSIDENCE", label: "Subsidence" },
  { value: "DAMP", label: "Damp" },
  { value: "RENOVATION_NEEDED", label: "Renovation needed" },
  { value: "PROBATE", label: "Probate sale" },
  { value: "ASBESTOS", label: "Asbestos" },
  { value: "ROOF_REQUIRED", label: "Roof required" },
  { value: "WATER_DAMAGE", label: "Water damage" },
  { value: "FIRE_DAMAGE", label: "Fire damage" },
];

/** UK pence formatting without pulling in `services/metrics` (server-only db import). */
export function formatPenceGBP(pence: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(pence / 100);
}

/** "150,000.50" -> 15000050 (pence). Blank/invalid input -> 0. */
export function poundsToPence(pounds: string): number {
  const n = Number(pounds.replace(/,/g, "").trim());
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

export function penceToPoundsInput(pence: number): string {
  return pence === 0 ? "" : String(pence / 100);
}

export const emptyWizardState = (agentProfileId: string): WizardFormState => ({
  id: null,
  agentProfileId,
  title: "",
  description: "",
  addressLine1: "",
  city: "",
  region: "",
  postcode: "",
  propertyType: "",
  bedrooms: 0,
  askingPricePounds: "",
  targetRoiPct: "",
  distressTags: [],
  pricingSafeguardAck: false,
  epcRating: "",
  epcCertUrl: null,
  floorPlanUrl: null,
  images: [],
});

/** Minimum fields needed before the first Save Draft can persist a Property row. */
export function canSaveDraft(state: WizardFormState): boolean {
  return (
    state.agentProfileId.trim() !== "" &&
    state.title.trim().length >= 3 &&
    state.description.trim().length >= 10 &&
    state.addressLine1.trim() !== "" &&
    state.city.trim() !== "" &&
    state.region.trim() !== "" &&
    state.postcode.trim() !== "" &&
    state.propertyType !== "" &&
    poundsToPence(state.askingPricePounds) > 0
  );
}

/** Mirrors the server's `assertReadyForSubmission` gate, for inline UX only. */
export function missingForSubmission(state: WizardFormState): string[] {
  const missing: string[] = [];
  if (state.distressTags.length === 0) missing.push("at least one distress tag");
  if (!state.pricingSafeguardAck) missing.push("the pricing safeguard confirmation");
  if (!state.epcRating) missing.push("an EPC rating");
  return missing;
}

/** Shape shared by create (POST) and update (PATCH) request bodies. */
export function buildListingPayload(state: WizardFormState) {
  return {
    title: state.title,
    description: state.description,
    addressLine1: state.addressLine1,
    city: state.city,
    region: state.region,
    postcode: state.postcode,
    propertyType: state.propertyType || undefined,
    bedrooms: state.bedrooms,
    askingPriceGBP: poundsToPence(state.askingPricePounds),
    targetRoiPct: state.targetRoiPct.trim() === "" ? null : Number(state.targetRoiPct),
    distressTags: state.distressTags,
    epcRating: state.epcRating || null,
    epcCertUrl: state.epcCertUrl,
    floorPlanUrl: state.floorPlanUrl,
    images: state.images,
    pricingSafeguardAck: state.pricingSafeguardAck,
  };
}

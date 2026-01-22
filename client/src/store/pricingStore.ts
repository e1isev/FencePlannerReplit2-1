import { create } from "zustand";
import residentialRows from "@shared/pricing/residential_pricing_rows.json";
import residentialOptions from "@shared/pricing/residential_pricing_options.json";
import {
  buildResidentialIndex,
  buildResidentialIndexExtended,
  resolveResidentialSkuAndPrice,
  resolveWithSkuBuilder,
  type ResidentialPricingIndex,
  type ResidentialPricingIndexExtended,
  type ResidentialPricingRow,
  type ResidentialSelection,
  type ResidentialResolvedWithMeta,
  type ResolutionError,
  type AvailableOptions,
  type CatalogValidationResult,
} from "@shared/pricing/residentialPricing";
import type { FenceCategoryId, FenceColourMode, FenceStyleId } from "@/types/models";
import { FENCE_HEIGHTS_M } from "@/config/fenceHeights";
import { getFenceStyleLabel } from "@/config/fenceStyles";

const residentialIndex = buildResidentialIndex(residentialRows as ResidentialPricingRow[]);
const residentialIndexExtended = buildResidentialIndexExtended(residentialRows as ResidentialPricingRow[]);

if (!residentialIndexExtended.validation.valid) {
  console.error("[PricingStore] Catalog validation errors:", residentialIndexExtended.validation.errors);
}

if (residentialIndexExtended.validation.warnings.length > 0) {
  console.warn(`[PricingStore] Catalog has ${residentialIndexExtended.validation.warnings.length} pattern warnings`);
}

type ResolveResult = 
  | { success: true; resolved: ResidentialResolvedWithMeta }
  | { success: false; error: ResolutionError };

type PricingState = {
  residentialRows: ResidentialPricingRow[];
  residentialIndex: ResidentialPricingIndex;
  residentialIndexExtended: ResidentialPricingIndexExtended;
  catalogValidation: CatalogValidationResult;
  availableOptions: AvailableOptions;
  resolveResidential: (selection: ResidentialSelection) => {
    sku: string;
    unit_price: number;
  } | null;
  resolveResidentialWithMeta: (selection: ResidentialSelection) => ResolveResult;
};

export const usePricingStore = create<PricingState>(() => ({
  residentialRows: residentialRows as ResidentialPricingRow[],
  residentialIndex,
  residentialIndexExtended,
  catalogValidation: residentialIndexExtended.validation,
  availableOptions: residentialIndexExtended.options,
  resolveResidential: (selection) =>
    resolveResidentialSkuAndPrice(residentialIndex, selection),
  resolveResidentialWithMeta: (selection) =>
    resolveWithSkuBuilder(residentialIndexExtended, selection),
}));

export const getSupportedPanelHeights = (
  styleId: FenceStyleId,
  colourMode: FenceColourMode,
  categoryId: FenceCategoryId,
  _pricingIndex: ResidentialPricingIndex | null
) => {
  if (categoryId !== "residential") return [...FENCE_HEIGHTS_M];

  const styleLabel = getFenceStyleLabel(styleId);
  if (!(residentialOptions.panelStyles as string[]).includes(styleLabel)) {
    return [...FENCE_HEIGHTS_M];
  }

  const bySku = residentialIndexExtended.bySku;
  const availableHeights = new Set<number>();

  for (const [, row] of bySku.entries()) {
    if (row.type !== "Panel") continue;
    if (row.style !== styleLabel) continue;

    const rowColour = row.colour;
    const colourMatches =
      (colourMode === "White" && rowColour === "White") ||
      (colourMode === "Colour" && rowColour === "Coloured");

    if (colourMatches && row.height_m > 0) {
      availableHeights.add(row.height_m);
    }
  }

  if (availableHeights.size === 0) {
    return (residentialOptions.heights as number[]).slice().sort((a, b) => a - b);
  }

  return Array.from(availableHeights).sort((a, b) => a - b);
};

export const getAvailableGateWidths = (
  gateType: "single" | "double" | "sliding"
): number[] | Array<{ min: number; max: number }> => {
  const options = residentialIndexExtended.options.gateWidths;
  switch (gateType) {
    case "single":
      return options.single;
    case "double":
      return options.double;
    case "sliding":
      return options.sliding;
    default:
      return [];
  }
};

export const getCatalogStats = () => residentialIndexExtended.validation.stats;

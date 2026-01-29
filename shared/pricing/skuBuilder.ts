export type SkuCategory = "panel" | "post" | "gate";

export type PanelSkuInput = {
  category: "panel";
  style: string;
  colour: "White" | "Coloured";
  heightM: number;
};

export type PostSkuInput = {
  category: "post";
  postKind: "End" | "Corner" | "Line" | "Blank";
  colour: "White" | "Coloured";
  heightM: number;
};

export type GateSkuInput = {
  category: "gate";
  gateType: "Single" | "Double" | "Sliding";
  styleToken: string;
  heightM: number;
  widthM: number;
  widthRange?: { min: number; max: number };
};

export type SkuInput = PanelSkuInput | PostSkuInput | GateSkuInput;

export type SkuResult = {
  success: true;
  sku: string;
} | {
  success: false;
  error: string;
  context: Record<string, unknown>;
};

const PICKET_STYLES = new Set([
  "Jabiru", "Kestrel", "Kookaburra", "Rosella", "Toucan", "Wren"
]);

const MYSTIQUE_STYLES = new Set(["Mystique Solid", "Mystique Lattice"]);

const formatHeight = (heightM: number): string => {
  const rounded = Math.round(heightM * 10) / 10;
  return `${rounded}m`;
};

const formatHeightH = (heightM: number): string => {
  const rounded = Math.round(heightM * 10) / 10;
  return `${rounded}H`;
};

const formatWidthW = (widthM: number): string => {
  const value = String(widthM);
  const trimmed = value.includes(".") ? value.replace(/\.?0+$/, "") : value;
  return `${trimmed}W`;
};

const normalizeColourForPost = (colour: "White" | "Coloured"): string => {
  return colour === "White" ? "Wht" : "Col";
};

const normalizeColourForPanel = (colour: "White" | "Coloured"): string => {
  return colour === "White" ? "White" : "Colour";
};

export const buildPanelSku = (input: PanelSkuInput): SkuResult => {
  const { style, colour, heightM } = input;
  
  if (!style || style.trim() === "") {
    return {
      success: false,
      error: "Panel style is required",
      context: { input },
    };
  }
  
  if (heightM <= 0 || heightM > 3) {
    return {
      success: false,
      error: `Invalid panel height: ${heightM}m`,
      context: { input },
    };
  }
  
  const colourToken = normalizeColourForPanel(colour);
  const heightToken = formatHeight(heightM);
  
  let sku: string;
  
  if (style === "Bellbrae") {
    sku = `Bellbrae-${colourToken}-${heightToken}`;
  } else if (style === "Mystique Lattice") {
    sku = `Mystique-Lattice-${colourToken}-${heightToken}`;
  } else if (style === "Mystique Solid") {
    sku = `Mystique-Solid-${colourToken}-${heightToken}`;
  } else if (PICKET_STYLES.has(style)) {
    sku = `Picket-${style}-${colourToken}-${heightToken}`;
  } else {
    sku = `${style}-${colourToken}-${heightToken}`;
  }
  
  return { success: true, sku };
};

export const buildPostSku = (input: PostSkuInput): SkuResult => {
  const { postKind, colour, heightM } = input;
  
  if (heightM <= 0 || heightM > 3) {
    return {
      success: false,
      error: `Invalid post height: ${heightM}m`,
      context: { input },
    };
  }
  
  const colourToken = normalizeColourForPost(colour);
  const heightToken = formatHeight(heightM);
  
  const sku = `ResPost-${postKind}-${colourToken}-${heightToken}`;
  return { success: true, sku };
};

const normalizeStyleForGate = (style: string): string => {
  if (MYSTIQUE_STYLES.has(style)) return "Myst";
  return "Picket";
};

export const buildGateSku = (input: GateSkuInput): SkuResult => {
  const { gateType, styleToken, heightM, widthM, widthRange } = input;
  
  if (heightM <= 0 || heightM > 3) {
    return {
      success: false,
      error: `Invalid gate height: ${heightM}m`,
      context: { input },
    };
  }
  
  if (widthM <= 0 || widthM > 10) {
    return {
      success: false,
      error: `Invalid gate width: ${widthM}m`,
      context: { input },
    };
  }
  
  const styleAbbrev = normalizeStyleForGate(styleToken);
  
  if (gateType === "Sliding") {
    if (widthRange) {
      const styleForSliding = styleAbbrev === "Myst" ? "Myst" : "Pick";
      const sku = `Gate-${styleForSliding}-Sliding-${formatHeightH(heightM)}-${widthRange.min}/${widthRange.max}`;
      return { success: true, sku };
    }
    return {
      success: false,
      error: "Sliding gate requires a width range",
      context: { input },
    };
  }
  
  const heightToken = formatHeightH(heightM);
  const widthToken = formatWidthW(widthM);
  
  const sku = `Gate-${styleAbbrev}-${gateType}-${heightToken}-${widthToken}`;
  return { success: true, sku };
};

export const buildSku = (input: SkuInput): SkuResult => {
  switch (input.category) {
    case "panel":
      return buildPanelSku(input);
    case "post":
      return buildPostSku(input);
    case "gate":
      return buildGateSku(input);
    default: {
      const exhaustiveCheck: never = input;
      return {
        success: false,
        error: "Unknown SKU category",
        context: { input: exhaustiveCheck },
      };
    }
  }
};

export type CatalogValidationError = {
  type: "duplicate_sku" | "invalid_sku_pattern" | "missing_price" | "invalid_price" | "orphan_sku";
  sku: string;
  message: string;
  row?: unknown;
};

export type CatalogValidationResult = {
  valid: boolean;
  errors: CatalogValidationError[];
  warnings: CatalogValidationError[];
  stats: {
    totalRows: number;
    panels: number;
    posts: number;
    gates: number;
    duplicates: number;
  };
};

const PANEL_SKU_PATTERNS = [
  /^Bellbrae-(?:White|Colour)-\d+(?:\.\d+)?m$/,
  /^Mystique-(?:Lattice|Solid)-(?:White|Colour)-\d+(?:\.\d+)?m$/,
  /^Picket-[A-Za-z]+-(?:White|Colour)-\d+(?:\.\d+)?m$/,
];

const POST_SKU_PATTERN = /^ResPost-(?:End|Corner|Line|Blank)-(?:Wht|Col)-\d+(?:\.\d+)?m$/;

const GATE_SKU_PATTERNS = [
  /^Gate-(?:Picket|Pick|Myst|Mystique)-(?:Single|Double)-\d+(?:\.\d+)?H-\d+(?:\.\d+)?W$/,
  /^Gate-(?:Picket|Pick|Myst|Mystique)-Sliding-(?:\d+(?:\.\d+)?H-)?\d+(?:\.\d+)?(?:\/|-)\d+(?:\.\d+)?$/,
];

const normalizeSlidingSku = (sku: string) => {
  if (!sku.includes("Sliding")) return sku.trim();
  return sku.trim().replace(/(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?$)/, "$1/$2");
};

const matchesAnyPattern = (sku: string, patterns: RegExp[]): boolean => {
  return patterns.some(p => p.test(sku));
};

export const validateCatalog = <T extends { sku: string; unit_price: number; type: string }>(
  rows: T[]
): CatalogValidationResult => {
  const errors: CatalogValidationError[] = [];
  const warnings: CatalogValidationError[] = [];
  const seenSkus = new Map<string, number>();
  let panels = 0;
  let posts = 0;
  let gates = 0;
  let duplicates = 0;

  rows.forEach((row, index) => {
    const { sku, unit_price, type } = row;
    const normalizedSku = normalizeSlidingSku(sku);

    if (seenSkus.has(normalizedSku)) {
      duplicates++;
      warnings.push({
        type: "duplicate_sku",
        sku,
        message: `Duplicate SKU found at row ${index + 1}, first seen at row ${seenSkus.get(normalizedSku)! + 1}`,
        row,
      });
    } else {
      seenSkus.set(normalizedSku, index);
    }

    if (unit_price === null || unit_price === undefined || Number.isNaN(unit_price)) {
      errors.push({
        type: "missing_price",
        sku,
        message: `Missing or invalid price for SKU: ${sku}`,
        row,
      });
    } else if (unit_price < 0) {
      errors.push({
        type: "invalid_price",
        sku,
        message: `Negative price (${unit_price}) for SKU: ${sku}`,
        row,
      });
    }

    if (type === "Panel") {
      panels++;
      if (!matchesAnyPattern(normalizedSku, PANEL_SKU_PATTERNS)) {
        warnings.push({
          type: "invalid_sku_pattern",
          sku,
          message: `Panel SKU does not match expected patterns: ${sku}`,
          row,
        });
      }
    } else if (type.includes("Post")) {
      posts++;
      if (!POST_SKU_PATTERN.test(normalizedSku)) {
        warnings.push({
          type: "invalid_sku_pattern",
          sku,
          message: `Post SKU does not match expected pattern: ${sku}`,
          row,
        });
      }
    } else if (type.includes("Gate")) {
      gates++;
      if (!matchesAnyPattern(normalizedSku, GATE_SKU_PATTERNS)) {
        warnings.push({
          type: "invalid_sku_pattern",
          sku,
          message: `Gate SKU does not match expected patterns: ${sku}`,
          row,
        });
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      totalRows: rows.length,
      panels,
      posts,
      gates,
      duplicates,
    },
  };
};

export type AvailableOptions = {
  styles: string[];
  heights: number[];
  colours: Array<"White" | "Coloured">;
  gateWidths: {
    single: number[];
    double: number[];
    sliding: Array<{ min: number; max: number }>;
  };
};

export const extractAvailableOptions = <T extends { 
  sku: string; 
  type: string; 
  style?: string;
  height_m?: number;
  colour?: string | null;
  width?: number | { min: number; max: number } | null;
}>(
  rows: T[]
): AvailableOptions => {
  const styles = new Set<string>();
  const heights = new Set<number>();
  const colours = new Set<"White" | "Coloured">();
  const singleWidths = new Set<number>();
  const doubleWidths = new Set<number>();
  const slidingRanges: Array<{ min: number; max: number }> = [];

  rows.forEach((row) => {
    if (row.style) styles.add(row.style);
    if (row.height_m && row.height_m > 0) heights.add(row.height_m);
    if (row.colour === "White" || row.colour === "Coloured") {
      colours.add(row.colour);
    }

    if (row.type === "Single Gate" && row.width && typeof row.width === "number") {
      singleWidths.add(row.width);
    }
    if (row.type === "Double Gate" && row.width && typeof row.width === "number") {
      doubleWidths.add(row.width);
    }
    if (row.type === "Sliding Gate" && row.width && typeof row.width === "object") {
      const widthRange = row.width as { min: number; max: number };
      const exists = slidingRanges.some(
        r => r.min === widthRange.min && r.max === widthRange.max
      );
      if (!exists) {
        slidingRanges.push(widthRange);
      }
    }
  });

  return {
    styles: Array.from(styles).sort(),
    heights: Array.from(heights).sort((a, b) => a - b),
    colours: Array.from(colours),
    gateWidths: {
      single: Array.from(singleWidths).sort((a, b) => a - b),
      double: Array.from(doubleWidths).sort((a, b) => a - b),
      sliding: slidingRanges.sort((a, b) => a.min - b.min),
    },
  };
};

export const snapToAvailableWidth = (
  requestedWidth: number,
  availableWidths: number[],
  mode: "nearest" | "round_up" = "round_up"
): { pricedWidth: number; requestedWidth: number; snapped: boolean } | null => {
  if (availableWidths.length === 0) return null;

  const sorted = [...availableWidths].sort((a, b) => a - b);
  
  if (mode === "round_up") {
    const roundedUp = sorted.find(w => w >= requestedWidth);
    if (roundedUp !== undefined) {
      return {
        pricedWidth: roundedUp,
        requestedWidth,
        snapped: Math.abs(roundedUp - requestedWidth) > 0.001,
      };
    }
    return {
      pricedWidth: sorted[sorted.length - 1],
      requestedWidth,
      snapped: true,
    };
  }

  let closest = sorted[0];
  let minDiff = Math.abs(sorted[0] - requestedWidth);
  
  for (const w of sorted) {
    const diff = Math.abs(w - requestedWidth);
    if (diff < minDiff) {
      minDiff = diff;
      closest = w;
    }
  }
  
  return {
    pricedWidth: closest,
    requestedWidth,
    snapped: Math.abs(closest - requestedWidth) > 0.001,
  };
};

export const findSlidingGateRange = (
  requestedWidth: number,
  ranges: Array<{ min: number; max: number }>
): { min: number; max: number } | null => {
  return ranges.find(r => requestedWidth >= r.min && requestedWidth <= r.max) ?? null;
};

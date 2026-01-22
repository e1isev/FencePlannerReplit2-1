import {
  buildPanelSku,
  buildPostSku,
  buildGateSku,
  validateCatalog,
  extractAvailableOptions,
  findSlidingGateRange,
  type AvailableOptions,
  type CatalogValidationResult,
} from "./skuBuilder";

export type ResidentialPricingRow = {
  category: "Residential";
  type:
    | "Panel"
    | "Line Post"
    | "End Post"
    | "Corner Post"
    | "Blank Post"
    | "Single Gate"
    | "Double Gate"
    | "Sliding Gate";
  style: string;
  colour: "White" | "Coloured" | null;
  height_m: number;
  width: number | { min: number; max: number } | null;
  sku: string;
  unit_price: number;
};

export type ResidentialSelection = {
  type: ResidentialPricingRow["type"];
  fenceStyle: string;
  colour: "White" | "Coloured";
  height_m: number;
  gateWidth_m?: number | null;
};

export type ResidentialResolved = {
  sku: string;
  unit_price: number;
};

export type ResidentialResolvedWithMeta = ResidentialResolved & {
  pricedWidth_m?: number;
  requestedWidth_m?: number;
  widthSnapped?: boolean;
};

export type ResolutionError = {
  type: "missing_sku" | "invalid_input" | "sku_build_failed";
  message: string;
  context: {
    selection: ResidentialSelection;
    generatedSku?: string;
    availableSkus?: string[];
    widthRange?: { min: number; max: number };
  };
};

export type ResidentialPricingIndex = {
  exact: Map<string, ResidentialPricingRow>;
  sliding: Map<string, ResidentialPricingRow[]>;
};

const PICKET_EXCEPTIONS = new Set(["Mystique Solid", "Mystique Lattice"]);

const styleKeyForSelection = (selection: ResidentialSelection) => {
  if (selection.type === "Panel") return selection.fenceStyle;
  return PICKET_EXCEPTIONS.has(selection.fenceStyle) ? selection.fenceStyle : "Picket";
};

const colorKey = (colour: ResidentialPricingRow["colour"]) => colour ?? "*";

const widthKey = (width: ResidentialPricingRow["width"]) => {
  if (width === null) return "*";
  if (typeof width === "number") return `${width}`;
  return `${width.min}-${width.max}`;
};

const makeKey = (parts: Array<string | number>) => parts.join("|");

export const buildResidentialIndex = (rows: ResidentialPricingRow[]): ResidentialPricingIndex => {
  const exact = new Map<string, ResidentialPricingRow>();
  const sliding = new Map<string, ResidentialPricingRow[]>();

  rows.forEach((row) => {
    if (row.type === "Sliding Gate") {
      const key = makeKey([row.type, row.style, row.height_m]);
      const bucket = sliding.get(key);
      if (bucket) {
        bucket.push(row);
      } else {
        sliding.set(key, [row]);
      }
      return;
    }

    const key = makeKey([
      row.type,
      row.style,
      colorKey(row.colour),
      row.height_m,
      widthKey(row.width),
    ]);
    exact.set(key, row);
  });

  return { exact, sliding };
};

export const resolveResidentialRow = (
  index: ResidentialPricingIndex | null,
  selection: ResidentialSelection
): ResidentialPricingRow | null => {
  if (!index) return null;

  const style = styleKeyForSelection(selection);

  if (selection.type === "Sliding Gate") {
    const width = selection.gateWidth_m;
    if (width === null || width === undefined) return null;

    const key = makeKey([selection.type, style, selection.height_m]);
    const candidates = index.sliding.get(key) ?? [];
    return (
      candidates.find((row) => {
        if (!row.width || typeof row.width === "number") return false;
        return width >= row.width.min && width <= row.width.max;
      }) ?? null
    );
  }

  const widthValue =
    selection.type === "Single Gate" || selection.type === "Double Gate"
      ? selection.gateWidth_m
      : null;

  if (
    (selection.type === "Single Gate" || selection.type === "Double Gate") &&
    (widthValue === null || widthValue === undefined)
  ) {
    return null;
  }

  const exactKey = makeKey([
    selection.type,
    style,
    selection.colour,
    selection.height_m,
    widthValue ?? "*",
  ]);
  const exactMatch = index.exact.get(exactKey);
  if (exactMatch) return exactMatch;

  const wildcardKey = makeKey([
    selection.type,
    style,
    "*",
    selection.height_m,
    widthValue ?? "*",
  ]);
  return index.exact.get(wildcardKey) ?? null;
};

export const resolveResidentialSkuAndPrice = (
  index: ResidentialPricingIndex | null,
  selection: ResidentialSelection
): ResidentialResolved | null => {
  const row = resolveResidentialRow(index, selection);
  if (!row) return null;
  return { sku: row.sku, unit_price: row.unit_price };
};

export type ResidentialPricingIndexExtended = ResidentialPricingIndex & {
  bySku: Map<string, ResidentialPricingRow>;
  validation: CatalogValidationResult;
  options: AvailableOptions;
};

export const buildResidentialIndexExtended = (
  rows: ResidentialPricingRow[]
): ResidentialPricingIndexExtended => {
  const baseIndex = buildResidentialIndex(rows);
  const bySku = new Map<string, ResidentialPricingRow>();
  
  rows.forEach((row) => {
    bySku.set(row.sku, row);
  });

  const validation = validateCatalog(rows);
  const options = extractAvailableOptions(rows);

  return {
    ...baseIndex,
    bySku,
    validation,
    options,
  };
};

const mapPostKind = (type: ResidentialSelection["type"]): "End" | "Corner" | "Line" | "Blank" | null => {
  switch (type) {
    case "End Post": return "End";
    case "Corner Post": return "Corner";
    case "Line Post": return "Line";
    case "Blank Post": return "Blank";
    default: return null;
  }
};

const mapGateType = (type: ResidentialSelection["type"]): "Single" | "Double" | "Sliding" | null => {
  switch (type) {
    case "Single Gate": return "Single";
    case "Double Gate": return "Double";
    case "Sliding Gate": return "Sliding";
    default: return null;
  }
};

export type ResolveWithSkuBuilderResult = 
  | { success: true; resolved: ResidentialResolvedWithMeta }
  | { success: false; error: ResolutionError };

export const resolveWithSkuBuilder = (
  index: ResidentialPricingIndexExtended | null,
  selection: ResidentialSelection
): ResolveWithSkuBuilderResult => {
  if (!index) {
    return {
      success: false,
      error: {
        type: "invalid_input",
        message: "Pricing index not available",
        context: { selection },
      },
    };
  }

  let generatedSku: string | undefined;

  if (selection.type === "Panel") {
    const result = buildPanelSku({
      category: "panel",
      style: selection.fenceStyle,
      colour: selection.colour,
      heightM: selection.height_m,
    });
    
    if (!result.success) {
      return {
        success: false,
        error: {
          type: "sku_build_failed",
          message: result.error,
          context: { selection },
        },
      };
    }
    generatedSku = result.sku;
  } else if (selection.type.includes("Post")) {
    const postKind = mapPostKind(selection.type);
    if (!postKind) {
      return {
        success: false,
        error: {
          type: "invalid_input",
          message: `Unknown post type: ${selection.type}`,
          context: { selection },
        },
      };
    }
    
    const result = buildPostSku({
      category: "post",
      postKind,
      colour: selection.colour,
      heightM: selection.height_m,
    });
    
    if (!result.success) {
      return {
        success: false,
        error: {
          type: "sku_build_failed",
          message: result.error,
          context: { selection },
        },
      };
    }
    generatedSku = result.sku;
  } else if (selection.type.includes("Gate")) {
    const gateType = mapGateType(selection.type);
    if (!gateType) {
      return {
        success: false,
        error: {
          type: "invalid_input",
          message: `Unknown gate type: ${selection.type}`,
          context: { selection },
        },
      };
    }

    if (selection.gateWidth_m === null || selection.gateWidth_m === undefined) {
      return {
        success: false,
        error: {
          type: "invalid_input",
          message: "Gate width is required",
          context: { selection },
        },
      };
    }

    const pricedWidth = selection.gateWidth_m;
    const widthSnapped = false;

    if (gateType === "Sliding") {
      const widthRange = findSlidingGateRange(selection.gateWidth_m, index.options.gateWidths.sliding);
      if (!widthRange) {
        return {
          success: false,
          error: {
            type: "missing_sku",
            message: `No sliding gate width range found for ${selection.gateWidth_m}m. Available ranges: ${index.options.gateWidths.sliding.map(r => `${r.min}-${r.max}m`).join(", ")}`,
            context: { selection },
          },
        };
      }
      
      const result = buildGateSku({
        category: "gate",
        gateType: "Sliding",
        styleToken: selection.fenceStyle,
        heightM: selection.height_m,
        widthM: selection.gateWidth_m,
        widthRange,
      });
      
      if (!result.success) {
        return {
          success: false,
          error: {
            type: "sku_build_failed",
            message: result.error,
            context: { selection },
          },
        };
      }
      
      const slidingSku = result.sku;
      const row = index.bySku.get(slidingSku);
      if (row) {
        return {
          success: true,
          resolved: {
            sku: row.sku,
            unit_price: row.unit_price,
            pricedWidth_m: selection.gateWidth_m,
            requestedWidth_m: selection.gateWidth_m,
            widthSnapped: false,
          },
        };
      }
      
      const fallbackRow = resolveResidentialRow(index, selection);
      if (fallbackRow) {
        return {
          success: true,
          resolved: {
            sku: fallbackRow.sku,
            unit_price: fallbackRow.unit_price,
            pricedWidth_m: selection.gateWidth_m,
            requestedWidth_m: selection.gateWidth_m,
            widthSnapped: false,
          },
        };
      }
      
      return {
        success: false,
        error: {
          type: "missing_sku",
          message: `Sliding gate SKU not found: ${slidingSku}`,
          context: { 
            selection, 
            generatedSku: slidingSku,
            widthRange,
          },
        },
      };
    }

    const result = buildGateSku({
      category: "gate",
      gateType,
      styleToken: selection.fenceStyle,
      heightM: selection.height_m,
      widthM: pricedWidth,
    });
    
    if (!result.success) {
      return {
        success: false,
        error: {
          type: "sku_build_failed",
          message: result.error,
          context: { selection },
        },
      };
    }
    generatedSku = result.sku;

    const row = index.bySku.get(generatedSku);
    if (row) {
      return {
        success: true,
        resolved: {
          sku: row.sku,
          unit_price: row.unit_price,
          pricedWidth_m: pricedWidth,
          requestedWidth_m: selection.gateWidth_m,
          widthSnapped,
        },
      };
    }

    return {
      success: false,
      error: {
        type: "missing_sku",
        message: `Gate SKU not found in catalog: ${generatedSku}`,
        context: { 
          selection, 
          generatedSku,
          availableSkus: Array.from(index.bySku.keys()).filter(s => s.startsWith("Gate-")).slice(0, 10),
        },
      },
    };
  }

  if (!generatedSku) {
    return {
      success: false,
      error: {
        type: "invalid_input",
        message: `Cannot generate SKU for type: ${selection.type}`,
        context: { selection },
      },
    };
  }

  const row = index.bySku.get(generatedSku);
  if (row) {
    return {
      success: true,
      resolved: {
        sku: row.sku,
        unit_price: row.unit_price,
      },
    };
  }

  const fallbackRow = resolveResidentialRow(index, selection);
  if (fallbackRow) {
    return {
      success: true,
      resolved: {
        sku: fallbackRow.sku,
        unit_price: fallbackRow.unit_price,
      },
    };
  }

  return {
    success: false,
    error: {
      type: "missing_sku",
      message: `SKU not found in catalog: ${generatedSku}`,
      context: { 
        selection, 
        generatedSku,
      },
    },
  };
};

export { validateCatalog, extractAvailableOptions, findSlidingGateRange };
export type { AvailableOptions, CatalogValidationResult } from "./skuBuilder";

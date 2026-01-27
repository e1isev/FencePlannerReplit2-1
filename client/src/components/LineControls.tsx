import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_RUN_MM, MIN_RUN_MM, useAppStore } from "@/store/appStore";
import { distanceMetersProjected } from "@/lib/geo";
import { X, Grid3x3 } from "lucide-react";

const ENDPOINT_WELD_EPS_MM = 60;
const mmToMeters = (mm: number) => mm / 1000;

interface LineControlsProps {
  lineId: string;
  onClose: () => void;
}

export function LineControls({ lineId, onClose }: LineControlsProps) {
  const lines = useAppStore((state) => state.lines);
  const toggleEvenSpacing = useAppStore((state) => state.toggleEvenSpacing);
  const deleteLine = useAppStore((state) => state.deleteLine);
  const updateLine = useAppStore((state) => state.updateLine);
  const line = lines.find((l) => l.id === lineId);
  const [draftValue, setDraftValue] = useState("");
  const [labelUnit, setLabelUnit] = useState<"mm" | "m">("mm");
  const [error, setError] = useState<string | null>(null);

  const parseLengthInput = useCallback((value: string, unit: "mm" | "m") => {
    const trimmed = value.trim();
    if (!trimmed) {
      return { mm: null, error: "Enter a value" };
    }

    const numeric = Number(trimmed);
    if (!Number.isFinite(numeric)) {
      return { mm: null, error: "Enter a valid number" };
    }
    if (numeric <= 0) {
      return { mm: null, error: "Value must be greater than zero" };
    }

    const mm = unit === "m" ? numeric * 1000 : numeric;
    if (mm < MIN_RUN_MM) {
      return {
        mm: null,
        error: `Value too small. Minimum is ${(MIN_RUN_MM / 1000).toFixed(2)} m`,
      };
    }
    if (mm > MAX_RUN_MM) {
      return { mm: null, error: "Value too large, check units" };
    }

    return { mm };
  }, []);

  const helperText = useMemo(() => {
    const numeric = Number(draftValue);
    if (!Number.isFinite(numeric) || numeric <= 0) return null;
    const mmValue = labelUnit === "m" ? numeric * 1000 : numeric;
    const metresValue = mmValue / 1000;

    return labelUnit === "m"
      ? `= ${mmValue.toLocaleString()} mm`
      : `= ${metresValue.toFixed(3)} m`;
  }, [draftValue, labelUnit]);

  const validationResult = parseLengthInput(draftValue, labelUnit);
  const inlineError = error ?? validationResult.error;

  const handleUnitChange = (unit: "mm" | "m") => {
    if (unit === labelUnit) return;
    const numeric = Number(draftValue);
    let convertedValue = draftValue;

    if (Number.isFinite(numeric)) {
      const mmValue = labelUnit === "m" ? numeric * 1000 : numeric;
      convertedValue = unit === "m" ? (mmValue / 1000).toString() : mmValue.toString();
    }

    setLabelUnit(unit);
    setDraftValue(convertedValue);
    setError(null);
  };

  const handleSubmit = () => {
    if (!line || line.gateId) return;
    const { mm, error: submitError } = parseLengthInput(draftValue, labelUnit);
    if (!mm || submitError) {
      setError(submitError ?? "Enter a value");
      return;
    }

    const gateToleranceMeters = mmToMeters(ENDPOINT_WELD_EPS_MM);
    const isGateEndpoint = (point: typeof line.a) =>
      lines.some(
        (lineItem) =>
          lineItem.gateId &&
          lineItem.id !== line.id &&
          (distanceMetersProjected(lineItem.a, point) <= gateToleranceMeters ||
            distanceMetersProjected(lineItem.b, point) <= gateToleranceMeters)
      );
    const gateAtA = isGateEndpoint(line.a);
    const gateAtB = isGateEndpoint(line.b);
    const fromEnd = gateAtB && !gateAtA ? "a" : "b";

    setError(null);

    try {
      updateLine(line.id, mm, fromEnd, { allowMerge: false });
      const latestLines = useAppStore.getState().lines;
      const stillExists = latestLines.some((lineItem) => lineItem.id === line.id);
      if (!stillExists) {
        onClose();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update length");
    }
  };

  const handleCancel = () => {
    if (!line || line.gateId) return;
    setLabelUnit("mm");
    setDraftValue(line.length_mm.toFixed(0));
    setError(null);
  };

  useEffect(() => {
    if (!line || line.gateId) return;
    setLabelUnit("mm");
    setDraftValue(line.length_mm.toFixed(0));
    setError(null);
  }, [line?.id, line?.length_mm, line?.gateId]);

  if (!line || line.gateId) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Line</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onClose}
          data-testid="button-close-line-controls"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="line-length" className="text-sm font-medium">
          Length
        </Label>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            id="line-length"
            type="text"
            inputMode="decimal"
            value={draftValue}
            onChange={(e) => {
              setDraftValue(e.target.value);
              setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
              if (e.key === "Escape") onClose();
            }}
            className="w-28 font-mono"
            data-testid="input-dimension"
            placeholder="Length"
          />
          <div className="flex rounded-md border border-slate-300 overflow-hidden text-xs">
            <button
              type="button"
              className={`px-2 py-1 ${
                labelUnit === "mm"
                  ? "bg-primary text-primary-foreground"
                  : "bg-white text-slate-700"
              }`}
              onClick={() => handleUnitChange("mm")}
            >
              mm
            </button>
            <button
              type="button"
              className={`px-2 py-1 ${
                labelUnit === "m"
                  ? "bg-primary text-primary-foreground"
                  : "bg-white text-slate-700"
              }`}
              onClick={() => handleUnitChange("m")}
            >
              m
            </button>
          </div>
        </div>
        {helperText && <p className="text-xs text-slate-600 font-mono">{helperText}</p>}
        {inlineError && <p className="text-xs text-red-600">{inlineError}</p>}
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            onClick={handleSubmit}
            data-testid="button-submit-dimension"
            disabled={Boolean(validationResult.error)}
          >
            Apply
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            data-testid="button-cancel-dimension"
          >
            Cancel
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="even-spacing"
          checked={line.even_spacing}
          onCheckedChange={() => toggleEvenSpacing(lineId)}
          data-testid="checkbox-even-spacing"
        />
        <Label
          htmlFor="even-spacing"
          className="text-sm font-medium cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Grid3x3 className="w-4 h-4" />
            Evenly Space Panels
          </div>
        </Label>
      </div>

      <Button
        variant="destructive"
        size="sm"
        onClick={() => {
          deleteLine(lineId);
          onClose();
        }}
        className="w-full"
        data-testid="button-delete-line"
      >
        Delete Line
      </Button>
    </div>
  );
}

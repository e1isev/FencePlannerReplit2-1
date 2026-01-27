import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store/appStore";
import { formatGateWidthM, getGateWidthRules } from "@/lib/gates/gateWidth";
import { X } from "lucide-react";

interface GateControlsProps {
  gateId: string;
  onClose: () => void;
}

export function GateControls({ gateId, onClose }: GateControlsProps) {
  const gates = useAppStore((state) => state.gates);
  const updateGateWidth = useAppStore((state) => state.updateGateWidth);
  const gate = gates.find((item) => item.id === gateId);
  const rules = useMemo(() => (gate ? getGateWidthRules(gate.type) : null), [gate?.type]);

  const [draftValue, setDraftValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gate) return;
    setDraftValue(formatGateWidthM(gate.opening_mm / 1000));
    setError(null);
  }, [gate?.id, gate?.opening_mm]);

  if (!gate || !rules) return null;

  const rangeLabel = `Range ${rules.minM.toFixed(2)} to ${rules.maxM.toFixed(2)} m`;

  const commitNumeric = (value: string) => {
    const numeric = Number(value.trim());
    if (!Number.isFinite(numeric)) {
      setDraftValue(formatGateWidthM(gate.opening_mm / 1000));
      setError("Enter a valid number.");
      return;
    }

    const result = updateGateWidth(gate.id, numeric * 1000);
    if (!result.ok) {
      setDraftValue(formatGateWidthM(gate.opening_mm / 1000));
      setError(result.error ?? "Unable to update gate width.");
      return;
    }

    setDraftValue(formatGateWidthM(result.widthMm / 1000));
    setError(null);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Gate Options</h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onClose}
          data-testid="button-close-gate-controls"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Label htmlFor="gate-width" className="text-sm font-medium">
        Gate width (m)
      </Label>
      <Input
        id="gate-width"
        type="text"
        inputMode="decimal"
        value={draftValue}
        onChange={(e) => {
          setDraftValue(e.target.value);
          setError(null);
        }}
        onBlur={() => commitNumeric(draftValue)}
        onKeyDown={(e) => {
          if (e.key === "Enter") commitNumeric(draftValue);
          if (e.key === "Escape") {
            setDraftValue(formatGateWidthM(gate.opening_mm / 1000));
            setError(null);
          }
        }}
        placeholder="0.00"
        data-testid="input-gate-width"
      />
      <p className="text-xs text-slate-500">{rangeLabel}</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

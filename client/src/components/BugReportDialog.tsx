import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useProjectSessionStore } from "@/store/projectSessionStore";
import { useAuthStore } from "@/store/authStore";
import { useAppStore } from "@/store/appStore";
import { useDeckingStore } from "@/store/deckingStore";
import { useMapViewportStore } from "@/store/mapViewportStore";
import { apiFetch } from "@/lib/api";
import {
  bugReportLogger,
  captureCanvasScreenshot,
  getBreadcrumbs,
  getBugReportSessionId,
  getDeviceInfo,
  getLogEntries,
} from "@/lib/bugReport";

const DEFAULT_EMAIL = "engineering@thinkfencing.com.au";

type SubmitStatus = "idle" | "submitting" | "success" | "error";

type SupportReportResponse = {
  reportId: string;
  emailStatus?: string;
};

export function BugReportDialog() {
  const [location] = useLocation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [expectation, setExpectation] = useState("");
  const [includeScreenshot, setIncludeScreenshot] = useState(true);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [reportId, setReportId] = useState<string | null>(null);

  const user = useAuthStore((state) => state.user);
  const projectSession = useProjectSessionStore((state) => ({
    projectId: state.projectId,
    localId: state.localId,
    projectType: state.projectType,
    projectName: state.projectName,
    dependencies: state.dependencies,
  }));
  const mapViewport = useMapViewportStore((state) => state.viewport);

  const appState = useAppStore((state) => ({
    productKind: state.productKind,
    fenceStyleId: state.fenceStyleId,
    fenceHeightM: state.fenceHeightM,
    fenceColorId: state.fenceColorId,
    fenceCategoryId: state.fenceCategoryId,
    selectedLineId: state.selectedLineId,
    selectedGateId: state.selectedGateId,
    drawingMode: state.drawingMode,
    linesCount: state.lines.length,
    gatesCount: state.gates.length,
    panelCount: state.panels.length,
    mmPerPixel: state.mmPerPixel,
  }));

  const deckingState = useDeckingStore((state) => ({
    projectState: state.getProjectState(),
    deckCount: state.decks.length,
  }));

  const routeLabel = useMemo(() => {
    if (typeof window === "undefined") return "";
    if (window.location.hash) {
      return window.location.hash.replace(/^#/, "");
    }
    return window.location.pathname;
  }, [location]);

  useEffect(() => {
    if (!open) return;
    bugReportLogger.breadcrumb("Opened report dialog", "report");
    setStatus("idle");
    setReportId(null);
    if (includeScreenshot) {
      const captured = captureCanvasScreenshot();
      setScreenshot(captured);
    }
  }, [open, includeScreenshot]);

  const handleSubmit = async () => {
    if (!description.trim() || !expectation.trim()) {
      toast({
        title: "Missing details",
        description: "Please share what happened and what you expected.",
        variant: "destructive",
      });
      return;
    }

    const resolvedScreenshot = includeScreenshot
      ? screenshot ?? captureCanvasScreenshot()
      : null;

    if (includeScreenshot) {
      setScreenshot(resolvedScreenshot);
    }

    setStatus("submitting");
    bugReportLogger.breadcrumb("Submitted report", "report");

    const payload = {
      description: description.trim(),
      expectation: expectation.trim(),
      includeScreenshot,
      screenshotDataUrl: includeScreenshot ? resolvedScreenshot : null,
      context: {
        route: routeLabel,
        screen: "planner",
        uiState: {
          project: projectSession,
          planner: appState,
          decking: deckingState.projectState,
          deckCount: deckingState.deckCount,
          mapViewport,
        },
        appVersion: import.meta.env.VITE_APP_VERSION ?? "unknown",
        build: {
          commitHash: import.meta.env.VITE_COMMIT_HASH ?? "unknown",
        },
        environment: getDeviceInfo(),
        user: {
          id: user?.id ?? null,
          email: user?.email ?? null,
        },
      },
      logs: getLogEntries(),
      breadcrumbs: getBreadcrumbs(),
      correlation: {
        sessionId: getBugReportSessionId(),
      },
    };

    try {
      const response = await apiFetch("support/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json()) as { message?: string };
        throw new Error(body.message ?? "Unable to submit report.");
      }

      const data = (await response.json()) as SupportReportResponse;
      setReportId(data.reportId);
      setStatus("success");
      const emailMessage =
        data.emailStatus === "sent"
          ? `Reference ID ${data.reportId} emailed to ${DEFAULT_EMAIL}.`
          : `Reference ID ${data.reportId} saved. Email delivery is pending configuration.`;
      toast({
        title: "Report sent",
        description: emailMessage,
      });
    } catch (error) {
      setStatus("error");
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Unable to submit report.",
        variant: "destructive",
      });
    }
  };

  const handleCopyId = async () => {
    if (!reportId) return;
    await navigator.clipboard.writeText(reportId);
    toast({ title: "Copied", description: "Report ID copied to clipboard." });
  };

  const resetForm = () => {
    setDescription("");
    setExpectation("");
    setIncludeScreenshot(true);
    setScreenshot(null);
    setStatus("idle");
    setReportId(null);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          resetForm();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">Report a problem</Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Report a problem</DialogTitle>
          <DialogDescription>
            We’ll collect diagnostic details (logs, app state, and your screenshot) and email the
            report to {DEFAULT_EMAIL}.
          </DialogDescription>
        </DialogHeader>
        {status === "success" && reportId ? (
          <div className="space-y-4">
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              Thanks! Your report was submitted successfully.
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-id">Reference ID</Label>
              <div className="flex gap-2">
                <Input id="report-id" value={reportId} readOnly />
                <Button type="button" variant="secondary" onClick={handleCopyId}>
                  Copy ID
                </Button>
              </div>
            </div>
            <div className="text-sm text-slate-600">
              Keep this ID handy so support can locate your diagnostics bundle quickly.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="report-description">What happened?</Label>
              <Textarea
                id="report-description"
                placeholder="Describe the issue you encountered."
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-expectation">What did you expect?</Label>
              <Textarea
                id="report-expectation"
                placeholder="Tell us what you expected to happen."
                value={expectation}
                onChange={(event) => setExpectation(event.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="include-screenshot"
                  checked={includeScreenshot}
                  onCheckedChange={(checked) => setIncludeScreenshot(checked === true)}
                />
                <Label htmlFor="include-screenshot">Include a screenshot</Label>
              </div>
              {includeScreenshot ? (
                <div className="rounded-md border border-dashed border-slate-200 p-3">
                  {screenshot ? (
                    <img
                      src={screenshot}
                      alt="Captured canvas screenshot"
                      className="max-h-48 w-full rounded object-contain"
                    />
                  ) : (
                    <p className="text-sm text-slate-500">
                      We’ll capture a snapshot of your canvas when you submit the report.
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Screenshot will be excluded.</p>
              )}
            </div>
          </div>
        )}
        <DialogFooter>
          {status === "success" ? (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setOpen(false);
              }}
            >
              Close
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={status === "submitting"}>
              {status === "submitting" ? "Submitting…" : "Submit report"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

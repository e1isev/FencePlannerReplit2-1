import { useEffect, useRef } from "react";
import { Stage, Layer, Line, Text, Group, Rect } from "react-konva";
import { useAppStore } from "@/store/appStore";
import { usePricingStore } from "@/store/pricingStore";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { useLocation } from "wouter";
import { getSlidingReturnRect } from "@/geometry/gates";
import { calculateCosts } from "@/lib/pricing";
import { PostShape } from "@/components/PostShape";
import { getFenceStyleLabel } from "@/config/fenceStyles";
import { getFenceColourMode } from "@/config/fenceColors";
import { countBoardsPurchased } from "@/geometry/panels";
import { DRAWING_STYLES } from "@/styles/drawingStyles";

export default function DrawingPage() {
  const [, setLocation] = useLocation();
  const lines = useAppStore((state) => state.lines);
  const posts = useAppStore((state) => state.posts);
  const postSpans = useAppStore((state) => state.postSpans);
  const postAngles = useAppStore((state) => state.postAngles);
  const gates = useAppStore((state) => state.gates);
  const warnings = useAppStore((state) => state.warnings);
  const panels = useAppStore((state) => state.panels);
  const fenceStyleId = useAppStore((state) => state.fenceStyleId);
  const fenceHeightM = useAppStore((state) => state.fenceHeightM);
  const fenceColorId = useAppStore((state) => state.fenceColorId);
  const fenceCategoryId = useAppStore((state) => state.fenceCategoryId);
  const mmPerPixel = useAppStore((state) => state.mmPerPixel);
  const residentialIndex = usePricingStore((state) => state.residentialIndex);
  const containerRef = useRef<HTMLDivElement>(null);

  const costs = calculateCosts({
    fenceCategoryId,
    fenceStyleId,
    fenceHeightM,
    fenceColourMode: getFenceColourMode(fenceColorId),
    residentialIndex,
    panels,
    posts,
    gates,
    lines,
  });

  const padding = 80;
  const canvasWidth = 1200;
  const canvasHeight = 800;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  lines.forEach((line) => {
    minX = Math.min(minX, line.a.x, line.b.x);
    minY = Math.min(minY, line.a.y, line.b.y);
    maxX = Math.max(maxX, line.a.x, line.b.x);
    maxY = Math.max(maxY, line.a.y, line.b.y);
  });

  const hasLines = lines.length > 0;

  if (!hasLines) {
    minX = 0;
    minY = 0;
    maxX = canvasWidth - 2 * padding;
    maxY = canvasHeight - 2 * padding;
  }
  const drawingWidth = hasLines ? maxX - minX : canvasWidth - 2 * padding;
  const drawingHeight = hasLines ? maxY - minY : canvasHeight - 2 * padding;

  const safeDrawingWidth = Math.max(drawingWidth, 1);
  const safeDrawingHeight = Math.max(drawingHeight, 1);

  const scaleX = (canvasWidth - 2 * padding) / safeDrawingWidth;
  const scaleY = (canvasHeight - 2 * padding) / safeDrawingHeight;
  const drawingScale = Math.min(scaleX, scaleY);

  const offsetX = padding + (canvasWidth - 2 * padding - drawingWidth * drawingScale) / 2;
  const offsetY = padding + (canvasHeight - 2 * padding - drawingHeight * drawingScale) / 2;

  const totalLengthMm = lines.reduce((sum, line) => sum + line.length_mm, 0);
  const totalPosts = posts.length;
  const totalPanels = countBoardsPurchased(panels);
  const totalGates = gates.length;

  const transform = (point: { x: number; y: number }) => ({
    x: (point.x - minX) * drawingScale + offsetX,
    y: (point.y - minY) * drawingScale + offsetY,
  });

  const transformedLines = lines.map((line) => ({
    ...line,
    a: transform(line.a),
    b: transform(line.b),
  }));

  const postById = new Map(posts.map((post) => [post.id, post]));

  return (
    <div className="min-h-screen bg-white" data-testid="page-drawing">
      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => setLocation("/planner")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Planner
          </Button>
        </div>

        <h1 className="text-2xl font-semibold mb-6">Engineering Drawing</h1>

        <div className="flex gap-6 mb-6">
          <div
            ref={containerRef}
            className="border-2 border-slate-200 rounded-lg bg-white"
          >
            <Stage width={canvasWidth} height={canvasHeight}>
              <Layer>
                <Rect
                  x={0}
                  y={0}
                  width={canvasWidth}
                  height={canvasHeight}
                  fill="white"
                />

                {transformedLines.map((line) => {
                  const isGate = !!line.gateId;
                  const a = line.a;
                  const b = line.b;
                  const baseStrokeWidth = DRAWING_STYLES.fenceLineStrokePx;
                  const outlineStrokeWidth = DRAWING_STYLES.fenceLineOutlinePx;

                  return (
                    <Group key={line.id}>
                      <Line
                        points={[a.x, a.y, b.x, b.y]}
                        stroke="#0f172a"
                        strokeWidth={outlineStrokeWidth}
                        opacity={isGate ? 0.85 : 0.9}
                        listening={false}
                      />
                      <Line
                        points={[a.x, a.y, b.x, b.y]}
                        stroke={isGate ? "#f59e0b" : "#475569"}
                        strokeWidth={baseStrokeWidth}
                        opacity={isGate ? 0.95 : 1}
                        shadowColor="rgba(15,23,42,0.35)"
                        shadowBlur={DRAWING_STYLES.fenceLineShadowBlurPx}
                        listening={false}
                      />
                      {isGate && (
                        <Text
                          x={(a.x + b.x) / 2 - 20}
                          y={(a.y + b.y) / 2 + 5}
                          text="GATE"
                          fontSize={8}
                          fill="#f59e0b"
                          fontStyle="bold"
                        />
                      )}
                    </Group>
                  );
                })}

                {postSpans.map((span) => {
                  const fromPost = postById.get(span.fromPostId);
                  const toPost = postById.get(span.toPostId);
                  if (!fromPost || !toPost) return null;

                  const from = transform(fromPost.pos);
                  const to = transform(toPost.pos);
                  const dx = to.x - from.x;
                  const dy = to.y - from.y;
                  const length = Math.hypot(dx, dy);
                  if (length === 0) return null;

                  const nx = -dy / length;
                  const ny = dx / length;

                  const offset = DRAWING_STYLES.dimensionOffsetPx;
                  const tick = DRAWING_STYLES.dimensionTickLengthPx;
                  const labelOffset = DRAWING_STYLES.dimensionLabelOffsetPx;

                  const lineStart = {
                    x: from.x + nx * offset,
                    y: from.y + ny * offset,
                  };
                  const lineEnd = {
                    x: to.x + nx * offset,
                    y: to.y + ny * offset,
                  };

                  const tickHalf = tick / 2;
                  const tickStartA = {
                    x: lineStart.x - nx * tickHalf,
                    y: lineStart.y - ny * tickHalf,
                  };
                  const tickStartB = {
                    x: lineStart.x + nx * tickHalf,
                    y: lineStart.y + ny * tickHalf,
                  };
                  const tickEndA = {
                    x: lineEnd.x - nx * tickHalf,
                    y: lineEnd.y - ny * tickHalf,
                  };
                  const tickEndB = {
                    x: lineEnd.x + nx * tickHalf,
                    y: lineEnd.y + ny * tickHalf,
                  };

                  const midX = (lineStart.x + lineEnd.x) / 2;
                  const midY = (lineStart.y + lineEnd.y) / 2;

                  const labelX = midX + nx * labelOffset;
                  const labelY = midY + ny * labelOffset;

                  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
                  const readableAngle = angleDeg > 90 || angleDeg < -90 ? angleDeg + 180 : angleDeg;

                  const text = `${span.lengthM.toFixed(2)} m`;
                  const fontSize = DRAWING_STYLES.dimensionTextSizePx;
                  const padding = DRAWING_STYLES.dimensionLabelPaddingPx;
                  const estimatedWidth = text.length * fontSize * 0.6 + padding * 2;
                  const estimatedHeight = fontSize + padding * 2;

                  return (
                    <Group key={span.id}>
                      <Line
                        points={[lineStart.x, lineStart.y, lineEnd.x, lineEnd.y]}
                        stroke="#1e293b"
                        strokeWidth={DRAWING_STYLES.dimensionLineWidthPx}
                        listening={false}
                      />
                      <Line
                        points={[tickStartA.x, tickStartA.y, tickStartB.x, tickStartB.y]}
                        stroke="#1e293b"
                        strokeWidth={DRAWING_STYLES.dimensionLineWidthPx}
                        listening={false}
                      />
                      <Line
                        points={[tickEndA.x, tickEndA.y, tickEndB.x, tickEndB.y]}
                        stroke="#1e293b"
                        strokeWidth={DRAWING_STYLES.dimensionLineWidthPx}
                        listening={false}
                      />
                      <Group x={labelX} y={labelY} rotation={readableAngle}>
                        <Rect
                          width={estimatedWidth}
                          height={estimatedHeight}
                          offsetX={estimatedWidth / 2}
                          offsetY={estimatedHeight / 2}
                          fill="rgba(255,255,255,0.9)"
                          stroke="rgba(15,23,42,0.35)"
                          strokeWidth={1}
                          cornerRadius={4}
                        />
                        <Text
                          text={text}
                          fontSize={fontSize}
                          fill="#0f172a"
                          fontFamily="JetBrains Mono"
                          offsetX={estimatedWidth / 2}
                          offsetY={estimatedHeight / 2}
                          width={estimatedWidth}
                          height={estimatedHeight}
                          align="center"
                          verticalAlign="middle"
                        />
                      </Group>
                    </Group>
                  );
                })}

                {posts.map((post) => {
                  const transformedPost = transform(post.pos);
                  const angleDeg = postAngles[post.id] ?? 0;

                  return (
                    <PostShape
                      key={post.id}
                      x={transformedPost.x}
                      y={transformedPost.y}
                      category={post.category}
                      angleDeg={angleDeg}
                      sizePx={DRAWING_STYLES.postSizePx}
                      cornerRadiusPx={DRAWING_STYLES.postCornerRadiusPx}
                      strokeWidthPx={DRAWING_STYLES.postStrokeWidthPx}
                    />
                  );
                })}

                {gates
                  .filter((g) => g.type.startsWith("sliding"))
                  .map((gate) => {
                    const gateLine = lines.find((l) => l.gateId === gate.id);
                    if (!gateLine || !mmPerPixel) return null;

                    const geometry = getSlidingReturnRect(gate, gateLine, mmPerPixel);
                    if (!geometry) return null;

                    const center = transform(geometry.center);
                    const width = geometry.width * drawingScale;
                    const height = geometry.height * drawingScale;

                    return (
                      <Group key={gate.id} rotation={geometry.rotation} x={center.x} y={center.y}>
                        <Rect
                          x={0}
                          y={0}
                          width={width}
                          height={height}
                          offsetX={width / 2}
                          offsetY={height / 2}
                          stroke="#ef4444"
                          strokeWidth={2}
                          dash={[6, 3]}
                          fill="rgba(239, 68, 68, 0.12)"
                        />
                        <Text
                          x={height / 2 + 4}
                          y={-8}
                          text="Return"
                          fontSize={8}
                          fill="#ef4444"
                        />
                      </Group>
                    );
                  })}
              </Layer>
            </Stage>
          </div>

          <Card className="p-4 border-2 border-slate-200 shadow-md self-start">
            <h3 className="text-sm font-semibold mb-3">Legend</h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-post-end border-2 border-post-end" />
                <span>End Post</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-post-corner border-2 border-post-corner" />
                <span>Corner Post</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-post-line border-2 border-post-line" />
                <span>Line Post</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 bg-gate" />
                <span>Gate</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-1 border border-dashed border-destructive" />
                <span>Sliding Return</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200 font-mono text-xs">
              <div>Total: {(totalLengthMm / 1000).toFixed(2)}m</div>
              <div className="text-slate-500 text-[10px] mt-1">
                (inc. {(63.5 * posts.filter((p) => p.category === "end").length / 1000).toFixed(2)}m end posts)
              </div>
            </div>
          </Card>
        </div>

        {warnings.length > 0 && (
          <Card className="bg-amber-50 border-l-4 border-amber-500 p-4 mb-6">
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <h3 className="font-semibold text-amber-900">Warnings</h3>
            </div>
            <div className="space-y-1 ml-7">
              {warnings.map((warning) => (
                <div
                  key={warning.id}
                  className="text-sm text-amber-800"
                  data-testid={`drawing-warning-${warning.id}`}
                >
                  • {warning.text}
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Specifications</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-slate-600">Fence Style</div>
              <div className="font-medium">{getFenceStyleLabel(fenceStyleId)}</div>
            </div>
            <div>
              <div className="text-slate-600">Total Fence Length</div>
              <div className="font-medium font-mono">
                {(totalLengthMm / 1000).toFixed(2)}m
              </div>
            </div>
            <div>
              <div className="text-slate-600">Number of Panels</div>
              <div className="font-medium font-mono">{totalPanels}</div>
            </div>
            <div>
              <div className="text-slate-600">Total Posts</div>
              <div className="font-medium font-mono">
                {totalPosts}
              </div>
            </div>
            <div>
              <div className="text-slate-600">Number of Gates</div>
              <div className="font-medium font-mono">
                {totalGates}
              </div>
            </div>
<div>
              <div className="text-slate-600">Estimated Total Cost</div>
              <div className="font-medium font-mono">
                {costs.grandTotal === null ? "—" : `$${costs.grandTotal.toFixed(2)}`}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

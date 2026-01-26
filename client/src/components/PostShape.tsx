import React from "react";
import { Rect } from "react-konva";

import { POST_CORNER_RADIUS_MM, POST_SIZE_MM } from "@/constants/geometry";
import { DRAWING_STYLES } from "@/styles/drawingStyles";
import { PostCategory } from "@/types/models";

type PostShapeProps = {
  x: number;
  y: number;
  category: PostCategory;
  angleDeg: number;
  isSatelliteMode?: boolean;
  mmPerPixel?: number;
  sizePx?: number;
  cornerRadiusPx?: number;
  strokeWidthPx?: number;
};

export function PostShape({
  x,
  y,
  category,
  angleDeg,
  isSatelliteMode,
  mmPerPixel,
  sizePx,
  cornerRadiusPx,
  strokeWidthPx,
}: PostShapeProps) {
  const mmToPx = (mm: number) => (mmPerPixel && mmPerPixel > 0 ? mm / mmPerPixel : mm);

  const resolvedSizePx =
    sizePx ?? (mmPerPixel ? mmToPx(POST_SIZE_MM) : DRAWING_STYLES.postSizePx);
  const resolvedCornerRadiusPx =
    cornerRadiusPx ??
    (mmPerPixel ? mmToPx(POST_CORNER_RADIUS_MM) : DRAWING_STYLES.postCornerRadiusPx);
  const resolvedStrokeWidthPx = strokeWidthPx ?? DRAWING_STYLES.postStrokeWidthPx;

  const categoryColor = {
    end: "#22c55e",
    corner: "#ef4444",
    line: "#3b82f6",
    t: "#a855f7",
  }[category];

  const fillColor = isSatelliteMode ? `${categoryColor}e6` : categoryColor;
  const strokeColor = isSatelliteMode ? "#0f172a" : "#1e293b";
  const shadowColor = isSatelliteMode ? "rgba(0,0,0,0.45)" : "rgba(15,23,42,0.35)";

  return (
    <Rect
      x={x}
      y={y}
      width={resolvedSizePx}
      height={resolvedSizePx}
      offsetX={resolvedSizePx / 2}
      offsetY={resolvedSizePx / 2}
      rotation={angleDeg}
      cornerRadius={resolvedCornerRadiusPx}
      fill={fillColor}
      stroke={strokeColor}
      strokeWidth={resolvedStrokeWidthPx}
      strokeScaleEnabled={false}
      shadowColor={shadowColor}
      shadowBlur={DRAWING_STYLES.postShadowBlurPx}
      name="post"
      hitStrokeWidth={8}
      listening={true}
    />
  );
}

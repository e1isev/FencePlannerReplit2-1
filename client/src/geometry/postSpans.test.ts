import { describe, expect, it } from "vitest";

import { derivePostSpans } from "@/geometry/postSpans";
import { interpolateLngLat, lineLengthMeters } from "@/lib/geo";
import type { FenceLine, Post } from "@/types/models";

const buildLine = (id: string, a: { x: number; y: number }, b: { x: number; y: number }): FenceLine => ({
  id,
  a,
  b,
  length_mm: lineLengthMeters([a, b]) * 1000,
  locked_90: true,
  even_spacing: false,
});

const buildPost = (id: string, pos: { x: number; y: number }): Post => ({
  id,
  pos,
  category: "line",
  source: "vertex",
});

describe("derivePostSpans", () => {
  it("derives spans along a straight line", () => {
    const start = { x: 0, y: 0 };
    const end = { x: 0.001, y: 0 };
    const mid = interpolateLngLat(start, end, 0.5);
    const line = buildLine("line-1", start, end);

    const posts = [
      buildPost("post-start", start),
      buildPost("post-mid", mid),
      buildPost("post-end", end),
    ];

    const { spans } = derivePostSpans([line], posts);

    expect(spans).toHaveLength(2);
    const expectedLengthM = line.length_mm / 1000 / 2;
    expect(spans[0]?.lengthM).toBeCloseTo(expectedLengthM, 3);
    expect(spans[1]?.lengthM).toBeCloseTo(expectedLengthM, 3);
  });

  it("orders spans through a corner", () => {
    const a = { x: 0, y: 0 };
    const b = { x: 0.001, y: 0 };
    const c = { x: 0.001, y: 0.001 };

    const line1 = buildLine("line-1", a, b);
    const line2 = buildLine("line-2", b, c);

    const posts = [buildPost("post-a", a), buildPost("post-b", b), buildPost("post-c", c)];

    const { spans } = derivePostSpans([line1, line2], posts);

    expect(spans).toHaveLength(2);
    expect(spans[0]?.lengthM).toBeCloseTo(line1.length_mm / 1000, 3);
    expect(spans[1]?.lengthM).toBeCloseTo(line2.length_mm / 1000, 3);
  });

  it("keeps a single span between two posts", () => {
    const start = { x: 0, y: 0 };
    const end = { x: 0.001, y: 0 };
    const line = buildLine("line-1", start, end);

    const posts = [buildPost("post-start", start), buildPost("post-end", end)];

    const { spans } = derivePostSpans([line], posts);

    expect(spans).toHaveLength(1);
    expect(spans[0]?.lengthM).toBeCloseTo(line.length_mm / 1000, 3);
  });
});

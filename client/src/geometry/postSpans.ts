import type { FenceLine, Point, Post } from "@/types/models";
import { distanceMetersProjected, lngLatToMercatorMeters } from "@/lib/geo";
import { generateId } from "@/lib/ids";

const POINT_KEY_PRECISION = 6;

const pointKey = (point: Point) =>
  `${point.x.toFixed(POINT_KEY_PRECISION)},${point.y.toFixed(POINT_KEY_PRECISION)}`;

const projectPointToSegment = (p: Point, a: Point, b: Point) => {
  const aMeters = lngLatToMercatorMeters(a);
  const bMeters = lngLatToMercatorMeters(b);
  const pMeters = lngLatToMercatorMeters(p);
  const ab = { x: bMeters.x - aMeters.x, y: bMeters.y - aMeters.y };
  const abLenSq = ab.x * ab.x + ab.y * ab.y;
  if (abLenSq === 0) {
    return { t: 0, distanceSq: distanceMetersProjected(p, a) ** 2 };
  }

  const ap = { x: pMeters.x - aMeters.x, y: pMeters.y - aMeters.y };
  let t = (ap.x * ab.x + ap.y * ab.y) / abLenSq;
  t = Math.max(0, Math.min(1, t));
  const projMeters = { x: aMeters.x + ab.x * t, y: aMeters.y + ab.y * t };
  const dx = pMeters.x - projMeters.x;
  const dy = pMeters.y - projMeters.y;

  return { t, distanceSq: dx * dx + dy * dy };
};

type OrderedSegment = {
  id: string;
  a: Point;
  b: Point;
  lengthM: number;
  startStationM: number;
};

export type OrderedPostStation = {
  post: Post;
  stationM: number;
};

export type PostSpan = {
  id: string;
  fromPostId: string;
  toPostId: string;
  lengthM: number;
};

const buildOrderedSegments = (lines: FenceLine[]): OrderedSegment[] => {
  if (lines.length === 0) return [];

  const endpointMap = new Map<string, { point: Point; lineIds: string[] }>();
  const unusedLines = new Map(lines.map((line) => [line.id, line]));

  const addEndpoint = (point: Point, lineId: string) => {
    const key = pointKey(point);
    const existing = endpointMap.get(key);
    if (existing) {
      existing.lineIds.push(lineId);
    } else {
      endpointMap.set(key, { point, lineIds: [lineId] });
    }
  };

  lines.forEach((line) => {
    addEndpoint(line.a, line.id);
    addEndpoint(line.b, line.id);
  });

  const endpoints = Array.from(endpointMap.entries());
  const startKey = endpoints.find(([, data]) => data.lineIds.length === 1)?.[0]
    ?? pointKey(lines[0].a);

  const ordered: OrderedSegment[] = [];
  let currentKey: string | null = startKey;
  let totalStation = 0;

  while (unusedLines.size > 0) {
    if (!currentKey) {
      const nextLine = unusedLines.values().next().value as FenceLine | undefined;
      if (!nextLine) break;
      currentKey = pointKey(nextLine.a);
    }

    const node = endpointMap.get(currentKey);
    const candidateId = node?.lineIds.find((id) => unusedLines.has(id));

    if (!candidateId) {
      currentKey = null;
      continue;
    }

    const line = unusedLines.get(candidateId);
    if (!line) {
      currentKey = null;
      continue;
    }

    unusedLines.delete(candidateId);

    const isForward = pointKey(line.a) === currentKey;
    const start = isForward ? line.a : line.b;
    const end = isForward ? line.b : line.a;

    const lengthM = line.length_mm / 1000;

    ordered.push({
      id: line.id,
      a: start,
      b: end,
      lengthM,
      startStationM: totalStation,
    });

    totalStation += lengthM;
    currentKey = pointKey(end);
  }

  return ordered;
};

export const derivePostSpans = (lines: FenceLine[], posts: Post[]) => {
  if (lines.length === 0 || posts.length < 2) {
    return {
      orderedPosts: [] as OrderedPostStation[],
      spans: [] as PostSpan[],
    };
  }

  const orderedSegments = buildOrderedSegments(lines);
  if (orderedSegments.length === 0) {
    return {
      orderedPosts: [] as OrderedPostStation[],
      spans: [] as PostSpan[],
    };
  }

  const orderedPosts: OrderedPostStation[] = posts.map((post) => {
    let bestStation = 0;
    let bestDistance = Number.POSITIVE_INFINITY;

    orderedSegments.forEach((segment) => {
      const { t, distanceSq } = projectPointToSegment(post.pos, segment.a, segment.b);
      if (distanceSq < bestDistance) {
        bestDistance = distanceSq;
        bestStation = segment.startStationM + segment.lengthM * t;
      }
    });

    return {
      post,
      stationM: bestStation,
    };
  });

  orderedPosts.sort((a, b) => {
    if (a.stationM === b.stationM) {
      return a.post.id.localeCompare(b.post.id);
    }
    return a.stationM - b.stationM;
  });

  const spans: PostSpan[] = [];

  for (let i = 0; i < orderedPosts.length - 1; i++) {
    const from = orderedPosts[i];
    const to = orderedPosts[i + 1];
    const lengthM = to.stationM - from.stationM;

    if (!Number.isFinite(lengthM) || lengthM <= 0.0005) continue;

    spans.push({
      id: generateId("span"),
      fromPostId: from.post.id,
      toPostId: to.post.id,
      lengthM,
    });
  }

  return {
    orderedPosts,
    spans,
  };
};

import type { LocationPoint } from "@/lib/domain/types";
import { LOCATION_UNIT_TO_METERS } from "./lap";

export interface TrackProjection {
  /** project raw x/y into viewBox coordinates (y flipped for screen) */
  project: (x: number, y: number) => { x: number; y: number };
  viewBox: string;
  width: number;
  height: number;
}

/**
 * Fit circuit location points into an SVG viewBox preserving aspect ratio.
 * Pure and unit-tested.
 */
export function fitTrack(points: LocationPoint[], width = 800, height = 600, padding = 24): TrackProjection | null {
  if (points.length < 3) return null;
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const w = maxX - minX || 1;
  const h = maxY - minY || 1;
  const scale = Math.min((width - 2 * padding) / w, (height - 2 * padding) / h);
  const offX = padding + (width - 2 * padding - w * scale) / 2;
  const offY = padding + (height - 2 * padding - h * scale) / 2;
  return {
    project: (x, y) => ({
      x: offX + (x - minX) * scale,
      y: height - (offY + (y - minY) * scale), // flip y
    }),
    viewBox: `0 0 ${width} ${height}`,
    width,
    height,
  };
}

/** Total length of a closed loop of location points in meters (approx). */
export function trackLengthMeters(points: LocationPoint[]): number | null {
  if (points.length < 3) return null;
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  len += Math.hypot(points[0].x - points[points.length - 1].x, points[0].y - points[points.length - 1].y);
  return len * LOCATION_UNIT_TO_METERS;
}

export const DONOR_SCAN_START_KM = 0.01;
export const DONOR_SCAN_STEP_KM = 0.01;
export const DONOR_MAP_ZOOM_STEP_KM = 0.25;
export const DONOR_RADAR_PING_INTERVAL_MS = 1600;

const DONOR_SCAN_REFERENCE_RADIUS_KM = 20;
const DONOR_SCAN_REFERENCE_DURATION_MS = 2 * 60 * 1000;

export function getDonorScanDurationMs(radiusKm: number) {
  const safeRadiusKm = Math.max(DONOR_SCAN_START_KM, radiusKm);

  return Math.round(
    (safeRadiusKm / DONOR_SCAN_REFERENCE_RADIUS_KM) * DONOR_SCAN_REFERENCE_DURATION_MS,
  );
}

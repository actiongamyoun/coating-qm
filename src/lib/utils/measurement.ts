/**
 * DFT 측정 관련 유틸리티
 */

/**
 * 최소 측정 포인트 계산
 * 규칙: 면적 1㎡당 1포인트, 최소 5포인트
 *
 * @param areaTotal 구역 면적 (㎡)
 * @returns 최소 측정 포인트 수 (null이면 면적 정보 없음)
 */
export function calcMinMeasurementPoints(areaTotal: number | null | undefined): number | null {
  if (areaTotal === null || areaTotal === undefined || areaTotal <= 0) {
    return null
  }
  const calculated = Math.ceil(areaTotal)
  return Math.max(5, calculated)
}

/**
 * 측정값(횟수)이 최소 포인트를 만족하는지 확인
 */
export function isMeasurementCountSufficient(
  count: number | null | undefined,
  areaTotal: number | null | undefined,
): boolean {
  const minPoints = calcMinMeasurementPoints(areaTotal)
  if (minPoints === null) return true // 면적 없으면 검증 skip
  if (count === null || count === undefined || count <= 0) return false
  return count >= minPoints
}

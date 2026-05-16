/**
 * Psychrometric Calculations
 * 사이크로미터 계산 — 건구온도와 습구온도로부터 상대습도, 이슬점 도출
 *
 * 사용된 공식:
 * - 포화 수증기압: Magnus-Tetens (1930) 근사식
 * - 실제 수증기압: 사이크로미터 방정식 (사이크로미터 상수 사용)
 * - 이슬점: Magnus 역산
 *
 * 표준 대기압 1013.25 hPa 사용 (도장 검사 일반 환경)
 */

const STANDARD_PRESSURE = 1013.25 // hPa
const PSYCHROMETRIC_CONSTANT = 0.000662 // °C^-1, 사이크로미터 상수 (통풍식)

/**
 * 포화 수증기압 [hPa]
 * Magnus-Tetens 공식
 */
function saturationVaporPressure(tempC: number): number {
  return 6.1078 * Math.pow(10, (7.5 * tempC) / (237.3 + tempC))
}

/**
 * 건구·습구로부터 실제 수증기압 [hPa]
 */
function actualVaporPressure(dryBulbC: number, wetBulbC: number): number {
  const es_wet = saturationVaporPressure(wetBulbC)
  return es_wet - PSYCHROMETRIC_CONSTANT * STANDARD_PRESSURE * (dryBulbC - wetBulbC)
}

/**
 * 건구·습구로부터 상대습도 [%] 계산
 */
export function calcRelativeHumidity(dryBulbC: number, wetBulbC: number): number {
  if (wetBulbC > dryBulbC) {
    // 습구가 건구보다 높으면 비물리적 — 그대로 100% 처리
    return 100
  }
  const e = actualVaporPressure(dryBulbC, wetBulbC)
  const es = saturationVaporPressure(dryBulbC)
  const rh = (e / es) * 100
  return Math.max(0, Math.min(100, rh))
}

/**
 * 건구온도, 상대습도로부터 이슬점 [℃] 계산
 * Magnus 역산
 */
export function calcDewPoint(dryBulbC: number, relativeHumidity: number): number {
  const a = 17.27
  const b = 237.7
  const rhFraction = Math.max(0.01, Math.min(100, relativeHumidity)) / 100
  const alpha = (a * dryBulbC) / (b + dryBulbC) + Math.log(rhFraction)
  return (b * alpha) / (a - alpha)
}

/**
 * 종합 계산 — 건구, 습구, 표면온도 입력 시 모든 값 계산
 *
 * @returns 계산 결과
 *   - humidity: 상대습도 [%]
 *   - dewPoint: 이슬점 [℃]
 *   - deltaT: 표면 - 이슬점 [℃]
 *   - deltaTOk: ≥3℃ 만족 여부
 *   - humidityOk: ≤85% 만족 여부
 *   - inputValid: 입력값 유효성 (건구 > 습구)
 */
export function calcEnvFromWetDry(
  dryBulbC: number,
  wetBulbC: number,
  surfaceC: number
): {
  humidity: number
  dewPoint: number
  deltaT: number
  deltaTOk: boolean
  humidityOk: boolean
  inputValid: boolean
} {
  const inputValid = wetBulbC <= dryBulbC
  const humidity = calcRelativeHumidity(dryBulbC, wetBulbC)
  const dewPoint = calcDewPoint(dryBulbC, humidity)
  const deltaT = surfaceC - dewPoint
  return {
    humidity,
    dewPoint,
    deltaT,
    deltaTOk: deltaT >= 3,
    humidityOk: humidity <= 85,
    inputValid,
  }
}

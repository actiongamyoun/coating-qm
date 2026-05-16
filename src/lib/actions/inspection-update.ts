'use server'

import { createClient } from '@/lib/supabase/server'
import { calcEnvFromWetDry } from '@/lib/utils/psychrometric'

// ============================================
// 권한 체크
// ============================================
async function canEditSession(sessionId: string, userId: string) {
  const supabase = await createClient()

  // 사용자 역할 조회
  const { data: user } = await supabase
    .from('users')
    .select('id, role')
    .eq('id', userId)
    .maybeSingle()

  if (!user) return { ok: false, reason: '등록되지 않은 사용자' }

  // QM/관리자: 모든 검사 수정 가능
  if (user.role === 'qm' || user.role === 'admin') {
    return { ok: true }
  }

  // 도료사: 본인 입력 검사만
  if (user.role === 'maker') {
    const { data: session } = await supabase
      .from('inspection_sessions')
      .select('recorded_by')
      .eq('id', sessionId)
      .maybeSingle()
    if (!session) return { ok: false, reason: '검사를 찾을 수 없음' }
    if (session.recorded_by !== userId) {
      return { ok: false, reason: '본인이 입력한 검사만 수정할 수 있습니다' }
    }
    return { ok: true }
  }

  return { ok: false, reason: '수정 권한이 없습니다' }
}

// ============================================
// 환경 측정 수정 — 건구·습구·표면 입력
// ============================================
export async function updateEnvMeasurement(
  sessionId: string,
  userId: string,
  data: {
    air_temp: string       // 건구온도
    wet_bulb_temp: string  // 습구온도
    surface_temp: string   // 표면온도
  }
) {
  const perm = await canEditSession(sessionId, userId)
  if (!perm.ok) return { success: false, error: perm.reason }

  const supabase = await createClient()

  const Td = parseFloat(data.air_temp)
  const Tw = parseFloat(data.wet_bulb_temp)
  const Ts = parseFloat(data.surface_temp)

  if (isNaN(Td) || isNaN(Tw) || isNaN(Ts)) {
    return { success: false, error: '숫자 형식이 올바르지 않습니다' }
  }
  if (Tw > Td) {
    return { success: false, error: '습구온도는 건구온도보다 클 수 없습니다' }
  }

  // 사이크로미터 계산
  const calc = calcEnvFromWetDry(Td, Tw, Ts)

  const payload = {
    session_id: sessionId,
    air_temp: Td,
    wet_bulb_temp: Tw,
    surface_temp: Ts,
    humidity: calc.humidity,
    dew_point: calc.dewPoint,
    delta_t: calc.deltaT,
    last_modified_by: userId,
    last_modified_at: new Date().toISOString(),
  }

  // 기존 행이 있는지 확인
  const { data: existing } = await supabase
    .from('env_measurements')
    .select('session_id')
    .eq('session_id', sessionId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('env_measurements')
      .update(payload)
      .eq('session_id', sessionId)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await supabase
      .from('env_measurements')
      .insert({ ...payload, recorded_by: userId })
    if (error) return { success: false, error: error.message }
  }

  return { success: true }
}

// ============================================
// Batch 수정 (도료별 1행)
// ============================================
export async function updateBatchRecord(
  sessionId: string,
  userId: string,
  paintName: string,
  data: {
    base_no: string
    hardener_no: string
  }
) {
  const perm = await canEditSession(sessionId, userId)
  if (!perm.ok) return { success: false, error: perm.reason }

  const supabase = await createClient()

  const payload = {
    base_no: data.base_no.trim() || null,
    hardener_no: data.hardener_no.trim() || null,
    last_modified_by: userId,
    last_modified_at: new Date().toISOString(),
  }

  // paint_name별로 행이 있는지 확인
  const { data: existing } = await supabase
    .from('batch_records')
    .select('id')
    .eq('session_id', sessionId)
    .eq('paint_name', paintName)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('batch_records')
      .update(payload)
      .eq('id', existing.id)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await supabase
      .from('batch_records')
      .insert({
        session_id: sessionId,
        paint_name: paintName,
        ...payload,
        recorded_by: userId,
      })
    if (error) return { success: false, error: error.message }
  }

  return { success: true }
}

// ============================================
// 표면 측정 수정 (구역별)
// ============================================
export async function updateSurfaceMeasurement(
  sessionId: string,
  userId: string,
  zoneId: string,
  data: {
    salt: string
    dust_size: string
    dust_quantity: string
    profile: string
  }
) {
  const perm = await canEditSession(sessionId, userId)
  if (!perm.ok) return { success: false, error: perm.reason }

  const supabase = await createClient()

  const payload = {
    session_id: sessionId,
    zone_id: zoneId,
    salt: data.salt ? Number(data.salt) : null,
    dust_size: data.dust_size ? Number(data.dust_size) : null,
    dust_quantity: data.dust_quantity ? Number(data.dust_quantity) : null,
    profile: data.profile ? Number(data.profile) : null,
    last_modified_by: userId,
    last_modified_at: new Date().toISOString(),
  }

  const { data: existing } = await supabase
    .from('surface_measurements')
    .select('id')
    .eq('session_id', sessionId)
    .eq('zone_id', zoneId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('surface_measurements')
      .update(payload)
      .eq('id', existing.id)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await supabase
      .from('surface_measurements')
      .insert({ ...payload, recorded_by: userId })
    if (error) return { success: false, error: error.message }
  }

  return { success: true }
}

// ============================================
// DFT 측정 수정 (구역별)
// ============================================
export async function updateDftMeasurement(
  sessionId: string,
  userId: string,
  zoneId: string,
  data: {
    avg_value: string
    min_value: string
    max_value: string
    measurement_count: string
  }
) {
  const perm = await canEditSession(sessionId, userId)
  if (!perm.ok) return { success: false, error: perm.reason }

  const supabase = await createClient()

  const payload = {
    session_id: sessionId,
    zone_id: zoneId,
    avg_value: data.avg_value ? Number(data.avg_value) : null,
    min_value: data.min_value ? Number(data.min_value) : null,
    max_value: data.max_value ? Number(data.max_value) : null,
    measurement_count: data.measurement_count ? Number(data.measurement_count) : null,
    last_modified_by: userId,
    last_modified_at: new Date().toISOString(),
  }

  const { data: existing } = await supabase
    .from('dft_measurements')
    .select('id')
    .eq('session_id', sessionId)
    .eq('zone_id', zoneId)
    .maybeSingle()

  if (existing) {
    const { error } = await supabase
      .from('dft_measurements')
      .update(payload)
      .eq('id', existing.id)
    if (error) return { success: false, error: error.message }
  } else {
    const { error } = await supabase
      .from('dft_measurements')
      .insert({ ...payload, recorded_by: userId })
    if (error) return { success: false, error: error.message }
  }

  return { success: true }
}

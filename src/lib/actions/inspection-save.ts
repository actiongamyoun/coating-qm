'use server'
import { createClient } from '@/lib/supabase/server'
import type { WizardState } from '@/app/maker/new/Wizard'
import { calcEnvFromWetDry } from '@/lib/utils/psychrometric'

/**
 * Step 2 완료 시 호출 — 세션 + session_zones만 생성
 */
export async function createInspectionSession(
  state: Pick<WizardState, 'ship_id' | 'block_id' | 'coat_order' | 'coat_label' | 'inspected_at' | 'zone_ids'>,
  userId: string
) {
  const supabase = await createClient()
  try {
    const { data: session, error: sessionErr } = await supabase
      .from('inspection_sessions')
      .insert({
        ship_id: state.ship_id,
        block_id: state.block_id,
        coat_order: state.coat_order,
        coat_label: state.coat_label,
        recorded_by: userId,
        inspected_at: state.inspected_at,
      })
      .select('id')
      .single()
    if (sessionErr) throw sessionErr
    const sessionId = session.id

    if (state.zone_ids.length > 0) {
      const rows = state.zone_ids.map(zone_id => ({
        session_id: sessionId,
        zone_id,
      }))
      const { error } = await supabase.from('session_zones').insert(rows)
      if (error) throw error
    }

    return { success: true, session_id: sessionId }
  } catch (error: unknown) {
    console.error('createInspectionSession error:', error)
    const msg = error instanceof Error ? error.message : '세션 생성 실패'
    return { success: false, error: msg }
  }
}

/**
 * 환경 측정 저장 헬퍼 — 건구·습구·표면으로부터 모든 값 계산 후 insert
 */
async function insertEnvMeasurement(
  sessionId: string,
  userId: string,
  dryStr: string,
  wetStr: string,
  surfaceStr: string,
) {
  const Td = parseFloat(dryStr)
  const Tw = parseFloat(wetStr)
  const Ts = parseFloat(surfaceStr)
  if (isNaN(Td) || isNaN(Tw) || isNaN(Ts)) return null

  const calc = calcEnvFromWetDry(Td, Tw, Ts)
  return {
    session_id: sessionId,
    air_temp: Td,           // 건구온도
    wet_bulb_temp: Tw,      // 습구온도
    surface_temp: Ts,       // 표면온도
    humidity: calc.humidity,
    dew_point: calc.dewPoint,
    delta_t: calc.deltaT,
    recorded_by: userId,
  }
}

/**
 * 기존 함수 — 한꺼번에 저장 (session_id 없을 때만 사용)
 */
export async function saveInspection(state: WizardState, userId: string) {
  const supabase = await createClient()
  try {
    const { data: session, error: sessionErr } = await supabase
      .from('inspection_sessions')
      .insert({
        ship_id: state.ship_id,
        block_id: state.block_id,
        coat_order: state.coat_order,
        coat_label: state.coat_label,
        recorded_by: userId,
        inspected_at: state.inspected_at,
      })
      .select('id')
      .single()
    if (sessionErr) throw sessionErr
    const sessionId = session.id

    if (state.zone_ids.length > 0) {
      const rows = state.zone_ids.map(zone_id => ({
        session_id: sessionId,
        zone_id,
      }))
      const { error } = await supabase.from('session_zones').insert(rows)
      if (error) throw error
    }

    const envRow = await insertEnvMeasurement(
      sessionId, userId,
      state.env_air_temp, state.env_wet_bulb_temp, state.env_surface_temp,
    )
    if (envRow) {
      const { error } = await supabase.from('env_measurements').insert(envRow)
      if (error) throw error
    }

    const validBatches = state.batches.filter(b =>
      b.base_no.trim() || b.hardener_no.trim()
    )
    if (validBatches.length > 0) {
      const rows = validBatches.map(b => ({
        session_id: sessionId,
        paint_name: b.paint_name,
        base_no: b.base_no.trim() || null,
        hardener_no: b.hardener_no.trim() || null,
        recorded_by: userId,
      }))
      const { error } = await supabase.from('batch_records').insert(rows)
      if (error) throw error
    }

    const isFirst = state.coat_order === 1
    if (isFirst) {
      const rows = state.measurements
        .filter(m => m.salt || m.dust_size || m.dust_quantity || m.profile)
        .map(m => ({
          session_id: sessionId,
          zone_id: m.zone_id,
          salt: m.salt ? Number(m.salt) : null,
          dust_size: m.dust_size ? Number(m.dust_size) : null,
          dust_quantity: m.dust_quantity ? Number(m.dust_quantity) : null,
          profile: m.profile ? Number(m.profile) : null,
          recorded_by: userId,
        }))
      if (rows.length > 0) {
        const { error } = await supabase.from('surface_measurements').insert(rows)
        if (error) throw error
      }
    } else {
      const rows = state.measurements
        .filter(m => m.dft_avg || m.dft_min || m.dft_max)
        .map(m => ({
          session_id: sessionId,
          zone_id: m.zone_id,
          avg_value: m.dft_avg ? Number(m.dft_avg) : null,
          min_value: m.dft_min ? Number(m.dft_min) : null,
          max_value: m.dft_max ? Number(m.dft_max) : null,
          measurement_count: m.dft_count ? Number(m.dft_count) : null,
          recorded_by: userId,
        }))
      if (rows.length > 0) {
        const { error } = await supabase.from('dft_measurements').insert(rows)
        if (error) throw error
      }
    }
    return { success: true, session_id: sessionId }
  } catch (error: unknown) {
    console.error('Save inspection error:', error)
    const msg = error instanceof Error ? error.message : '저장 실패'
    return { success: false, error: msg }
  }
}

/**
 * 기존 세션에 환경/Batch/측정 데이터만 추가 (session_id 이미 있을 때)
 */
export async function fillInspectionData(
  sessionId: string,
  state: WizardState,
  userId: string
) {
  const supabase = await createClient()
  try {
    const { data: existingEnv } = await supabase
      .from('env_measurements')
      .select('session_id')
      .eq('session_id', sessionId)
      .maybeSingle()

    if (!existingEnv) {
      const envRow = await insertEnvMeasurement(
        sessionId, userId,
        state.env_air_temp, state.env_wet_bulb_temp, state.env_surface_temp,
      )
      if (envRow) {
        const { error } = await supabase.from('env_measurements').insert(envRow)
        if (error) throw error
      }
    }

    const validBatches = state.batches.filter(b =>
      b.base_no.trim() || b.hardener_no.trim()
    )
    for (const b of validBatches) {
      const { data: existing } = await supabase
        .from('batch_records')
        .select('id')
        .eq('session_id', sessionId)
        .eq('paint_name', b.paint_name)
        .maybeSingle()
      if (!existing) {
        const { error } = await supabase.from('batch_records').insert({
          session_id: sessionId,
          paint_name: b.paint_name,
          base_no: b.base_no.trim() || null,
          hardener_no: b.hardener_no.trim() || null,
          recorded_by: userId,
        })
        if (error) throw error
      }
    }

    const isFirst = state.coat_order === 1
    if (isFirst) {
      const validRows = state.measurements.filter(m =>
        m.salt || m.dust_size || m.dust_quantity || m.profile
      )
      for (const m of validRows) {
        const { data: existing } = await supabase
          .from('surface_measurements')
          .select('id')
          .eq('session_id', sessionId)
          .eq('zone_id', m.zone_id)
          .maybeSingle()
        if (!existing) {
          const { error } = await supabase.from('surface_measurements').insert({
            session_id: sessionId,
            zone_id: m.zone_id,
            salt: m.salt ? Number(m.salt) : null,
            dust_size: m.dust_size ? Number(m.dust_size) : null,
            dust_quantity: m.dust_quantity ? Number(m.dust_quantity) : null,
            profile: m.profile ? Number(m.profile) : null,
            recorded_by: userId,
          })
          if (error) throw error
        }
      }
    } else {
      const validRows = state.measurements.filter(m =>
        m.dft_avg || m.dft_min || m.dft_max
      )
      for (const m of validRows) {
        const { data: existing } = await supabase
          .from('dft_measurements')
          .select('id')
          .eq('session_id', sessionId)
          .eq('zone_id', m.zone_id)
          .maybeSingle()
        if (!existing) {
          const { error } = await supabase.from('dft_measurements').insert({
            session_id: sessionId,
            zone_id: m.zone_id,
            avg_value: m.dft_avg ? Number(m.dft_avg) : null,
            min_value: m.dft_min ? Number(m.dft_min) : null,
            max_value: m.dft_max ? Number(m.dft_max) : null,
            measurement_count: m.dft_count ? Number(m.dft_count) : null,
            recorded_by: userId,
          })
          if (error) throw error
        }
      }
    }

    return { success: true }
  } catch (error: unknown) {
    console.error('fillInspectionData error:', error)
    const msg = error instanceof Error ? error.message : '저장 실패'
    return { success: false, error: msg }
  }
}

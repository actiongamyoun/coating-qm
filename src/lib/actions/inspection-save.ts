'use server'
import { createClient } from '@/lib/supabase/server'
import type { WizardState } from '@/app/maker/new/Wizard'

/**
 * Step 2 완료 시 호출 — 세션 + session_zones만 생성
 * 환경/Batch/측정은 별도 단계에서 저장
 */
export async function createInspectionSession(
  state: Pick<WizardState, 'ship_id' | 'block_id' | 'coat_order' | 'coat_label' | 'inspected_at' | 'zone_ids'>,
  userId: string
) {
  const supabase = await createClient()
  try {
    // 1. 세션 생성
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

    // 2. session_zones 저장
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
 * 기존 함수 — Step 7에서 한꺼번에 저장 (패치 1에서는 session_id 없을 때만 사용)
 * 패치 2에서 각 Step이 자체 저장하게 되면 이 함수는 제거 예정
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

    const T = parseFloat(state.env_air_temp)
    const Ts = parseFloat(state.env_surface_temp)
    const RH = parseFloat(state.env_humidity)
    if (!isNaN(T) && !isNaN(Ts) && !isNaN(RH)) {
      const a = 17.27, b = 237.7
      const alpha = (a * T) / (b + T) + Math.log(RH / 100)
      const dewPoint = (b * alpha) / (a - alpha)
      const deltaT = Ts - dewPoint
      const { error } = await supabase.from('env_measurements').insert({
        session_id: sessionId,
        air_temp: T,
        surface_temp: Ts,
        humidity: RH,
        dew_point: dewPoint,
        delta_t: deltaT,
        recorded_by: userId,
      })
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
 * 기존에 만든 세션의 환경/Batch/측정만 저장 (이미 session_id 있을 때)
 * Step 7에서 호출
 */
export async function fillInspectionData(
  sessionId: string,
  state: WizardState,
  userId: string
) {
  const supabase = await createClient()
  try {
    // 환경 (이미 있으면 무시 — env_measurements는 session_id별 1개)
    const { data: existingEnv } = await supabase
      .from('env_measurements')
      .select('session_id')
      .eq('session_id', sessionId)
      .maybeSingle()

    if (!existingEnv) {
      const T = parseFloat(state.env_air_temp)
      const Ts = parseFloat(state.env_surface_temp)
      const RH = parseFloat(state.env_humidity)
      if (!isNaN(T) && !isNaN(Ts) && !isNaN(RH)) {
        const a = 17.27, b = 237.7
        const alpha = (a * T) / (b + T) + Math.log(RH / 100)
        const dewPoint = (b * alpha) / (a - alpha)
        const deltaT = Ts - dewPoint
        const { error } = await supabase.from('env_measurements').insert({
          session_id: sessionId,
          air_temp: T,
          surface_temp: Ts,
          humidity: RH,
          dew_point: dewPoint,
          delta_t: deltaT,
          recorded_by: userId,
        })
        if (error) throw error
      }
    }

    // Batch (도료별로 이미 있으면 건너뜀)
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

    // 측정 (zone별 이미 있으면 건너뜀)
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

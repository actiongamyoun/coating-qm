'use server'

import { createClient } from '@/lib/supabase/server'
import type { WizardState } from '@/app/maker/new/Wizard'

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

'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * 검사 세션 목록 조회
 * - userId 지정 시: 해당 사용자가 기록한 세션만
 * - shipId 지정 시: 특정 호선의 모든 세션
 * - 둘 다 없으면: 전체
 */
export async function getSessions(params: {
  userId?: string
  shipId?: string
  limit?: number
} = {}) {
  const supabase = await createClient()
  let query = supabase
    .from('inspection_sessions')
    .select(`
      id, ship_id, block_id, coat_order, coat_label, inspected_at, created_at,
      ships(name, ship_type),
      blocks(code),
      users(name, role, paint_makers(name))
    `)
    .order('inspected_at', { ascending: false })
    .limit(params.limit || 50)

  if (params.userId) query = query.eq('recorded_by', params.userId)
  if (params.shipId) query = query.eq('ship_id', params.shipId)

  const { data, error } = await query
  if (error) {
    console.error('getSessions error:', error)
    return []
  }

  return (data || []).map(s => {
    const ship = s.ships as { name?: string; ship_type?: string | null } | null
    const block = s.blocks as { code?: string } | null
    const user = s.users as { name?: string; role?: string; paint_makers?: { name?: string } | null } | null
    return {
      id: s.id,
      ship_id: s.ship_id,
      block_id: s.block_id,
      coat_order: s.coat_order,
      coat_label: s.coat_label,
      inspected_at: s.inspected_at,
      created_at: s.created_at,
      ship_name: ship?.name || '',
      ship_type: ship?.ship_type || null,
      block_code: block?.code || '',
      recorder_name: user?.name || '',
      recorder_role: user?.role || '',
      recorder_maker: user?.paint_makers?.name || '',
    }
  })
}

/**
 * 특정 세션의 상세 조회
 * 환경 + Batch + 표면측정 + DFT 측정 + 구역 + 마스터 사양까지 한 번에
 */
export async function getSessionDetail(sessionId: string) {
  const supabase = await createClient()

  // 1. 세션 기본
  const { data: session, error: sessErr } = await supabase
    .from('inspection_sessions')
    .select(`
      id, ship_id, block_id, coat_order, coat_label, inspected_at, created_at,
      ships(name, ship_type),
      blocks(code, vendors(name, vendor_type)),
      users(name, role, paint_makers(name))
    `)
    .eq('id', sessionId)
    .maybeSingle()

  if (sessErr || !session) {
    console.error('getSessionDetail error:', sessErr)
    return null
  }

  // 2. 환경
  const { data: env } = await supabase
    .from('env_measurements')
    .select('air_temp, surface_temp, humidity, dew_point, delta_t')
    .eq('session_id', sessionId)
    .maybeSingle()

  // 3. Batch
  const { data: batches } = await supabase
    .from('batch_records')
    .select('paint_name, base_no, hardener_no, created_at')
    .eq('session_id', sessionId)
    .order('created_at')

  // 4. 세션이 다룬 구역들 + 각 구역의 회차 사양
  const { data: sessionZones } = await supabase
    .from('session_zones')
    .select(`
      zone_id,
      zones (
        id, name, code, is_pspc, area_total,
        coating_specs (coat_order, paint_name, dft_target, paint_makers(name))
      )
    `)
    .eq('session_id', sessionId)

  // 5. 표면 측정
  const { data: surfaces } = await supabase
    .from('surface_measurements')
    .select('zone_id, salt, dust_size, dust_quantity, profile')
    .eq('session_id', sessionId)

  // 6. DFT
  const { data: dfts } = await supabase
    .from('dft_measurements')
    .select('zone_id, avg_value, min_value, max_value, measurement_count')
    .eq('session_id', sessionId)

  type ZoneRow = {
    id: string
    name: string
    code: string | null
    is_pspc: boolean
    area_total: number | null
    coating_specs: Array<{
      coat_order: number
      paint_name: string
      dft_target: number | null
      paint_makers: { name?: string } | null
    }> | null
  }

  // 구역마다 측정 데이터 매칭
  const zones = (sessionZones || []).map(sz => {
    const z = sz.zones as unknown as ZoneRow
    const spec = (z?.coating_specs || []).find(s => s.coat_order === session.coat_order)
    const surface = (surfaces || []).find(s => s.zone_id === sz.zone_id)
    const dft = (dfts || []).find(d => d.zone_id === sz.zone_id)
    return {
      zone_id: sz.zone_id,
      zone_name: z?.name || '',
      zone_code: z?.code || '',
      is_pspc: z?.is_pspc || false,
      area_total: z?.area_total || null,
      paint_name: spec?.paint_name || '',
      dft_target: spec?.dft_target ?? null,
      maker_name: spec?.paint_makers?.name || '',
      surface: surface
        ? {
            salt: surface.salt,
            dust_size: surface.dust_size,
            dust_quantity: surface.dust_quantity,
            profile: surface.profile,
          }
        : null,
      dft: dft
        ? {
            avg: dft.avg_value,
            min: dft.min_value,
            max: dft.max_value,
            count: dft.measurement_count,
          }
        : null,
    }
  })

  const ship = session.ships as { name?: string; ship_type?: string | null } | null
  const blockRaw = session.blocks as {
    code?: string
    vendors?: { name?: string; vendor_type?: string | null } | null
  } | null
  const recorder = session.users as { name?: string; role?: string; paint_makers?: { name?: string } | null } | null

  return {
    id: session.id,
    ship_id: session.ship_id,
    block_id: session.block_id,
    coat_order: session.coat_order,
    coat_label: session.coat_label,
    inspected_at: session.inspected_at,
    created_at: session.created_at,
    ship_name: ship?.name || '',
    ship_type: ship?.ship_type || null,
    block_code: blockRaw?.code || '',
    vendor_name: blockRaw?.vendors?.name || '',
    recorder_name: recorder?.name || '',
    recorder_role: recorder?.role || '',
    recorder_maker: recorder?.paint_makers?.name || '',
    env: env
      ? {
          air_temp: env.air_temp,
          surface_temp: env.surface_temp,
          humidity: env.humidity,
          dew_point: env.dew_point,
          delta_t: env.delta_t,
        }
      : null,
    batches: (batches || []).map(b => ({
      paint_name: b.paint_name,
      base_no: b.base_no,
      hardener_no: b.hardener_no,
    })),
    zones,
  }
}

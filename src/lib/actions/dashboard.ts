'use server'

import { createClient } from '@/lib/supabase/server'

/**
 * QM 대시보드용 호선 목록
 * 각 호선의 블록 수, 검사 세션 수, 미입력 건수까지 함께
 */
export async function getShipsWithStats() {
  const supabase = await createClient()

  const { data: ships, error } = await supabase
    .from('ships')
    .select('id, name, ship_type, projects(name)')
    .order('name')

  if (error || !ships) return []

  return ships.map(s => ({
    id: s.id,
    name: s.name,
    ship_type: s.ship_type,
    project_name: (s.projects as { name?: string } | null)?.name || '',
  }))
}

/**
 * 특정 호선의 블록별 진척률
 * - 각 블록의 회차(1~5, FINAL)별 완료 여부
 * - 완료 = inspection_sessions에 해당 (블록, 회차) 조합 존재
 */
export async function getShipProgress(shipId: string) {
  const supabase = await createClient()

  // 1. 호선의 모든 블록
  const { data: blocks, error: blockErr } = await supabase
    .from('blocks')
    .select('id, code, vendors(name)')
    .eq('ship_id', shipId)
    .order('code')

  if (blockErr || !blocks) return []

  // 2. 호선의 모든 도장사양 (coat_order 추출용)
  const { data: specs } = await supabase
    .from('coating_specs')
    .select('zone_id, coat_order, zones(block_id)')
    .eq('ship_id', shipId)

  // 3. 호선의 모든 검사 세션
  const { data: sessions } = await supabase
    .from('inspection_sessions')
    .select('id, block_id, coat_order')
    .eq('ship_id', shipId)

  // 블록별로 묶기
  return blocks.map(b => {
    // 이 블록의 사양에서 등장하는 모든 회차
    const blockSpecs = (specs || []).filter(s => {
      const z = s.zones as { block_id?: string } | null
      return z?.block_id === b.id
    })
    const coatOrders = [...new Set(blockSpecs.map(s => s.coat_order))].sort((a, b) => a - b)

    // 이 블록의 완료된 회차
    const completedCoats = [...new Set(
      (sessions || []).filter(s => s.block_id === b.id).map(s => s.coat_order)
    )]

    // 진척률: 완료된 회차 수 / 전체 회차 수
    const total = coatOrders.length
    const done = coatOrders.filter(o => completedCoats.includes(o)).length
    const percent = total > 0 ? Math.round((done / total) * 100) : 0

    return {
      block_id: b.id,
      block_code: b.code,
      vendor_name: (b.vendors as { name?: string } | null)?.name || '',
      coat_orders: coatOrders, // 예: [1, 2, 3, 4, 5]
      completed_coats: completedCoats, // 예: [1, 2]
      total,
      done,
      percent,
    }
  })
}

/**
 * 미입력 항목이 있는 검사 세션들 (호선 단위)
 * 환경 미입력 / Batch 미입력 / 측정 미입력 중 하나라도 있으면 포함
 */
export async function getIncompleteSessions(shipId: string) {
  const supabase = await createClient()

  const { data: sessions, error } = await supabase
    .from('inspection_sessions')
    .select(`
      id, block_id, coat_order, coat_label, inspected_at,
      blocks(code),
      users(name, paint_makers(name)),
      env_measurements(session_id),
      batch_records(id),
      session_zones(zone_id, zones(is_pspc)),
      surface_measurements(zone_id, salt, dust_size, dust_quantity, profile),
      dft_measurements(zone_id, avg_value, min_value, max_value)
    `)
    .eq('ship_id', shipId)
    .order('inspected_at', { ascending: false })

  if (error || !sessions) return []

  type Session = {
    id: string
    block_id: string
    coat_order: number
    coat_label: string
    inspected_at: string
    blocks: { code?: string } | null
    users: { name?: string; paint_makers?: { name?: string } | null } | null
    env_measurements: unknown
    batch_records: Array<{ id: string }> | null
    session_zones: Array<{ zone_id: string; zones: { is_pspc?: boolean } | null }> | null
    surface_measurements: Array<{
      zone_id: string
      salt: number | null
      dust_size: number | null
      dust_quantity: number | null
      profile: number | null
    }> | null
    dft_measurements: Array<{
      zone_id: string
      avg_value: number | null
      min_value: number | null
      max_value: number | null
    }> | null
  }

  const result: Array<{
    id: string
    block_code: string
    coat_label: string
    coat_order: number
    inspected_at: string
    recorder_name: string
    recorder_maker: string
    missing: string[]
  }> = []

  for (const sRaw of sessions as unknown as Session[]) {
    const missing: string[] = []
    const isFinal = sRaw.coat_order === 99
    const isFirst = sRaw.coat_order === 1

    // 환경 미입력
    if (!sRaw.env_measurements) {
      missing.push('환경')
    }

    // Batch 미입력 (FINAL 제외)
    if (!isFinal && (!sRaw.batch_records || sRaw.batch_records.length === 0)) {
      missing.push('Batch')
    }

    // 측정 미입력
    const zones = sRaw.session_zones || []
    const targetZones = isFirst
      ? zones.filter(z => z.zones?.is_pspc)
      : zones

    if (isFirst) {
      const surfaceByZone = new Map(
        (sRaw.surface_measurements || []).map(m => [m.zone_id, m])
      )
      const missingZones = targetZones.filter(z => {
        const m = surfaceByZone.get(z.zone_id)
        return !m || (
          m.salt === null && m.dust_size === null &&
          m.dust_quantity === null && m.profile === null
        )
      })
      if (missingZones.length > 0) missing.push(`표면(${missingZones.length})`)
    } else {
      const dftByZone = new Map(
        (sRaw.dft_measurements || []).map(m => [m.zone_id, m])
      )
      const missingZones = targetZones.filter(z => {
        const m = dftByZone.get(z.zone_id)
        return !m || (m.avg_value === null && m.min_value === null && m.max_value === null)
      })
      if (missingZones.length > 0) missing.push(`DFT(${missingZones.length})`)
    }

    if (missing.length > 0) {
      result.push({
        id: sRaw.id,
        block_code: sRaw.blocks?.code || '',
        coat_label: sRaw.coat_label,
        coat_order: sRaw.coat_order,
        inspected_at: sRaw.inspected_at,
        recorder_name: sRaw.users?.name || '',
        recorder_maker: sRaw.users?.paint_makers?.name || '',
        missing,
      })
    }
  }

  return result
}

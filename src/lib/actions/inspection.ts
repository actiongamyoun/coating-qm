'use server'
import { createClient } from '@/lib/supabase/server'

/**
 * 호선 목록 조회
 * makerName이 있으면: 해당 도료사가 담당하는 zone이 하나라도 있는 호선만
 * makerName이 null이면: 전체 호선 (QM, 관리자용)
 */
export async function getShips(makerName?: string | null) {
  const supabase = await createClient()

  if (makerName) {
    // 도료사 담당 호선만
    const { data, error } = await supabase
      .from('paint_makers')
      .select(`
        id,
        coating_specs (
          zones (
            blocks (
              ships (
                id, name, ship_type,
                projects (name)
              )
            )
          )
        )
      `)
      .eq('name', makerName)
      .maybeSingle()

    if (error || !data) {
      console.error('getShips (filtered) error:', error)
      return []
    }

    // 중복 제거
    const shipMap = new Map<string, { id: string; name: string; ship_type: string | null; project_name: string }>()
    type SpecRow = {
      zones: { blocks: { ships: { id: string; name: string; ship_type: string | null; projects: { name: string } | null } | null } | null } | null
    }
    const specs = (data.coating_specs as unknown as SpecRow[]) || []
    for (const s of specs) {
      const ship = s.zones?.blocks?.ships
      if (ship && !shipMap.has(ship.id)) {
        shipMap.set(ship.id, {
          id: ship.id,
          name: ship.name,
          ship_type: ship.ship_type,
          project_name: ship.projects?.name || '',
        })
      }
    }

    return Array.from(shipMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  // 전체 호선
  const { data, error } = await supabase
    .from('ships')
    .select('id, name, ship_type, projects(name)')
    .order('name')
  if (error) {
    console.error(error)
    return []
  }
  return data.map(s => ({
    id: s.id,
    name: s.name,
    ship_type: s.ship_type,
    project_name: (s.projects as { name?: string } | null)?.name || '',
  }))
}

/**
 * 블록 목록 조회
 * makerName이 있으면: 해당 도료사가 담당하는 zone이 하나라도 있는 블록만
 * makerName이 null이면: 전체 블록
 */
export async function getBlocks(shipId: string, makerName?: string | null) {
  const supabase = await createClient()

  if (makerName) {
    // 도료사 담당 블록만
    const { data, error } = await supabase
      .from('paint_makers')
      .select(`
        id,
        coating_specs (
          zones (
            blocks (
              id, code, ship_id,
              vendors (id, name, vendor_type)
            )
          )
        )
      `)
      .eq('name', makerName)
      .maybeSingle()

    if (error || !data) {
      console.error('getBlocks (filtered) error:', error)
      return []
    }

    type BlockRow = {
      id: string
      code: string
      ship_id: string
      vendors: { id: string; name: string; vendor_type: string | null }[] | { id: string; name: string; vendor_type: string | null } | null
    }
    type SpecRow = {
      zones: { blocks: BlockRow | null } | null
    }

    const blockMap = new Map<string, { id: string; code: string; vendor: { id: string; name: string; vendor_type: string | null } | null }>()
    const specs = (data.coating_specs as unknown as SpecRow[]) || []
    for (const s of specs) {
      const b = s.zones?.blocks
      if (!b) continue
      if (b.ship_id !== shipId) continue
      if (blockMap.has(b.id)) continue
      blockMap.set(b.id, {
        id: b.id,
        code: b.code,
        vendor: Array.isArray(b.vendors)
          ? ((b.vendors[0] as { id: string; name: string; vendor_type: string | null }) ?? null)
          : (b.vendors ?? null),
      })
    }
    return Array.from(blockMap.values()).sort((a, b) => a.code.localeCompare(b.code))
  }

  // 전체 블록
  const { data, error } = await supabase
    .from('blocks')
    .select('id, code, vendors(id, name, vendor_type)')
    .eq('ship_id', shipId)
    .order('code')
  if (error) return []
  return data.map(b => ({
    id: b.id,
    code: b.code,
    vendor: Array.isArray(b.vendors)
      ? ((b.vendors[0] as { id: string; name: string; vendor_type: string | null }) ?? null)
      : ((b.vendors as { id: string; name: string; vendor_type: string | null } | null) ?? null),
  }))
}

/**
 * 블록·회차에 해당하는 구역 목록
 * makerName이 있으면: 해당 도료사 담당 구역만 (회색 표시 X, 아예 안 보임)
 * makerName이 null이면: 전체 구역
 */
export async function getZonesByBlockCoat(
  blockId: string,
  coatOrder: number,
  makerName: string | null
) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('zones')
    .select(`
      id, code, name, surface_prep, area_total, area_pre, is_pspc,
      coating_specs (
        id, coat_order, coat_label, paint_name, dft_target,
        paint_makers (id, name)
      )
    `)
    .eq('block_id', blockId)
    .order('name')
  if (error) {
    console.error(error)
    return []
  }
  type SpecItem = {
    id: string
    coat_order: number
    coat_label: string
    paint_name: string
    dft_target: number | null
    paint_makers: { id: string; name: string } | null
  }
  return data
    .map(z => {
      const specs = (z.coating_specs as unknown as SpecItem[]) || []
      const spec = specs.find(s => s.coat_order === coatOrder)
      const makerOfSpec = spec?.paint_makers?.name || null
      return {
        id: z.id,
        code: z.code,
        name: z.name,
        surface_prep: z.surface_prep,
        area_total: z.area_total,
        area_pre: z.area_pre,
        is_pspc: z.is_pspc,
        spec: spec
          ? {
              id: spec.id,
              paint_name: spec.paint_name,
              dft_target: spec.dft_target,
              maker_name: makerOfSpec,
            }
          : null,
        accessible: !spec ? false : !makerName || makerOfSpec === makerName,
      }
    })
    .filter(z => z.spec !== null)
    .filter(z => !makerName || z.accessible) // ★ 도료사 있으면 본인 것만
}

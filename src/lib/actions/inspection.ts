'use server'

import { createClient } from '@/lib/supabase/server'

export async function getShips() {
  const supabase = await createClient()
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

export async function getBlocks(shipId: string) {
  const supabase = await createClient()
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
}

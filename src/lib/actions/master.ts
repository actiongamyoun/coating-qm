'use server'

import { createClient } from '@/lib/supabase/server'
import type { MasterRow } from '@/types/master'

export async function saveMasterData(rows: MasterRow[]) {
  const supabase = await createClient()

  const valid = rows.filter(r => r.block?.trim() && r.name?.trim())
  if (valid.length === 0) {
    return { success: false, error: '저장할 데이터가 없습니다.' }
  }

  try {
    // 1. 프로젝트 upsert
    const projectNames = [...new Set(valid.map(r => r.project).filter(Boolean))]
    const projectMap = new Map<string, string>()
    for (const name of projectNames) {
      const { data: existing } = await supabase
        .from('projects').select('id').eq('name', name).maybeSingle()
      if (existing) {
        projectMap.set(name, existing.id)
      } else {
        const { data: inserted, error } = await supabase
          .from('projects').insert({ name }).select('id').single()
        if (error) throw error
        projectMap.set(name, inserted.id)
      }
    }

    // 2. 호선 upsert
    const shipKeys = [...new Set(valid.map(r => `${r.project}|${r.ship}`))]
    const shipMap = new Map<string, string>()
    for (const key of shipKeys) {
      const [pName, sName] = key.split('|')
      const projectId = projectMap.get(pName)
      if (!projectId) continue
      const { data: existing } = await supabase
        .from('ships').select('id')
        .eq('project_id', projectId).eq('name', sName).maybeSingle()
      if (existing) {
        shipMap.set(key, existing.id)
      } else {
        const { data: inserted, error } = await supabase
          .from('ships').insert({ project_id: projectId, name: sName })
          .select('id').single()
        if (error) throw error
        shipMap.set(key, inserted.id)
      }
    }

    // 3. 도료 메이커 upsert
    const makerNames = [...new Set(valid.map(r => r.maker).filter(Boolean))]
    const makerMap = new Map<string, string>()
    for (const name of makerNames) {
      const { data: existing } = await supabase
        .from('paint_makers').select('id').eq('name', name).maybeSingle()
      if (existing) {
        makerMap.set(name, existing.id)
      } else {
        const { data: inserted, error } = await supabase
          .from('paint_makers').insert({ name }).select('id').single()
        if (error) throw error
        makerMap.set(name, inserted.id)
      }
    }

    // 4. 블록 upsert
    const blockKeys = [...new Set(valid.map(r => `${r.project}|${r.ship}|${r.block}`))]
    const blockMap = new Map<string, string>()
    for (const key of blockKeys) {
      const [pName, sName, bCode] = key.split('|')
      const shipId = shipMap.get(`${pName}|${sName}`)
      if (!shipId) continue
      const { data: existing } = await supabase
        .from('blocks').select('id')
        .eq('ship_id', shipId).eq('code', bCode).maybeSingle()
      if (existing) {
        blockMap.set(key, existing.id)
      } else {
        const { data: inserted, error } = await supabase
          .from('blocks').insert({ ship_id: shipId, code: bCode })
          .select('id').single()
        if (error) throw error
        blockMap.set(key, inserted.id)
      }
    }

    // 5. 구역 upsert
    const zoneMap = new Map<string, string>()
    for (const r of valid) {
      const blockKey = `${r.project}|${r.ship}|${r.block}`
      const blockId = blockMap.get(blockKey)
      const shipId = shipMap.get(`${r.project}|${r.ship}`)
      if (!blockId || !shipId) continue

      const zoneKey = `${blockKey}|${r.name}`
      if (zoneMap.has(zoneKey)) continue

      const { data: existing } = await supabase
        .from('zones').select('id')
        .eq('block_id', blockId).eq('name', r.name).maybeSingle()

      const zonePayload = {
        block_id: blockId,
        ship_id: shipId,
        code: r.code || null,
        name: r.name,
        surface_prep: r.surface || null,
        area_total: r.area_total ? Number(r.area_total) : null,
        area_pre: r.area_pre ? Number(r.area_pre) : null,
        is_pspc: r.pspc === 'O',
        stage: r.stage || null,
        shop: r.shop || null,
      }

      if (existing) {
        await supabase.from('zones').update(zonePayload).eq('id', existing.id)
        zoneMap.set(zoneKey, existing.id)
      } else {
        const { data: inserted, error } = await supabase
          .from('zones').insert(zonePayload).select('id').single()
        if (error) throw error
        zoneMap.set(zoneKey, inserted.id)
      }
    }

    // 6. 도장사양 upsert
    let specCount = 0
    for (const r of valid) {
      const zoneKey = `${r.project}|${r.ship}|${r.block}|${r.name}`
      const zoneId = zoneMap.get(zoneKey)
      const shipId = shipMap.get(`${r.project}|${r.ship}`)
      const makerId = makerMap.get(r.maker)
      const coatOrder = Number(r.coat_order)
      if (!zoneId || !shipId || !makerId || !coatOrder) continue

      const specPayload = {
        zone_id: zoneId,
        ship_id: shipId,
        coat_order: coatOrder,
        coat_label: String(coatOrder) + getCoatLabel(coatOrder),
        maker_id: makerId,
        paint_name: r.paint,
        dft_target: r.dft ? Number(r.dft) : null,
        wet: r.wet ? Number(r.wet) : null,
        tsr: r.tsr ? Number(r.tsr) : null,
        psr: r.psr ? Number(r.psr) : null,
        theory_qty: r.theory_qty ? Number(r.theory_qty) : null,
        actual_qty: r.actual_qty ? Number(r.actual_qty) : null,
      }

      const { data: existing } = await supabase
        .from('coating_specs').select('id')
        .eq('zone_id', zoneId).eq('coat_order', coatOrder).maybeSingle()

      if (existing) {
        await supabase.from('coating_specs').update(specPayload).eq('id', existing.id)
      } else {
        await supabase.from('coating_specs').insert(specPayload)
      }
      specCount++
    }

    return {
      success: true,
      stats: {
        projects: projectMap.size,
        ships: shipMap.size,
        blocks: blockMap.size,
        zones: zoneMap.size,
        specs: specCount,
      },
    }
  } catch (error: unknown) {
    console.error('Master save error:', error)
    const msg = error instanceof Error ? error.message : '저장 실패'
    return { success: false, error: msg }
  }
}

function getCoatLabel(n: number): string {
  if (n === 1) return 'ST'
  if (n === 2) return 'ND'
  if (n === 3) return 'RD'
  return 'TH'
}

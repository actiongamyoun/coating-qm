'use client'

import { useEffect, useState } from 'react'
import type { WizardState, ZoneInfo } from './Wizard'
import { getZonesByBlockCoat } from '@/lib/actions/inspection'

type Props = {
  state: WizardState
  updateState: (patch: Partial<WizardState>) => void
  makerName: string
  onNext: () => void
  onBack: () => void
}

type ZoneListItem = Awaited<ReturnType<typeof getZonesByBlockCoat>>[number]

export default function Step2Zones({ state, updateState, makerName, onNext, onBack }: Props) {
  const [zones, setZones] = useState<ZoneListItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getZonesByBlockCoat(state.block_id, state.coat_order, makerName).then(data => {
      setZones(data)
      setLoading(false)
    })
  }, [state.block_id, state.coat_order, makerName])

  function toggleZone(zone: ZoneListItem) {
    if (!zone.accessible) return
    const isSelected = state.zone_ids.includes(zone.id)
    if (isSelected) {
      updateState({
        zone_ids: state.zone_ids.filter(id => id !== zone.id),
        zones_info: state.zones_info.filter(z => z.id !== zone.id),
      })
    } else {
      const info: ZoneInfo = {
        id: zone.id,
        name: zone.name,
        is_pspc: zone.is_pspc,
        paint_name: zone.spec?.paint_name || '',
        dft_target: zone.spec?.dft_target ?? null,
      }
      updateState({
        zone_ids: [...state.zone_ids, zone.id],
        zones_info: [...state.zones_info, info],
      })
    }
  }

  const selectedCount = state.zone_ids.length
  const paintGroups = new Set(state.zones_info.map(z => z.paint_name)).size
  const pspcCount = state.zones_info.filter(z => z.is_pspc).length

  if (loading) {
    return <div className="p-8 text-center text-gray-500 text-sm">불러오는 중...</div>
  }

  if (zones.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-warning-light text-warning p-4 rounded-xl text-sm font-bold">
          <span className="material-icons align-middle mr-1">warning</span>
          {state.coat_label} 회차에 적용 가능한 구역이 없습니다.
        </div>
        <button onClick={onBack} className="w-full py-3 border-2 border-gray-300 rounded-lg font-bold">
          이전
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="bg-primary-light text-primary-dark p-3 rounded-lg text-xs font-bold flex items-start gap-2">
        <span className="material-icons text-base">info</span>
        <div>
          <strong>{state.block_code} / {state.coat_label}</strong> 적용 가능 구역<br />
          {makerName} 도료 구역만 선택 가능 (중복 선택)
        </div>
      </div>

      <div className="space-y-2">
        {zones.map(z => {
          const selected = state.zone_ids.includes(z.id)
          return (
            <label
              key={z.id}
              className={`flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors ${
                !z.accessible
                  ? 'opacity-50 cursor-not-allowed bg-gray-50 border-dashed border-gray-300'
                  : selected
                    ? 'border-primary bg-primary-light'
                    : 'border-gray-300 bg-white hover:border-primary/50'
              }`}
            >
              <input
                type="checkbox"
                checked={selected}
                disabled={!z.accessible}
                onChange={() => toggleZone(z)}
                className="w-5 h-5"
              />
              <div className="flex-1">
                <div className="font-black text-base flex items-center gap-1.5">
                  {z.name}
                  {z.is_pspc && (
                    <span className="bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-0.5">
                      <span className="material-icons text-[12px]">lock</span>PSPC
                    </span>
                  )}
                  {!z.accessible && z.spec?.maker_name && (
                    <span className="bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      {z.spec.maker_name} 도료
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-700 mt-1 font-medium">
                  {z.spec?.paint_name} {z.spec?.dft_target ? `· ${z.spec.dft_target}㎛` : ''}
                </div>
              </div>
            </label>
          )
        })}
      </div>

      <div className="bg-gray-50 border-[1.5px] border-dashed border-gray-300 rounded-lg p-3 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-700 font-bold">선택된 구역</span>
          <span className="font-black">{selectedCount}개</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-700 font-bold">도료 그룹</span>
          <span className="font-black">{paintGroups}개</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-700 font-bold">그중 PSPC</span>
          <span className="font-black">{pspcCount}개</span>
        </div>
      </div>

      <div className="flex gap-2 pt-3 border-t border-gray-200">
        <button onClick={onBack} className="flex-1 py-3 border-2 border-primary text-primary rounded-lg font-black">
          이전
        </button>
        <button
          onClick={onNext}
          disabled={selectedCount === 0}
          className="flex-1 bg-primary text-white py-3 rounded-lg font-black flex items-center justify-center gap-1 disabled:opacity-50"
        >
          다음 <span className="material-icons text-base">arrow_forward</span>
        </button>
      </div>
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import type { WizardState, ZoneInfo } from './Wizard'
import { getZonesByBlockCoat } from '@/lib/actions/inspection'
import { createInspectionSession } from '@/lib/actions/inspection-save'

type Props = {
  state: WizardState
  updateState: (patch: Partial<WizardState>) => void
  makerName: string
  userId: string
  onSessionCreated: (sessionId: string) => void
  onNext: () => void
  onBack: () => void
}

type ZoneListItem = Awaited<ReturnType<typeof getZonesByBlockCoat>>[number]

export default function Step2Zones({
  state, updateState, makerName, userId, onSessionCreated, onNext, onBack,
}: Props) {
  const [zones, setZones] = useState<ZoneListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setLoading(true)
    getZonesByBlockCoat(state.block_id, state.coat_order, makerName).then(data => {
      setZones(data)
      setLoading(false)
    })
  }, [state.block_id, state.coat_order, makerName])

  function toggleZone(zone: ZoneListItem) {
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
        area_total: zone.area_total ?? null,
      }
      updateState({
        zone_ids: [...state.zone_ids, zone.id],
        zones_info: [...state.zones_info, info],
      })
    }
  }

  async function handleSaveAndNext() {
    setError('')
    if (state.zone_ids.length === 0) {
      setError('구역을 선택하세요')
      return
    }
    setSaving(true)
    const res = await createInspectionSession(
      {
        ship_id: state.ship_id,
        block_id: state.block_id,
        coat_order: state.coat_order,
        coat_label: state.coat_label,
        inspected_at: state.inspected_at,
        zone_ids: state.zone_ids,
      },
      userId
    )
    setSaving(false)

    if (res.success && res.session_id) {
      onSessionCreated(res.session_id)
      onNext()
    } else {
      setError(res.error || '세션 생성 실패')
    }
  }

  const selectedCount = state.zone_ids.length
  const paintGroups = new Set(state.zones_info.map(z => z.paint_name)).size
  const pspcCount = state.zones_info.filter(z => z.is_pspc).length

  if (loading) {
    return <div className="p-8 text-center text-gray-500 text-sm font-bold">불러오는 중...</div>
  }

  if (zones.length === 0) {
    return (
      <div className="space-y-4">
        <div className="bg-warning-light text-warning p-4 rounded-xl text-sm font-bold">
          <span className="material-icons align-middle mr-1">warning</span>
          {state.coat_label} 회차에 {makerName ? `${makerName} 도료사가 담당하는 ` : ''}구역이 없습니다.
        </div>
        <button onClick={onBack} className="w-full py-3 border-2 border-gray-300 rounded-lg font-bold text-[#1a2332]">
          이전
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div
        className="p-3 rounded-lg text-xs font-bold flex items-start gap-2"
        style={{
          background: 'rgba(94, 203, 214, 0.1)',
          color: '#0891a3',
          border: '1px solid rgba(94, 203, 214, 0.25)',
        }}
      >
        <span className="material-icons text-base">info</span>
        <div>
          <strong>{state.block_code} / {state.coat_label}</strong> 적용 가능 구역<br />
          {makerName && <>{makerName} 담당 구역 (중복 선택 가능)</>}
        </div>
      </div>

      <div className="space-y-2">
        {zones.map(z => {
          const selected = state.zone_ids.includes(z.id)
          return (
            <label
              key={z.id}
              className="flex items-center gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors bg-white"
              style={{
                borderColor: selected ? '#5ecbd6' : '#e5e7eb',
                background: selected ? 'rgba(94, 203, 214, 0.08)' : '#ffffff',
              }}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => toggleZone(z)}
                className="w-5 h-5 accent-[#5ecbd6]"
              />
              <div className="flex-1">
                <div className="font-black text-base flex items-center gap-1.5 text-[#1a2332]">
                  {z.name}
                  {z.is_pspc && (
                    <span className="bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-0.5">
                      <span className="material-icons text-[12px]">lock</span>PSPC
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-700 mt-1 font-medium">
                  {z.spec?.paint_name} {z.spec?.dft_target ? `· ${z.spec.dft_target}㎛` : ''}
                  {z.area_total ? ` · ${z.area_total}㎡` : ''}
                </div>
              </div>
            </label>
          )
        })}
      </div>

      <div className="bg-gray-50 border-[1.5px] border-dashed border-gray-300 rounded-lg p-3 space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-700 font-bold">선택된 구역</span>
          <span className="font-black text-[#1a2332]">{selectedCount}개</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-700 font-bold">도료 그룹</span>
          <span className="font-black text-[#1a2332]">{paintGroups}개</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-700 font-bold">그중 PSPC</span>
          <span className="font-black text-[#1a2332]">{pspcCount}개</span>
        </div>
      </div>

      <div className="bg-warning-light text-warning p-3 rounded-lg text-xs font-bold flex items-start gap-2">
        <span className="material-icons text-base">info</span>
        <div>
          <strong>저장 시 주의:</strong> 다음으로 진행하면 검사 세션이 생성되고
          호선·블록·구역·회차는 더 이상 변경할 수 없습니다.
        </div>
      </div>

      {error && (
        <div className="bg-danger-light text-danger p-3 rounded-lg text-sm font-bold flex items-center gap-2">
          <span className="material-icons text-base">error</span>{error}
        </div>
      )}

      <div className="flex gap-2 pt-3 border-t border-gray-200">
        <button
          onClick={onBack}
          disabled={saving}
          className="flex-1 py-3 border-2 border-[#1a2332] text-[#1a2332] rounded-lg font-black disabled:opacity-50"
        >
          이전
        </button>
        <button
          onClick={handleSaveAndNext}
          disabled={selectedCount === 0 || saving}
          className="flex-1 text-white py-3 rounded-lg font-black flex items-center justify-center gap-1 disabled:opacity-50 transition-all hover:-translate-y-0.5"
          style={{
            background: 'linear-gradient(135deg, #1a2332 0%, #243144 100%)',
          }}
        >
          <span className="material-icons text-base" style={{ color: '#5ecbd6' }}>
            {saving ? 'hourglass_top' : 'save'}
          </span>
          {saving ? '저장 중...' : '저장 후 다음'}
        </button>
      </div>
    </div>
  )
}

'use client'

import { useEffect } from 'react'
import type { WizardState, BatchInput } from './Wizard'

type Props = {
  state: WizardState
  updateState: (patch: Partial<WizardState>) => void
  onNext: () => void
  onBack: () => void
}

function isFinalCoat(order: number) {
  return order === 99
}

export default function Step4Batch({ state, updateState, onNext, onBack }: Props) {
  useEffect(() => {
    if (isFinalCoat(state.coat_order)) return

    const groupMap = new Map<string, BatchInput>()
    for (const z of state.zones_info) {
      if (!z.paint_name) continue
      const existing = groupMap.get(z.paint_name)
      if (existing) {
        existing.zone_ids.push(z.id)
      } else {
        const prev = state.batches.find(b => b.paint_name === z.paint_name)
        groupMap.set(z.paint_name, {
          paint_name: z.paint_name,
          zone_ids: [z.id],
          base_no: prev?.base_no || '',
          hardener_no: prev?.hardener_no || '',
        })
      }
    }
    const next = Array.from(groupMap.values())
    if (JSON.stringify(next) !== JSON.stringify(state.batches)) {
      updateState({ batches: next })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.zones_info, state.coat_order])

  function updateBatch(idx: number, field: 'base_no' | 'hardener_no', value: string) {
    const next = [...state.batches]
    next[idx] = { ...next[idx], [field]: value }
    updateState({ batches: next })
  }

  function getZoneNames(zone_ids: string[]) {
    return zone_ids
      .map(id => state.zones_info.find(z => z.id === id)?.name)
      .filter(Boolean)
      .join(', ')
  }

  if (isFinalCoat(state.coat_order)) {
    return (
      <div className="space-y-4">
        <div
          className="p-4 rounded-xl text-sm font-bold text-center"
          style={{
            background: 'rgba(94, 203, 214, 0.1)',
            color: '#0891a3',
            border: '1px solid rgba(94, 203, 214, 0.25)',
          }}
        >
          <span className="material-icons text-3xl block mx-auto mb-2">skip_next</span>
          FINAL 회차는 Batch No. 입력이 필요 없습니다.
        </div>
        <div className="flex gap-2">
          <button
            onClick={onBack}
            className="flex-1 py-3 border-2 border-[#1a2332] text-[#1a2332] rounded-lg font-black"
          >
            이전
          </button>
          <button
            onClick={onNext}
            className="flex-1 text-white py-3 rounded-lg font-black flex items-center justify-center gap-1 transition-all hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(135deg, #1a2332 0%, #243144 100%)',
            }}
          >
            다음
            <span className="material-icons text-base" style={{ color: '#5ecbd6' }}>arrow_forward</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {state.batches.length === 0 && (
        <div className="bg-gray-100 p-4 rounded-lg text-sm text-gray-600 text-center font-bold">
          구역을 선택하면 도료가 표시됩니다
        </div>
      )}

      {state.batches.map((b, idx) => (
        <div
          key={b.paint_name}
          className="border-2 rounded-xl p-4 bg-white"
          style={{
            borderColor: '#5ecbd6',
            background: 'linear-gradient(180deg, rgba(94, 203, 214, 0.05) 0%, #ffffff 100%)',
          }}
        >
          <div
            className="flex justify-between items-start pb-3 mb-3 border-b-2 border-dashed"
            style={{ borderColor: '#5ecbd6' }}
          >
            <div className="flex items-center gap-1.5 font-black text-base" style={{ color: '#0891a3' }}>
              <span className="material-icons">palette</span>
              {b.paint_name}
            </div>
            <div className="text-xs text-gray-700 font-bold text-right">
              <span className="material-icons text-sm align-middle">place</span><br />
              {getZoneNames(b.zone_ids)}
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <span className="w-16 text-xs font-black text-[#1a2332] leading-tight">
              주제<br /><span className="text-[10px] opacity-70 font-bold">Base</span>
            </span>
            <input
              type="text"
              value={b.base_no}
              onChange={e => updateBatch(idx, 'base_no', e.target.value)}
              placeholder="예: A2451-25"
              className="flex-1 p-3 border-[1.5px] border-gray-300 rounded-lg font-bold focus:border-[#5ecbd6] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => alert('📷 OCR (추후 추가)')}
              className="text-white p-3 rounded-lg"
              style={{ background: '#1a2332' }}
              title="사진 + OCR"
            >
              <span className="material-icons" style={{ color: '#5ecbd6' }}>photo_camera</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-16 text-xs font-black text-[#1a2332] leading-tight">
              경화제<br /><span className="text-[10px] opacity-70 font-bold">Hardener</span>
            </span>
            <input
              type="text"
              value={b.hardener_no}
              onChange={e => updateBatch(idx, 'hardener_no', e.target.value)}
              placeholder="예: H1820-09"
              className="flex-1 p-3 border-[1.5px] border-gray-300 rounded-lg font-bold focus:border-[#5ecbd6] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => alert('📷 OCR (추후 추가)')}
              className="text-white p-3 rounded-lg"
              style={{ background: '#1a2332' }}
              title="사진 + OCR"
            >
              <span className="material-icons" style={{ color: '#5ecbd6' }}>photo_camera</span>
            </button>
          </div>
        </div>
      ))}

      <div className="flex gap-2 pt-3 border-t border-gray-200">
        <button
          onClick={onBack}
          className="flex-1 py-3 border-2 border-[#1a2332] text-[#1a2332] rounded-lg font-black"
        >
          이전
        </button>
        <button
          onClick={onNext}
          className="flex-1 text-white py-3 rounded-lg font-black flex items-center justify-center gap-1 transition-all hover:-translate-y-0.5"
          style={{
            background: 'linear-gradient(135deg, #1a2332 0%, #243144 100%)',
          }}
        >
          다음
          <span className="material-icons text-base" style={{ color: '#5ecbd6' }}>arrow_forward</span>
        </button>
      </div>
    </div>
  )
}

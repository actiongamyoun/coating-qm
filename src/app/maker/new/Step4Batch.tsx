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
        <div className="bg-primary-light text-primary-dark p-4 rounded-xl text-sm font-bold text-center">
          <span className="material-icons text-3xl block mx-auto mb-2">skip_next</span>
          FINAL 회차는 Batch No. 입력이 필요 없습니다.
        </div>
        <div className="flex gap-2">
          <button onClick={onBack} className="flex-1 py-3 border-2 border-paint text-paint rounded-lg font-black">
            이전
          </button>
          <button onClick={onNext} className="flex-1 bg-paint text-white py-3 rounded-lg font-black">
            다음 →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-paint-light text-paint p-3 rounded-lg text-xs font-bold flex items-start gap-2">
        <span className="material-icons text-base">format_paint</span>
        <div>
          <strong>도료사 전담.</strong> 같은 도료가 여러 구역에 쓰이면 Batch 1번만 입력하면 됩니다.
        </div>
      </div>

      {state.batches.length === 0 && (
        <div className="bg-gray-100 p-4 rounded-lg text-sm text-gray-600 text-center">
          구역을 선택하면 도료가 표시됩니다
        </div>
      )}

      {state.batches.map((b, idx) => (
        <div
          key={b.paint_name}
          className="border-2 border-paint bg-gradient-to-b from-paint-light to-white rounded-xl p-4"
        >
          <div className="flex justify-between items-start pb-3 mb-3 border-b-2 border-dashed border-paint">
            <div className="flex items-center gap-1.5 text-paint font-black text-base">
              <span className="material-icons">palette</span>
              {b.paint_name}
            </div>
            <div className="text-xs text-gray-700 font-bold text-right">
              <span className="material-icons text-sm align-middle">place</span><br />
              {getZoneNames(b.zone_ids)}
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <span className="w-16 text-xs font-black text-gray-700 leading-tight">
              주제<br /><span className="text-[10px] opacity-70">Base</span>
            </span>
            <input
              type="text"
              value={b.base_no}
              onChange={e => updateBatch(idx, 'base_no', e.target.value)}
              placeholder="예: A2451-25"
              className="flex-1 p-3 border-[1.5px] border-gray-300 rounded-lg font-bold"
            />
            <button
              type="button"
              onClick={() => alert('📷 OCR (추후 추가)')}
              className="bg-paint text-white p-3 rounded-lg"
              title="사진 + OCR"
            >
              <span className="material-icons">photo_camera</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="w-16 text-xs font-black text-gray-700 leading-tight">
              경화제<br /><span className="text-[10px] opacity-70">Hardener</span>
            </span>
            <input
              type="text"
              value={b.hardener_no}
              onChange={e => updateBatch(idx, 'hardener_no', e.target.value)}
              placeholder="예: H1820-09"
              className="flex-1 p-3 border-[1.5px] border-gray-300 rounded-lg font-bold"
            />
            <button
              type="button"
              onClick={() => alert('📷 OCR (추후 추가)')}
              className="bg-paint text-white p-3 rounded-lg"
              title="사진 + OCR"
            >
              <span className="material-icons">photo_camera</span>
            </button>
          </div>
        </div>
      ))}

      <div className="flex gap-2 pt-3 border-t border-gray-200">
        <button onClick={onBack} className="flex-1 py-3 border-2 border-paint text-paint rounded-lg font-black">
          이전
        </button>
        <button onClick={onNext} className="flex-1 bg-paint text-white py-3 rounded-lg font-black flex items-center justify-center gap-1">
          다음 <span className="material-icons text-base">arrow_forward</span>
        </button>
      </div>
    </div>
  )
}

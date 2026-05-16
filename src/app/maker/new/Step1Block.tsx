'use client'

import { useEffect, useState } from 'react'
import type { WizardState } from './Wizard'
import { getShips, getBlocks } from '@/lib/actions/inspection'

type Props = {
  state: WizardState
  updateState: (patch: Partial<WizardState>) => void
  makerName: string | null
  onNext: () => void
}

type ShipItem = {
  id: string
  name: string
  ship_type: string | null
  project_name: string
}

type BlockItem = {
  id: string
  code: string
  vendor: { id: string; name: string; vendor_type: string | null } | null
}

const COATS = [
  { order: 1, label: '1ST' },
  { order: 2, label: '2ND' },
  { order: 3, label: '3RD' },
  { order: 4, label: '4TH' },
  { order: 5, label: '5TH' },
  { order: 99, label: 'FINAL' },
]

export default function Step1Block({ state, updateState, makerName, onNext }: Props) {
  const [ships, setShips] = useState<ShipItem[]>([])
  const [blocks, setBlocks] = useState<BlockItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getShips(makerName).then(data => {
      setShips(data)
      setLoading(false)
      if (data.length > 0 && !state.ship_id) {
        updateState({ ship_id: data[0].id, ship_name: data[0].name })
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [makerName])

  useEffect(() => {
    if (!state.ship_id) return
    getBlocks(state.ship_id, makerName).then(data => {
      setBlocks(data)
      if (data.length > 0 && !state.block_id) {
        updateState({
          block_id: data[0].id,
          block_code: data[0].code,
          vendor_name: data[0].vendor?.name || '',
        })
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.ship_id, makerName])

  function handleShipChange(id: string) {
    const ship = ships.find(s => s.id === id)
    updateState({
      ship_id: id,
      ship_name: ship?.name || '',
      block_id: '',
      block_code: '',
      vendor_name: '',
      zone_ids: [],
      zones_info: [],
    })
  }

  function handleBlockChange(id: string) {
    const b = blocks.find(x => x.id === id)
    updateState({
      block_id: id,
      block_code: b?.code || '',
      vendor_name: b?.vendor?.name || '',
      zone_ids: [],
      zones_info: [],
    })
  }

  function selectCoat(order: number, label: string) {
    updateState({ coat_order: order, coat_label: label, zone_ids: [], zones_info: [] })
  }

  function canProceed() {
    return state.ship_id && state.block_id && state.coat_order > 0
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500 text-sm font-bold">불러오는 중...</div>
  }

  if (ships.length === 0) {
    return (
      <div className="bg-warning-light text-warning p-4 rounded-xl text-sm font-bold">
        <span className="material-icons align-middle mr-1">warning</span>
        {makerName
          ? `${makerName} 도료사가 담당하는 호선이 없습니다. 관리자에게 마스터 데이터 등록을 요청하세요.`
          : '등록된 호선이 없습니다. 관리자 마스터 입력에서 먼저 데이터를 등록하세요.'}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {makerName && (
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
            <strong>{makerName}</strong> 담당 호선·블록만 표시됩니다
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-black mb-2 text-[#1a2332]">호선</label>
        <select
          value={state.ship_id}
          onChange={e => handleShipChange(e.target.value)}
          className="w-full p-3 border-[1.5px] border-gray-300 rounded-lg font-bold bg-white focus:border-[#5ecbd6] focus:outline-none"
        >
          {ships.map(s => (
            <option key={s.id} value={s.id}>
              {s.name} {s.ship_type ? `· ${s.ship_type}` : ''}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-black mb-2 text-[#1a2332]">블록</label>
        {blocks.length === 0 ? (
          <div className="p-3 bg-gray-100 rounded-lg text-sm text-gray-500 font-bold">
            {makerName
              ? `이 호선에 ${makerName} 담당 블록이 없습니다`
              : '이 호선의 블록이 아직 없습니다'}
          </div>
        ) : (
          <select
            value={state.block_id}
            onChange={e => handleBlockChange(e.target.value)}
            className="w-full p-3 border-[1.5px] border-gray-300 rounded-lg font-bold bg-white focus:border-[#5ecbd6] focus:outline-none"
          >
            {blocks.map(b => (
              <option key={b.id} value={b.id}>
                {b.code} {b.vendor ? `· ${b.vendor.name}` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {state.vendor_name && (
        <div>
          <label className="block text-sm font-black mb-2 text-[#1a2332]">협력사</label>
          <input
            type="text"
            value={state.vendor_name}
            readOnly
            className="w-full p-3 bg-gray-100 border-[1.5px] border-gray-300 rounded-lg font-medium text-gray-700"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-black mb-2 text-[#1a2332]">회차</label>
        <div className="grid grid-cols-6 gap-1.5">
          {COATS.map(c => {
            const selected = state.coat_order === c.order
            return (
              <button
                key={c.order}
                onClick={() => selectCoat(c.order, c.label)}
                className="py-3 px-1 border-2 rounded-lg font-black text-xs transition-all"
                style={
                  selected
                    ? {
                        background: '#1a2332',
                        color: '#ffffff',
                        borderColor: '#1a2332',
                      }
                    : {
                        background: '#ffffff',
                        color: '#1a2332',
                        borderColor: '#e5e7eb',
                      }
                }
              >
                {c.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-black mb-2 text-[#1a2332]">검사 일시</label>
        <input
          type="datetime-local"
          value={state.inspected_at.slice(0, 16)}
          onChange={e => updateState({ inspected_at: new Date(e.target.value).toISOString() })}
          className="w-full p-3 border-[1.5px] border-gray-300 rounded-lg font-bold focus:border-[#5ecbd6] focus:outline-none"
        />
      </div>

      <button
        onClick={onNext}
        disabled={!canProceed()}
        className="w-full text-white py-4 rounded-xl font-black flex items-center justify-center gap-2 shadow-md disabled:opacity-50 transition-all hover:-translate-y-0.5"
        style={{
          background: 'linear-gradient(135deg, #1a2332 0%, #243144 100%)',
        }}
      >
        다음
        <span className="material-icons" style={{ color: '#5ecbd6' }}>arrow_forward</span>
      </button>
    </div>
  )
}

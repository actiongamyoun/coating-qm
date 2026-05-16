'use client'

import { useEffect } from 'react'
import type { WizardState, MeasurementInput } from './Wizard'

type Props = {
  state: WizardState
  updateState: (patch: Partial<WizardState>) => void
  onNext: () => void
  onBack: () => void
}

export default function Step5Measure({ state, updateState, onNext, onBack }: Props) {
  const isFirst = state.coat_order === 1

  useEffect(() => {
    const targetZones = isFirst
      ? state.zones_info.filter(z => z.is_pspc)
      : state.zones_info

    const next = targetZones.map(z => {
      const prev = state.measurements.find(m => m.zone_id === z.id)
      return prev || {
        zone_id: z.id,
        zone_name: z.name,
        is_pspc: z.is_pspc,
        dft_target: z.dft_target,
        dft_avg: '',
        dft_min: '',
        dft_max: '',
        dft_count: '',
        salt: '',
        dust_size: '',
        dust_quantity: '',
        profile: '',
      } as MeasurementInput
    })

    if (JSON.stringify(next) !== JSON.stringify(state.measurements)) {
      updateState({ measurements: next })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.zones_info, state.coat_order])

  function updateField(zone_id: string, field: keyof MeasurementInput, value: string) {
    const next = state.measurements.map(m =>
      m.zone_id === zone_id ? { ...m, [field]: value } : m
    )
    updateState({ measurements: next })
  }

  return (
    <div className="space-y-4">
      <div
        className="p-3 rounded-lg text-xs font-bold flex items-start gap-2"
        style={{
          background: 'rgba(94, 203, 214, 0.1)',
          color: '#0891a3',
          border: '1px solid rgba(94, 203, 214, 0.25)',
        }}
      >
        <span className="material-icons text-base">{isFirst ? 'science' : 'straighten'}</span>
        <div>
          <strong>{state.coat_label}</strong> ·{' '}
          {isFirst
            ? '전처리 검사 (Salt / Dust / Profile, PSPC 구역만)'
            : '도장 검사 (DFT 측정)'}
        </div>
      </div>

      {state.measurements.length === 0 ? (
        <div className="bg-gray-100 p-4 rounded-lg text-sm text-gray-600 text-center font-bold">
          {isFirst
            ? 'PSPC 구역이 없어 표면 측정 항목이 없습니다'
            : '측정할 구역이 없습니다'}
        </div>
      ) : isFirst ? (
        <SurfaceCards measurements={state.measurements} updateField={updateField} />
      ) : (
        <DftCards measurements={state.measurements} updateField={updateField} />
      )}

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

function SurfaceCards({
  measurements, updateField,
}: {
  measurements: MeasurementInput[]
  updateField: (zone_id: string, field: keyof MeasurementInput, value: string) => void
}) {
  return (
    <div className="space-y-3">
      <MeasureCard title="Salt" subtitle="mg/m² · 기준 ≤ 50" icon="science" bt="Elcometer 130">
        {measurements.map(m => (
          <div key={m.zone_id} className="flex items-center gap-2 py-2 border-b border-gray-200 last:border-0">
            <div className="flex-1 font-black text-sm flex items-center gap-1 text-[#1a2332]">
              <span className="material-icons text-base text-pink-700">lock</span>
              {m.zone_name}
              <span className="bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded text-[9px] font-black ml-1">PSPC</span>
            </div>
            <input
              type="number"
              step="0.1"
              value={m.salt}
              onChange={e => updateField(m.zone_id, 'salt', e.target.value)}
              placeholder="—"
              className="w-24 p-2 text-lg font-black text-center border-[1.5px] border-gray-300 rounded-lg focus:border-[#5ecbd6] focus:outline-none"
            />
          </div>
        ))}
      </MeasureCard>

      <MeasureCard title="Dust" subtitle="Size / Quantity · 기준 ≤ 1" icon="grain" bt="육안 판정" noBt>
        {measurements.map(m => (
          <div key={m.zone_id} className="flex items-center gap-2 py-2 border-b border-gray-200 last:border-0">
            <div className="flex-1 font-black text-sm flex items-center gap-1 text-[#1a2332]">
              <span className="material-icons text-base text-pink-700">lock</span>
              {m.zone_name}
              <span className="bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded text-[9px] font-black ml-1">PSPC</span>
            </div>
            <select
              value={m.dust_size}
              onChange={e => updateField(m.zone_id, 'dust_size', e.target.value)}
              className="w-16 p-2 text-sm font-black text-center border-[1.5px] border-gray-300 rounded-lg focus:border-[#5ecbd6] focus:outline-none"
            >
              <option value="">-</option>
              <option>0</option><option>1</option><option>2</option><option>3</option>
            </select>
            <select
              value={m.dust_quantity}
              onChange={e => updateField(m.zone_id, 'dust_quantity', e.target.value)}
              className="w-16 p-2 text-sm font-black text-center border-[1.5px] border-gray-300 rounded-lg focus:border-[#5ecbd6] focus:outline-none"
            >
              <option value="">-</option>
              <option>0</option><option>1</option><option>2</option><option>3</option>
            </select>
          </div>
        ))}
      </MeasureCard>

      <MeasureCard title="Profile" subtitle="㎛ · 기준 30~75" icon="straighten" bt="Elcometer 224">
        {measurements.map(m => (
          <div key={m.zone_id} className="flex items-center gap-2 py-2 border-b border-gray-200 last:border-0">
            <div className="flex-1 font-black text-sm flex items-center gap-1 text-[#1a2332]">
              <span className="material-icons text-base text-pink-700">lock</span>
              {m.zone_name}
              <span className="bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded text-[9px] font-black ml-1">PSPC</span>
            </div>
            <input
              type="number"
              step="0.1"
              value={m.profile}
              onChange={e => updateField(m.zone_id, 'profile', e.target.value)}
              placeholder="—"
              className="w-24 p-2 text-lg font-black text-center border-[1.5px] border-gray-300 rounded-lg focus:border-[#5ecbd6] focus:outline-none"
            />
          </div>
        ))}
      </MeasureCard>
    </div>
  )
}

function DftCards({
  measurements, updateField,
}: {
  measurements: MeasurementInput[]
  updateField: (zone_id: string, field: keyof MeasurementInput, value: string) => void
}) {
  return (
    <MeasureCard title="DFT" subtitle="㎛ · 평균/최소/최대/측정횟수" icon="straighten" bt="Elcometer 456">
      {measurements.map(m => (
        <div key={m.zone_id} className="py-3 border-b border-gray-200 last:border-0">
          <div className="flex justify-between items-center mb-2">
            <div className="font-black text-sm flex items-center gap-1 text-[#1a2332]">
              {m.is_pspc && <span className="material-icons text-base text-pink-700">lock</span>}
              {m.zone_name}
              {m.is_pspc && <span className="bg-pink-100 text-pink-700 px-1.5 py-0.5 rounded text-[9px] font-black ml-1">PSPC</span>}
            </div>
            {m.dft_target !== null && (
              <span className="text-xs font-bold bg-gray-100 px-2 py-1 rounded">목표 {m.dft_target}㎛</span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            <DftInput label="평균" value={m.dft_avg} onChange={v => updateField(m.zone_id, 'dft_avg', v)} />
            <DftInput label="최소" value={m.dft_min} onChange={v => updateField(m.zone_id, 'dft_min', v)} />
            <DftInput label="최대" value={m.dft_max} onChange={v => updateField(m.zone_id, 'dft_max', v)} />
            <DftInput label="횟수" value={m.dft_count} onChange={v => updateField(m.zone_id, 'dft_count', v)} />
          </div>
        </div>
      ))}
    </MeasureCard>
  )
}

function DftInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="text-center">
      <label className="text-[10px] text-gray-700 font-bold block mb-1">{label}</label>
      <input
        type="number"
        step="0.1"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="—"
        className="w-full p-2 text-base font-black text-center border-[1.5px] border-gray-300 rounded-lg focus:border-[#5ecbd6] focus:outline-none"
      />
    </div>
  )
}

function MeasureCard({
  title, subtitle, icon, bt, noBt, children,
}: {
  title: string
  subtitle: string
  icon: string
  bt: string
  noBt?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
      <div
        className="text-white px-4 py-3 flex items-center justify-between"
        style={{
          background: 'linear-gradient(135deg, #1a2332 0%, #243144 100%)',
        }}
      >
        <div>
          <div className="font-black text-base flex items-center gap-1.5">
            <span className="material-icons" style={{ color: '#5ecbd6' }}>{icon}</span>{title}
          </div>
          <div className="text-[11px] opacity-85 font-medium mt-0.5">{subtitle}</div>
        </div>
        {noBt ? (
          <div className="bg-white/15 px-2 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
            <span className="material-icons text-sm">pan_tool</span>육안
          </div>
        ) : (
          <button
            type="button"
            onClick={() => alert(`📡 ${bt} BT 연결 (추후 구현)`)}
            className="px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-1 bg-white text-[#1a2332]"
          >
            <span className="material-icons text-sm" style={{ color: '#5ecbd6' }}>bluetooth</span>{bt}
          </button>
        )}
      </div>
      <div className="px-4 py-2">{children}</div>
    </div>
  )
}

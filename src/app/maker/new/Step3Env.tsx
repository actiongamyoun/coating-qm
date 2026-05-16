'use client'

import type { WizardState } from './Wizard'

type Props = {
  state: WizardState
  updateState: (patch: Partial<WizardState>) => void
  onNext: () => void
  onBack: () => void
}

function calcDewPoint(airTemp: number, humidity: number): number {
  const a = 17.27
  const b = 237.7
  const alpha = (a * airTemp) / (b + airTemp) + Math.log(humidity / 100)
  return (b * alpha) / (a - alpha)
}

export default function Step3Env({ state, updateState, onNext, onBack }: Props) {
  const T = parseFloat(state.env_air_temp)
  const Ts = parseFloat(state.env_surface_temp)
  const RH = parseFloat(state.env_humidity)
  const validInput = !isNaN(T) && !isNaN(Ts) && !isNaN(RH)

  const dewPoint = validInput ? calcDewPoint(T, RH) : null
  const deltaT = dewPoint !== null ? Ts - dewPoint : null
  const tempOk = deltaT !== null ? deltaT >= 3 : null
  const humOk = !isNaN(RH) ? RH <= 85 : null

  const canProceed = validInput

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
        <span className="material-icons text-base">lock</span>
        <div>
          <strong>도료사 전담 항목.</strong> QM은 조회만 가능합니다.
        </div>
      </div>

      <div>
        <label className="block text-sm font-black mb-2 text-[#1a2332]">대기 온도 (℃)</label>
        <input
          type="number"
          step="0.1"
          value={state.env_air_temp}
          onChange={e => updateState({ env_air_temp: e.target.value })}
          placeholder="예: 24.5"
          className="w-full p-3 text-2xl font-black text-center border-[1.5px] border-gray-300 rounded-lg focus:border-[#5ecbd6] focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-black mb-2 text-[#1a2332]">표면 온도 (℃)</label>
        <input
          type="number"
          step="0.1"
          value={state.env_surface_temp}
          onChange={e => updateState({ env_surface_temp: e.target.value })}
          placeholder="예: 22.0"
          className="w-full p-3 text-2xl font-black text-center border-[1.5px] border-gray-300 rounded-lg focus:border-[#5ecbd6] focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-black mb-2 text-[#1a2332]">상대 습도 (%)</label>
        <input
          type="number"
          step="0.1"
          value={state.env_humidity}
          onChange={e => updateState({ env_humidity: e.target.value })}
          placeholder="예: 72"
          className="w-full p-3 text-2xl font-black text-center border-[1.5px] border-gray-300 rounded-lg focus:border-[#5ecbd6] focus:outline-none"
        />
      </div>

      <div className="bg-gray-50 border-[1.5px] border-dashed border-gray-300 rounded-lg p-4 space-y-2">
        <div className="text-xs font-black text-[#1a2332] mb-2 flex items-center gap-1">
          <span className="material-icons text-base" style={{ color: '#5ecbd6' }}>calculate</span>
          자동 계산 (자체 점검)
        </div>

        <div className="flex justify-between items-center py-1.5 text-sm border-b border-gray-200">
          <span className="text-gray-700 font-bold">이슬점</span>
          <span className="font-black text-[#1a2332]">{dewPoint !== null ? `${dewPoint.toFixed(1)} ℃` : '—'}</span>
        </div>
        <div className="flex justify-between items-center py-1.5 text-sm border-b border-gray-200">
          <span className="text-gray-700 font-bold">표면 − 이슬점</span>
          <span className="font-black text-[#1a2332]">
            {deltaT !== null ? (
              <span>
                {deltaT.toFixed(1)} ℃{' '}
                <span className={`ml-1 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black ${
                  tempOk ? 'bg-success-light text-success' : 'bg-danger-light text-danger'
                }`}>
                  <span className="material-icons text-[12px]">{tempOk ? 'check' : 'close'}</span>
                  ≥3℃
                </span>
              </span>
            ) : '—'}
          </span>
        </div>
        <div className="flex justify-between items-center py-1.5 text-sm">
          <span className="text-gray-700 font-bold">습도</span>
          <span className="font-black text-[#1a2332]">
            {!isNaN(RH) ? (
              <span>
                {RH}%{' '}
                <span className={`ml-1 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black ${
                  humOk ? 'bg-success-light text-success' : 'bg-danger-light text-danger'
                }`}>
                  <span className="material-icons text-[12px]">{humOk ? 'check' : 'close'}</span>
                  ≤85%
                </span>
              </span>
            ) : '—'}
          </span>
        </div>
      </div>

      <div className="flex gap-2 pt-3 border-t border-gray-200">
        <button
          onClick={onBack}
          className="flex-1 py-3 border-2 border-[#1a2332] text-[#1a2332] rounded-lg font-black"
        >
          이전
        </button>
        <button
          onClick={onNext}
          disabled={!canProceed}
          className="flex-1 text-white py-3 rounded-lg font-black flex items-center justify-center gap-1 disabled:opacity-50 transition-all hover:-translate-y-0.5"
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

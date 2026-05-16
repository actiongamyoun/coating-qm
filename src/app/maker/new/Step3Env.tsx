'use client'

import type { WizardState } from './Wizard'
import { calcEnvFromWetDry } from '@/lib/utils/psychrometric'

type Props = {
  state: WizardState
  updateState: (patch: Partial<WizardState>) => void
  onNext: () => void
  onBack: () => void
}

export default function Step3Env({ state, updateState, onNext, onBack }: Props) {
  const Td = parseFloat(state.env_air_temp)      // 건구
  const Tw = parseFloat(state.env_wet_bulb_temp) // 습구
  const Ts = parseFloat(state.env_surface_temp)  // 표면
  const validInput = !isNaN(Td) && !isNaN(Tw) && !isNaN(Ts)
  const wetGtDry = !isNaN(Td) && !isNaN(Tw) && Tw > Td

  const calc = validInput && !wetGtDry ? calcEnvFromWetDry(Td, Tw, Ts) : null

  // 자동 계산된 습도를 state에 동기화 (저장 시 사용)
  if (calc && state.env_humidity !== calc.humidity.toFixed(1)) {
    // 무한 루프 방지: 차이가 클 때만 업데이트
    const stored = parseFloat(state.env_humidity)
    if (isNaN(stored) || Math.abs(stored - calc.humidity) > 0.05) {
      updateState({ env_humidity: calc.humidity.toFixed(1) })
    }
  }

  const canProceed = validInput && !wetGtDry

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
          <strong>도료사 전담 항목.</strong> 건구·습구·표면온도를 입력하면 상대습도와 이슬점이 자동 계산됩니다.
        </div>
      </div>

      <div>
        <label className="block text-sm font-black mb-2 text-[#1a2332]">
          건구온도 (℃) <span className="text-xs text-gray-500 font-bold">Dry Bulb</span>
        </label>
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
        <label className="block text-sm font-black mb-2 text-[#1a2332]">
          습구온도 (℃) <span className="text-xs text-gray-500 font-bold">Wet Bulb</span>
        </label>
        <input
          type="number"
          step="0.1"
          value={state.env_wet_bulb_temp}
          onChange={e => updateState({ env_wet_bulb_temp: e.target.value })}
          placeholder="예: 20.5"
          className="w-full p-3 text-2xl font-black text-center border-[1.5px] border-gray-300 rounded-lg focus:border-[#5ecbd6] focus:outline-none"
        />
        {wetGtDry && (
          <div className="text-xs text-danger font-bold mt-1 flex items-center gap-1">
            <span className="material-icons text-sm">error</span>
            습구온도는 건구온도보다 클 수 없습니다
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-black mb-2 text-[#1a2332]">
          표면온도 (℃) <span className="text-xs text-gray-500 font-bold">Steel Temp.</span>
        </label>
        <input
          type="number"
          step="0.1"
          value={state.env_surface_temp}
          onChange={e => updateState({ env_surface_temp: e.target.value })}
          placeholder="예: 22.0"
          className="w-full p-3 text-2xl font-black text-center border-[1.5px] border-gray-300 rounded-lg focus:border-[#5ecbd6] focus:outline-none"
        />
      </div>

      {/* 자동 계산 결과 */}
      <div className="bg-gray-50 border-[1.5px] border-dashed border-gray-300 rounded-lg p-4 space-y-2">
        <div className="text-xs font-black text-[#1a2332] mb-2 flex items-center gap-1">
          <span className="material-icons text-base" style={{ color: '#5ecbd6' }}>calculate</span>
          자동 계산 결과
        </div>

        {/* 상대습도 */}
        <div className="flex justify-between items-center py-1.5 text-sm border-b border-gray-200">
          <span className="text-gray-700 font-bold">상대습도</span>
          <span className="font-black text-[#1a2332]">
            {calc !== null ? (
              <span>
                {calc.humidity.toFixed(1)}%{' '}
                <span className={`ml-1 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black ${
                  calc.humidityOk ? 'bg-success-light text-success' : 'bg-danger-light text-danger'
                }`}>
                  <span className="material-icons text-[12px]">{calc.humidityOk ? 'check' : 'close'}</span>
                  ≤85%
                </span>
              </span>
            ) : '—'}
          </span>
        </div>

        {/* 이슬점 */}
        <div className="flex justify-between items-center py-1.5 text-sm border-b border-gray-200">
          <span className="text-gray-700 font-bold">이슬점</span>
          <span className="font-black text-[#1a2332]">
            {calc !== null ? `${calc.dewPoint.toFixed(1)} ℃` : '—'}
          </span>
        </div>

        {/* 표면 − 이슬점 */}
        <div className="flex justify-between items-center py-1.5 text-sm">
          <span className="text-gray-700 font-bold">표면 − 이슬점</span>
          <span className="font-black text-[#1a2332]">
            {calc !== null ? (
              <span>
                {calc.deltaT.toFixed(1)} ℃{' '}
                <span className={`ml-1 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-black ${
                  calc.deltaTOk ? 'bg-success-light text-success' : 'bg-danger-light text-danger'
                }`}>
                  <span className="material-icons text-[12px]">{calc.deltaTOk ? 'check' : 'close'}</span>
                  ≥3℃
                </span>
              </span>
            ) : '—'}
          </span>
        </div>
      </div>

      {calc !== null && (!calc.deltaTOk || !calc.humidityOk) && (
        <div className="bg-warning-light text-warning p-3 rounded-lg text-xs font-bold flex items-start gap-2">
          <span className="material-icons text-base">warning</span>
          <div>
            <strong>도장 조건 미달:</strong>
            {!calc.deltaTOk && ' 표면 - 이슬점 < 3℃ (결로 위험).'}
            {!calc.humidityOk && ' 상대습도 > 85%.'}
            <br />계속 진행은 가능하지만 검사 결과에 표시됩니다.
          </div>
        </div>
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

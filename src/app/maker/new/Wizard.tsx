'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Step1Block from './Step1Block'
import Step2Zones from './Step2Zones'
import Step3Env from './Step3Env'
import Step4Batch from './Step4Batch'
import Step5Measure from './Step5Measure'
import Step7Confirm from './Step7Confirm'

export type WizardState = {
  ship_id: string
  ship_name: string
  block_id: string
  block_code: string
  vendor_name: string
  coat_order: number
  coat_label: string
  inspected_at: string
  zone_ids: string[]
  zones_info: ZoneInfo[]
  env_air_temp: string
  env_surface_temp: string
  env_humidity: string
  batches: BatchInput[]
  measurements: MeasurementInput[]
}

export type ZoneInfo = {
  id: string
  name: string
  is_pspc: boolean
  paint_name: string
  dft_target: number | null
}

export type BatchInput = {
  paint_name: string
  zone_ids: string[]
  base_no: string
  hardener_no: string
}

export type MeasurementInput = {
  zone_id: string
  zone_name: string
  is_pspc: boolean
  dft_target: number | null
  dft_avg: string
  dft_min: string
  dft_max: string
  dft_count: string
  salt: string
  dust_size: string
  dust_quantity: string
  profile: string
}

const initialState: WizardState = {
  ship_id: '',
  ship_name: '',
  block_id: '',
  block_code: '',
  vendor_name: '',
  coat_order: 2,
  coat_label: '2ND',
  inspected_at: new Date().toISOString(),
  zone_ids: [],
  zones_info: [],
  env_air_temp: '',
  env_surface_temp: '',
  env_humidity: '',
  batches: [],
  measurements: [],
}

export default function Wizard() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [state, setState] = useState<WizardState>(initialState)
  const [user, setUser] = useState<{ id: string; name: string; maker: string } | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)

  useEffect(() => {
    const id = localStorage.getItem('coating_qm_user_id')
    const role = localStorage.getItem('coating_qm_user_role')
    if (!id || role !== 'maker') {
      router.replace('/signup')
      return
    }
    setUser({
      id,
      name: localStorage.getItem('coating_qm_user_name') || '',
      maker: localStorage.getItem('coating_qm_user_maker') || '',
    })
  }, [router])

  function updateState(patch: Partial<WizardState>) {
    setState(prev => ({ ...prev, ...patch }))
  }

  const steps = [
    { n: 1, label: '블록' },
    { n: 2, label: '구역' },
    { n: 3, label: '환경' },
    { n: 4, label: 'Batch' },
    { n: 5, label: '측정' },
    { n: 6, label: '확인' },
  ]

  if (!user) return null

  // Step navigation 핸들러
  function handleBack() {
    if (step === 1) {
      if (confirm('작성을 취소하시겠습니까?')) router.push('/maker')
      return
    }
    // session_id 발급된 후에는 Step 1·2로 못 돌아감 (이미 DB에 저장된 상태)
    if (sessionId && step <= 3) {
      alert('세션이 저장된 후에는 호선·블록·구역을 변경할 수 없습니다.\n취소하려면 처음부터 다시 작성하세요.')
      return
    }
    setStep(s => s - 1)
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-8">
      <div className="sticky top-0 z-20 bg-gray-900 text-white px-4 py-3 flex items-center gap-3 shadow-md">
        <button onClick={handleBack} className="text-white">
          <span className="material-icons">arrow_back</span>
        </button>
        <div className="flex-1">
          <div className="text-xs opacity-70 font-bold">새 검사 기록</div>
          <div className="text-sm font-black">
            {steps[step - 1]?.label} ({step}/{steps.length})
          </div>
        </div>
        <div className="text-xs bg-white/10 px-2 py-1 rounded font-bold">
          {user.maker} · {user.name}
        </div>
      </div>

      <div className="bg-white px-2 py-3 border-b border-gray-200 flex items-center overflow-x-auto">
        {steps.map((s, i) => {
          const status = s.n < step ? 'done' : s.n === step ? 'active' : 'todo'
          // session_id 발급 후엔 Step 1·2 못 감
          const locked = sessionId !== null && s.n <= 2
          return (
            <div key={s.n} className="flex-1 min-w-[50px] text-center relative">
              <button
                onClick={() => {
                  if (locked) {
                    alert('세션 저장 후에는 변경할 수 없습니다')
                    return
                  }
                  if (s.n <= step + 1) setStep(s.n)
                }}
                className={`w-7 h-7 rounded-full font-black text-xs mx-auto flex items-center justify-center ${
                  status === 'done' ? (locked ? 'bg-gray-400' : 'bg-success') + ' text-white' :
                  status === 'active' ? 'bg-primary text-white' :
                  'bg-gray-300 text-white'
                }`}
              >
                {status === 'done' ? (locked ? '🔒' : '✓') : s.n}
              </button>
              <div className={`text-[10px] mt-1 ${
                status === 'todo' ? 'text-gray-500' : 'text-gray-900 font-black'
              }`}>
                {s.label}
              </div>
              {i < steps.length - 1 && (
                <div className={`absolute top-[14px] left-[65%] right-[-35%] h-0.5 ${
                  s.n < step ? 'bg-success' : 'bg-gray-300'
                }`} />
              )}
            </div>
          )
        })}
      </div>

      <div className="p-4 max-w-md mx-auto">
        {step === 1 && (
          <Step1Block
            state={state}
            updateState={updateState}
            makerName={user.maker || null}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <Step2Zones
            state={state}
            updateState={updateState}
            makerName={user.maker}
            userId={user.id}
            onSessionCreated={(id) => setSessionId(id)}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <Step3Env
            state={state}
            updateState={updateState}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}
        {step === 4 && (
          <Step4Batch
            state={state}
            updateState={updateState}
            onNext={() => setStep(5)}
            onBack={() => setStep(3)}
          />
        )}
        {step === 5 && (
          <Step5Measure
            state={state}
            updateState={updateState}
            onNext={() => setStep(6)}
            onBack={() => setStep(4)}
          />
        )}
        {step === 6 && (
          <Step7Confirm
            state={state}
            user={user}
            sessionId={sessionId}
            onBack={() => setStep(5)}
          />
        )}
      </div>
    </div>
  )
}

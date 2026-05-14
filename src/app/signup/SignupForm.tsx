'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { signup, getPaintMakersList } from '@/lib/actions/auth'

type Role = 'maker' | 'qm'
type Maker = { id: string; name: string }

export default function SignupForm() {
  const router = useRouter()
  const [step, setStep] = useState<'role' | 'info'>('role')
  const [role, setRole] = useState<Role | null>(null)
  const [name, setName] = useState('')
  const [makers, setMakers] = useState<Maker[]>([])
  const [selectedMakerName, setSelectedMakerName] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [loadingMakers, setLoadingMakers] = useState(false)

  // 도료사 단계 들어가면 목록 로드
  useEffect(() => {
    if (step === 'info' && role === 'maker' && makers.length === 0) {
      setLoadingMakers(true)
      getPaintMakersList()
        .then(setMakers)
        .finally(() => setLoadingMakers(false))
    }
  }, [step, role, makers.length])

  function pickRole(r: Role) {
    setRole(r)
    setStep('info')
    setError('')
  }

  function goBack() {
    setStep('role')
    setError('')
    setSelectedMakerName('')
  }

  function getOrCreateDeviceId(): string {
    let id = localStorage.getItem('coating_qm_device_id')
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem('coating_qm_device_id', id)
    }
    return id
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!role) return
    if (!name.trim()) {
      setError('이름을 입력하세요')
      return
    }
    if (role === 'maker' && !selectedMakerName) {
      setError('소속 도료사를 선택하세요')
      return
    }

    setSubmitting(true)
    const res = await signup({
      role,
      name: name.trim(),
      maker_name: role === 'maker' ? selectedMakerName : undefined,
      device_id: getOrCreateDeviceId(),
    })
    setSubmitting(false)

    if (res.success && res.user_id) {
      localStorage.setItem('coating_qm_user_id', res.user_id)
      localStorage.setItem('coating_qm_user_role', res.role)
      localStorage.setItem('coating_qm_user_name', res.name)
      if (res.maker_name) {
        localStorage.setItem('coating_qm_user_maker', res.maker_name)
      } else {
        localStorage.removeItem('coating_qm_user_maker')
      }
      router.replace(role === 'maker' ? '/maker' : '/qm')
    } else {
      setError(res.error || '등록 실패')
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* 로고 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center text-[#1a2332] font-extrabold text-lg"
              style={{
                background: 'linear-gradient(135deg, #5ecbd6 0%, #2dd4bf 100%)',
                boxShadow: '0 4px 12px rgba(94, 203, 214, 0.3)',
              }}
            >
              H
            </div>
            <div className="text-left">
              <div className="font-black text-lg leading-tight">Hi-Trust Team</div>
              <div className="text-[10px] text-gray-500 font-bold tracking-widest">
                COATING QM
              </div>
            </div>
          </div>
        </div>

        {/* ===== Step 1: 역할 선택 ===== */}
        {step === 'role' && (
          <div className="bg-white rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-black mb-1 text-center">시작하기</h2>
            <p className="text-xs text-gray-500 text-center mb-6 font-bold">
              본인의 역할을 선택하세요
            </p>

            <div className="space-y-3">
              <RoleCard
                icon="format_paint"
                title="도료사"
                desc="현장에서 검사 데이터를 기록"
                onClick={() => pickRole('maker')}
              />
              <RoleCard
                icon="verified_user"
                title="QM"
                desc="검사 현황 관리 및 검토"
                onClick={() => pickRole('qm')}
              />
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <div className="text-[10px] text-gray-400 font-bold tracking-wider">
                선주는 별도로 발급된 프로젝트 URL로 접속하세요
              </div>
            </div>
          </div>
        )}

        {/* ===== Step 2: 정보 입력 ===== */}
        {step === 'info' && (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md p-6">
            <div className="flex items-center gap-2 mb-5">
              <button
                type="button"
                onClick={goBack}
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-600"
              >
                <span className="material-icons text-base">arrow_back</span>
              </button>
              <h2 className="text-lg font-black flex-1">
                {role === 'maker' ? '도료사' : 'QM'} 등록
              </h2>
            </div>

            {/* 이름 */}
            <div className="mb-4">
              <label className="block text-xs font-black text-gray-700 mb-1.5">
                이름 <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="홍길동"
                autoFocus
                className="w-full px-4 py-3 border-[1.5px] border-gray-300 rounded-lg text-base font-bold focus:outline-none focus:border-[#5ecbd6]"
              />
            </div>

            {/* 도료사 선택 (maker만) */}
            {role === 'maker' && (
              <div className="mb-5">
                <label className="block text-xs font-black text-gray-700 mb-1.5">
                  소속 도료사 <span className="text-danger">*</span>
                </label>
                {loadingMakers ? (
                  <div className="py-6 text-center text-xs text-gray-500 font-bold">
                    <span className="material-icons animate-spin text-base">refresh</span>
                    <div className="mt-1">불러오는 중...</div>
                  </div>
                ) : makers.length === 0 ? (
                  <div className="bg-warning-light text-warning p-3 rounded-lg text-xs font-bold">
                    <span className="material-icons text-base align-middle">warning</span>
                    {' '}도료사 목록이 비어 있습니다. 관리자에게 문의하세요.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {makers.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMakerName(m.name)}
                        className={`py-3 px-3 rounded-lg text-sm font-black border-2 transition-all ${
                          selectedMakerName === m.name
                            ? 'bg-[#1a2332] text-white border-[#1a2332]'
                            : 'bg-white text-[#1a2332] border-gray-200 hover:border-[#5ecbd6]'
                        }`}
                      >
                        {m.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="mb-4 px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 bg-danger-light text-danger">
                <span className="material-icons text-base">error_outline</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-lg text-sm font-black flex items-center justify-center gap-2 transition-all hover:-translate-y-px disabled:opacity-60 disabled:cursor-not-allowed disabled:translate-y-0"
              style={{ background: '#1a2332', color: 'white' }}
            >
              <span className="material-icons text-[18px]">
                {submitting ? 'hourglass_top' : 'login'}
              </span>
              {submitting ? '등록 중...' : '시작하기'}
            </button>
          </form>
        )}

        {/* 하단 안내 */}
        <div className="text-center mt-6 text-[11px] text-gray-400 font-bold">
          © 2026 Hi-Trust Team
        </div>
      </div>
    </div>
  )
}

function RoleCard({
  icon, title, desc, onClick,
}: {
  icon: string
  title: string
  desc: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full bg-white border-2 border-gray-200 rounded-xl p-4 flex items-center gap-4 hover:border-[#5ecbd6] hover:shadow-[0_8px_24px_rgba(94,203,214,0.12)] transition-all text-left"
    >
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-white flex-shrink-0"
        style={{
          background: 'linear-gradient(135deg, #5ecbd6 0%, #2dd4bf 100%)',
        }}
      >
        <span className="material-icons">{icon}</span>
      </div>
      <div className="flex-1">
        <div className="font-black text-base text-[#1a2332]">{title}</div>
        <div className="text-xs text-gray-500 font-bold mt-0.5">{desc}</div>
      </div>
      <span className="material-icons text-gray-300">chevron_right</span>
    </button>
  )
}

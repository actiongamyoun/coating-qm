'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signup } from '@/lib/actions/auth'

type Role = 'maker' | 'qm' | 'owner'
const MAKERS = ['KCC', 'IPK', 'Jotun', 'CMP', '노로코트', '정석케미컬']

export default function SignupForm() {
  const router = useRouter()
  const [role, setRole] = useState<Role>('maker')
  const [maker, setMaker] = useState<string>('KCC')
  const [name, setName] = useState<string>('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    const userId = localStorage.getItem('coating_qm_user_id')
    const userRole = localStorage.getItem('coating_qm_user_role')
    if (userId && userRole) {
      if (userRole === 'maker') router.replace('/maker')
      else if (userRole === 'qm') router.replace('/qm')
      else if (userRole === 'owner') router.replace('/owner')
    }
  }, [router])

  function getDeviceId(): string {
    let id = localStorage.getItem('coating_qm_device_id')
    if (!id) {
      id = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
      localStorage.setItem('coating_qm_device_id', id)
    }
    return id
  }

  async function handleSubmit() {
    setError('')
    if (!name.trim()) {
      setError('이름을 입력하세요')
      return
    }
    if (role === 'maker' && !maker) {
      setError('소속 메이커를 선택하세요')
      return
    }

    setSubmitting(true)
    const res = await signup({
      role,
      maker_name: role === 'maker' ? maker : undefined,
      name: name.trim(),
      device_id: getDeviceId(),
    })
    setSubmitting(false)

    if (!res.success || !res.user_id) {
      setError(res.error || '등록 실패')
      return
    }

    localStorage.setItem('coating_qm_user_id', res.user_id)
    localStorage.setItem('coating_qm_user_role', res.role)
    localStorage.setItem('coating_qm_user_name', res.name)
    if (res.maker_name) {
      localStorage.setItem('coating_qm_user_maker', res.maker_name)
    } else {
      localStorage.removeItem('coating_qm_user_maker')
    }

    if (role === 'maker') router.push('/maker')
    else if (role === 'qm') router.push('/qm')
    else router.push('/owner')
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-dark via-primary to-white flex flex-col items-center px-5 py-10">
      <div className="text-center text-white mb-7">
        <span className="material-icons text-6xl">format_paint</span>
        <h2 className="text-lg font-black mt-2">조선소 도장 품질관리</h2>
        <p className="text-xs opacity-85 mt-1">최초 등록 (이 기기에서 1회)</p>
      </div>

      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="text-sm font-black text-gray-700 mb-3 flex items-center gap-1.5">
          <span className="material-icons text-base text-primary">person</span>
          1. 내 역할
        </div>
        <div className="grid grid-cols-3 gap-2.5 mb-4">
          <RoleCard icon="format_paint" label="도료사" selected={role === 'maker'} onClick={() => setRole('maker')} />
          <RoleCard icon="verified_user" label="QM" selected={role === 'qm'} onClick={() => setRole('qm')} />
          <RoleCard icon="visibility" label="선주" selected={role === 'owner'} onClick={() => setRole('owner')} />
        </div>

        {role === 'maker' && (
          <>
            <div className="text-sm font-black text-gray-700 mb-3 flex items-center gap-1.5">
              <span className="material-icons text-base text-paint">palette</span>
              2. 소속 메이커
            </div>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {MAKERS.map(m => (
                <button
                  key={m}
                  onClick={() => setMaker(m)}
                  className={`border-2 rounded-xl p-3.5 font-black text-sm transition-colors ${
                    maker === m
                      ? 'border-paint bg-paint-light text-paint'
                      : 'border-gray-300 bg-white hover:border-paint/50'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </>
        )}

        <div className="text-sm font-black text-gray-700 mb-3 flex items-center gap-1.5">
          <span className="material-icons text-base text-primary">badge</span>
          {role === 'maker' ? '3' : '2'}. 이름
        </div>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="예: 김도장"
          className="w-full p-3.5 border-[1.5px] border-gray-300 rounded-xl text-base font-bold focus:outline-none focus:border-primary mb-5"
        />

        {error && (
          <div className="bg-danger-light text-danger px-3 py-2 rounded-lg text-sm font-bold mb-3 flex items-center gap-1.5">
            <span className="material-icons text-base">error</span>
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-primary hover:bg-primary-dark text-white py-4 rounded-xl text-base font-black flex items-center justify-center gap-2 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span className="material-icons">{submitting ? 'hourglass_top' : 'login'}</span>
          {submitting ? '등록 중...' : '시작하기'}
        </button>

        <p className="text-center text-xs text-gray-500 mt-3">
          설정에서 변경 가능합니다
        </p>
      </div>
    </div>
  )
}

function RoleCard({
  icon, label, selected, onClick,
}: {
  icon: string
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`border-2 rounded-xl py-4 px-2 transition-colors ${
        selected
          ? 'border-primary bg-primary-light'
          : 'border-gray-300 bg-white hover:border-primary/50'
      }`}
    >
      <span className="material-icons text-3xl block mb-1 text-primary">
        {icon}
      </span>
      <div className="text-xs font-black">{label}</div>
    </button>
  )
}

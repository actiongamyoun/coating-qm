'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminLogin } from '@/lib/actions/admin-auth'

export default function AdminLogin() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!password.trim()) {
      setError('비밀번호를 입력하세요.')
      return
    }
    setSubmitting(true)
    const res = await adminLogin(password)
    setSubmitting(false)

    if (res.success) {
      // 새로고침으로 서버 컴포넌트 다시 평가
      router.refresh()
    } else {
      setError(res.error || '로그인 실패')
      setPassword('')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-admin to-emerald-900 flex flex-col items-center justify-center px-5">
      <div className="text-center text-white mb-7">
        <span className="material-icons text-6xl">admin_panel_settings</span>
        <h2 className="text-lg font-black mt-2">관리자 인증</h2>
        <p className="text-xs opacity-85 mt-1">마스터 데이터 입력 (관리자 전용)</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
      >
        <div className="text-sm font-black text-gray-700 mb-3 flex items-center gap-1.5">
          <span className="material-icons text-base text-admin">lock</span>
          관리자 비밀번호
        </div>

        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="비밀번호 입력"
          autoComplete="current-password"
          autoFocus
          className="w-full p-3.5 border-[1.5px] border-gray-300 rounded-xl text-base font-bold focus:outline-none focus:border-admin mb-4"
        />

        {error && (
          <div className="bg-danger-light text-danger px-3 py-2 rounded-lg text-sm font-bold mb-3 flex items-center gap-1.5">
            <span className="material-icons text-base">error</span>
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-admin hover:bg-emerald-900 text-white py-4 rounded-xl text-base font-black flex items-center justify-center gap-2 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <span className="material-icons">
            {submitting ? 'hourglass_top' : 'login'}
          </span>
          {submitting ? '확인 중...' : '로그인'}
        </button>

        <p className="text-center text-xs text-gray-500 mt-4">
          세션 유지: 1시간 · 비밀번호 분실 시 시스템 담당자에게 문의
        </p>
      </form>

      <a
        href="/"
        className="mt-6 text-white/80 text-sm font-bold underline-offset-2 hover:underline"
      >
        ← 홈으로 돌아가기
      </a>
    </div>
  )
}

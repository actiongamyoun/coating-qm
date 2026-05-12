'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function MakerHome() {
  const router = useRouter()
  const [user, setUser] = useState<{name: string; maker: string} | null>(null)

  useEffect(() => {
    const id = localStorage.getItem('coating_qm_user_id')
    const role = localStorage.getItem('coating_qm_user_role')
    if (!id || role !== 'maker') {
      router.replace('/signup')
      return
    }
    setUser({
      name: localStorage.getItem('coating_qm_user_name') || '',
      maker: localStorage.getItem('coating_qm_user_maker') || '',
    })
  }, [router])

  function handleLogout() {
    if (!confirm('등록을 초기화하시겠습니까?')) return
    localStorage.removeItem('coating_qm_user_id')
    localStorage.removeItem('coating_qm_user_role')
    localStorage.removeItem('coating_qm_user_name')
    localStorage.removeItem('coating_qm_user_maker')
    router.replace('/signup')
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-primary text-white p-4 flex items-center gap-3 shadow">
        <span className="material-icons text-3xl">format_paint</span>
        <div className="flex-1">
          <div className="text-xs opacity-85 font-bold">도료사</div>
          <div className="text-base font-black">{user.maker} · {user.name}</div>
        </div>
        <button onClick={handleLogout} className="bg-white/15 rounded-full w-9 h-9 flex items-center justify-center">
          <span className="material-icons text-base">settings</span>
        </button>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        <Link
          href="/maker/new"
          className="block bg-primary hover:bg-primary-dark text-white py-5 rounded-xl text-base font-black text-center shadow-md"
        >
          <span className="material-icons text-2xl align-middle mr-2">add_circle</span>
          새 검사 기록
        </Link>

        <div className="bg-primary-light text-primary-dark p-4 rounded-xl text-sm font-bold">
          <span className="material-icons align-middle mr-1">tips_and_updates</span>
          최근 기록 목록은 추후 추가될 예정입니다.
        </div>

        <Link
          href="/admin/master"
          className="block bg-white border-2 border-admin text-admin py-3 rounded-xl text-sm font-black text-center"
        >
          <span className="material-icons align-middle mr-1">admin_panel_settings</span>
          마스터 데이터 입력 (관리자)
        </Link>
      </div>
    </div>
  )
}

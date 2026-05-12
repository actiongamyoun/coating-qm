'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function QmHome() {
  const router = useRouter()
  const [name, setName] = useState('')

  useEffect(() => {
    const id = localStorage.getItem('coating_qm_user_id')
    const role = localStorage.getItem('coating_qm_user_role')
    if (!id || role !== 'qm') {
      router.replace('/signup')
      return
    }
    setName(localStorage.getItem('coating_qm_user_name') || '')
  }, [router])

  function handleLogout() {
    if (!confirm('등록을 초기화하시겠습니까?')) return
    localStorage.clear()
    router.replace('/signup')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="bg-gray-900 text-white p-4 flex items-center gap-3 shadow">
        <span className="material-icons text-3xl">verified_user</span>
        <div className="flex-1">
          <div className="text-xs opacity-85 font-bold">QM</div>
          <div className="text-base font-black">{name}</div>
        </div>
        <button onClick={handleLogout} className="bg-white/15 rounded-full w-9 h-9 flex items-center justify-center">
          <span className="material-icons text-base">settings</span>
        </button>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        <div className="bg-primary-light text-primary-dark p-4 rounded-xl text-sm font-bold">
          <span className="material-icons align-middle mr-1">tips_and_updates</span>
          QM 대시보드는 추후 추가될 예정입니다.
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

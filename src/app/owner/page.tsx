'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function OwnerHome() {
  const router = useRouter()
  const [name, setName] = useState('')

  useEffect(() => {
    const id = localStorage.getItem('coating_qm_user_id')
    const role = localStorage.getItem('coating_qm_user_role')
    if (!id || role !== 'owner') {
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
      <div className="bg-slate-700 text-white p-4 flex items-center gap-3 shadow">
        <span className="material-icons text-3xl">visibility</span>
        <div className="flex-1">
          <div className="text-xs opacity-85 font-bold">선주 감독관</div>
          <div className="text-base font-black">{name}</div>
        </div>
        <button onClick={handleLogout} className="bg-white/15 rounded-full w-9 h-9 flex items-center justify-center">
          <span className="material-icons text-base">settings</span>
        </button>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        <div className="bg-primary-light text-primary-dark p-4 rounded-xl text-sm font-bold">
          <span className="material-icons align-middle mr-1">tips_and_updates</span>
          선주 대시보드는 추후 추가될 예정입니다.
        </div>
      </div>
    </div>
  )
}

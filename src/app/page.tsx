'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const userId = localStorage.getItem('coating_qm_user_id')
    const role = localStorage.getItem('coating_qm_user_role')
    if (userId && role) {
      if (role === 'maker') router.replace('/maker')
      else if (role === 'qm') router.replace('/qm')
      else if (role === 'owner') router.replace('/owner')
    } else {
      router.replace('/signup')
    }
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary-dark to-primary text-white">
      <div className="text-center">
        <span className="material-icons text-6xl">format_paint</span>
        <h1 className="text-xl font-black mt-2">조선소 도장 품질관리</h1>
        <p className="text-sm opacity-85 mt-4">불러오는 중...</p>
      </div>
    </div>
  )
}

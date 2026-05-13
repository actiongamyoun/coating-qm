'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import QmDashboard from './QmDashboard'

export default function QmHome() {
  const router = useRouter()
  const [user, setUser] = useState<{name: string} | null>(null)

  useEffect(() => {
    const id = localStorage.getItem('coating_qm_user_id')
    const role = localStorage.getItem('coating_qm_user_role')
    if (!id || role !== 'qm') {
      router.replace('/signup')
      return
    }
    setUser({
      name: localStorage.getItem('coating_qm_user_name') || '',
    })
  }, [router])

  function handleLogout() {
    if (!confirm('등록을 초기화하시겠습니까?')) return
    localStorage.clear()
    router.replace('/signup')
  }

  if (!user) return null
  return <QmDashboard userName={user.name} onLogout={handleLogout} />
}

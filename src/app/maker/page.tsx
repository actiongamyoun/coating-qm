'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { getSessions } from '@/lib/actions/sessions'

type SessionItem = Awaited<ReturnType<typeof getSessions>>[number]

export default function MakerHome() {
  const router = useRouter()
  const [user, setUser] = useState<{id: string; name: string; maker: string} | null>(null)
  const [sessions, setSessions] = useState<SessionItem[]>([])
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    if (!user?.id) return
    setLoading(true)
    getSessions({ userId: user.id, limit: 30 }).then(data => {
      setSessions(data)
      setLoading(false)
    })
  }, [user?.id])

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
      {/* 상단 */}
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
        {/* 통계 카드 */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="전체" value={sessions.length} icon="description" color="text-gray-900" />
          <StatCard
            label="이번 주"
            value={sessions.filter(s => isThisWeek(s.inspected_at)).length}
            icon="event"
            color="text-primary"
          />
          <StatCard
            label="오늘"
            value={sessions.filter(s => isToday(s.inspected_at)).length}
            icon="today"
            color="text-success"
          />
        </div>

        {/* 새 검사 작성 버튼 */}
        <Link
          href="/maker/new"
          className="block bg-primary hover:bg-primary-dark text-white py-5 rounded-xl text-base font-black text-center shadow-md"
        >
          <span className="material-icons text-2xl align-middle mr-2">add_circle</span>
          새 검사 기록
        </Link>

        {/* 최근 기록 */}
        <div>
          <div className="font-black text-sm text-gray-700 mb-2 flex items-center gap-1 px-1">
            <span className="material-icons text-base">history</span>
            내 검사 기록
          </div>

          {loading ? (
            <div className="bg-white rounded-xl p-6 text-center text-sm text-gray-500">
              불러오는 중...
            </div>
          ) : sessions.length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center text-sm text-gray-500">
              아직 기록이 없습니다.<br />
              위 <strong className="text-primary">새 검사 기록</strong> 버튼을 눌러 시작하세요.
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map(s => (
                <Link
                  key={s.id}
                  href={`/sessions/${s.id}`}
                  className="block bg-white border border-gray-200 rounded-xl p-3 hover:border-primary hover:bg-primary-light/30 transition-colors"
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-black text-sm flex items-center gap-1.5">
                      <span className="material-icons text-base text-primary">
                        {iconByCoat(s.coat_order)}
                      </span>
                      {s.block_code} · {s.coat_label}
                    </div>
                    <span className="text-[11px] text-gray-500 font-bold">
                      {format(new Date(s.inspected_at), 'M/d HH:mm')}
                    </span>
                  </div>
                  <div className="text-xs text-gray-700 flex items-center gap-1 font-bold">
                    <span className="material-icons text-sm">directions_boat</span>
                    {s.ship_name}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  label, value, icon, color,
}: {
  label: string
  value: number
  icon: string
  color: string
}) {
  return (
    <div className="bg-white rounded-xl p-3 text-center shadow-sm">
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      <div className="text-[10px] text-gray-700 font-bold mt-1 flex items-center justify-center gap-0.5">
        <span className="material-icons text-sm">{icon}</span>
        {label}
      </div>
    </div>
  )
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr)
  const today = new Date()
  return d.toDateString() === today.toDateString()
}

function isThisWeek(dateStr: string): boolean {
  const d = new Date(dateStr)
  const now = new Date()
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - now.getDay())
  weekStart.setHours(0, 0, 0, 0)
  return d >= weekStart
}

function iconByCoat(order: number): string {
  if (order === 1) return 'science'      // 표면 처리
  if (order === 99) return 'flag'        // FINAL
  return 'format_paint'                  // 일반 도장
}

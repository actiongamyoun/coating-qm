'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { getSessions } from '@/lib/actions/sessions'
import AppHeader from '@/components/AppHeader'

type SessionItem = Awaited<ReturnType<typeof getSessions>>[number]

export default function MakerHome() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; name: string; maker: string } | null>(null)
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

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-100">
      <AppHeader
        roleLabel="도료사"
        roleIcon="format_paint"
        subtitle={`${user.maker}${user.name ? ' · ' + user.name : ''}`}
      />

      <div className="max-w-md mx-auto p-4 space-y-4">
        {/* 통계 카드 */}
        <div className="grid grid-cols-3 gap-2">
          <StatCard label="전체" value={sessions.length} icon="description" tone="dark" />
          <StatCard
            label="이번 주"
            value={sessions.filter(s => isThisWeek(s.inspected_at)).length}
            icon="event"
            tone="cyan"
          />
          <StatCard
            label="오늘"
            value={sessions.filter(s => isToday(s.inspected_at)).length}
            icon="today"
            tone="success"
          />
        </div>

        {/* 새 검사 작성 버튼 */}
        <Link
          href="/maker/new"
          className="block rounded-xl text-base font-black text-center text-white py-5 transition-all hover:-translate-y-0.5"
          style={{
            background: 'linear-gradient(135deg, #1a2332 0%, #243144 100%)',
            boxShadow: '0 8px 20px rgba(26, 35, 50, 0.25)',
          }}
        >
          <span
            className="material-icons text-2xl align-middle mr-2"
            style={{ color: '#5ecbd6' }}
          >
            add_circle
          </span>
          새 검사 기록
        </Link>

        {/* 최근 기록 */}
        <div>
          <div className="font-black text-sm text-[#1a2332] mb-2 flex items-center gap-1 px-1">
            <span className="material-icons text-base" style={{ color: '#5ecbd6' }}>history</span>
            내 검사 기록
          </div>

          {loading ? (
            <div className="bg-white rounded-xl p-6 text-center text-sm text-gray-500 font-bold border border-gray-200">
              불러오는 중...
            </div>
          ) : sessions.length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center text-sm text-gray-500 font-bold border border-gray-200">
              아직 기록이 없습니다.<br />
              위 <strong style={{ color: '#1a2332' }}>새 검사 기록</strong> 버튼을 눌러 시작하세요.
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map(s => (
                <Link
                  key={s.id}
                  href={`/sessions/${s.id}`}
                  className="block bg-white border border-gray-200 rounded-xl p-3 transition-all hover:border-[#5ecbd6] hover:shadow-[0_4px_12px_rgba(94,203,214,0.15)]"
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-black text-sm flex items-center gap-1.5 text-[#1a2332]">
                      <span
                        className="material-icons text-base"
                        style={{ color: '#5ecbd6' }}
                      >
                        {iconByCoat(s.coat_order)}
                      </span>
                      {s.block_code} · {s.coat_label}
                    </div>
                    <span className="text-[11px] text-gray-500 font-bold">
                      {format(new Date(s.inspected_at), 'M/d HH:mm')}
                    </span>
                  </div>
                  <div className="text-xs text-gray-700 flex items-center gap-1 font-bold">
                    <span className="material-icons text-sm text-gray-400">directions_boat</span>
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
  label, value, icon, tone,
}: {
  label: string
  value: number
  icon: string
  tone: 'dark' | 'cyan' | 'success'
}) {
  const colorStyle =
    tone === 'dark'
      ? { color: '#1a2332' }
      : tone === 'cyan'
        ? { color: '#0891a3' }
        : { color: '#16a34a' }

  return (
    <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-200">
      <div className="text-2xl font-black" style={colorStyle}>{value}</div>
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
  if (order === 1) return 'science'
  if (order === 99) return 'flag'
  return 'format_paint'
}

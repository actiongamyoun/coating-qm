'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
  getShipsWithStats,
  getShipProgress,
  getIncompleteSessions,
} from '@/lib/actions/dashboard'
import { getSessions } from '@/lib/actions/sessions'

type Ship = Awaited<ReturnType<typeof getShipsWithStats>>[number]
type Progress = Awaited<ReturnType<typeof getShipProgress>>[number]
type Incomplete = Awaited<ReturnType<typeof getIncompleteSessions>>[number]
type Session = Awaited<ReturnType<typeof getSessions>>[number]

export default function QmDashboard({
  userName,
  onLogout,
}: {
  userName: string
  onLogout: () => void
}) {
  const [ships, setShips] = useState<Ship[]>([])
  const [selectedShipId, setSelectedShipId] = useState<string>('')
  const [progress, setProgress] = useState<Progress[]>([])
  const [incomplete, setIncomplete] = useState<Incomplete[]>([])
  const [recentSessions, setRecentSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  // 호선 목록 로드
  useEffect(() => {
    getShipsWithStats().then(data => {
      setShips(data)
      if (data.length > 0) setSelectedShipId(data[0].id)
    })
  }, [])

  // 선택 호선의 데이터 로드
  useEffect(() => {
    if (!selectedShipId) {
      setProgress([])
      setIncomplete([])
      setRecentSessions([])
      setLoading(false)
      return
    }
    setLoading(true)
    Promise.all([
      getShipProgress(selectedShipId),
      getIncompleteSessions(selectedShipId),
      getSessions({ shipId: selectedShipId, limit: 20 }),
    ]).then(([p, i, r]) => {
      setProgress(p)
      setIncomplete(i)
      setRecentSessions(r)
      setLoading(false)
    })
  }, [selectedShipId])

  // 통계
  const totalSessions = recentSessions.length
  const missingCount = incomplete.length
  const completeCount = totalSessions - missingCount

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 상단 */}
      <div className="bg-gray-900 text-white p-4 flex items-center gap-3 shadow">
        <span className="material-icons text-3xl">verified_user</span>
        <div className="flex-1">
          <div className="text-xs opacity-85 font-bold">QM</div>
          <div className="text-base font-black">{userName}</div>
        </div>
        <button
          onClick={onLogout}
          className="bg-white/15 rounded-full w-9 h-9 flex items-center justify-center"
        >
          <span className="material-icons text-base">settings</span>
        </button>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        {ships.length === 0 ? (
          <div className="bg-warning-light text-warning p-4 rounded-xl text-sm font-bold">
            <span className="material-icons align-middle mr-1">warning</span>
            등록된 호선이 없습니다. 관리자가 마스터 데이터를 입력해야 합니다.
          </div>
        ) : (
          <>
            {/* 호선 선택 */}
            <div>
              <label className="block text-xs font-black text-gray-700 mb-1.5 px-1">
                <span className="material-icons text-sm align-middle mr-0.5">directions_boat</span>
                호선 선택
              </label>
              <select
                value={selectedShipId}
                onChange={e => setSelectedShipId(e.target.value)}
                className="w-full p-3 border-[1.5px] border-gray-300 rounded-lg font-black bg-white"
              >
                {ships.map(s => (
                  <option key={s.id} value={s.id}>
                    🚢 {s.name}{s.ship_type ? ` · ${s.ship_type}` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* 통계 */}
            <div className="grid grid-cols-3 gap-2">
              <StatCard label="전체" value={totalSessions} icon="description" color="text-gray-900" />
              <StatCard label="미입력" value={missingCount} icon="priority_high" color="text-danger" />
              <StatCard label="완료" value={completeCount} icon="check_circle" color="text-success" />
            </div>

            {/* 블록별 진척률 */}
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="font-black text-sm text-gray-700 mb-3 flex items-center gap-1">
                <span className="material-icons text-base text-primary">trending_up</span>
                블록별 진척률
              </div>
              {loading ? (
                <div className="text-center text-sm text-gray-500 py-4">불러오는 중...</div>
              ) : progress.length === 0 ? (
                <div className="text-center text-sm text-gray-500 py-4">블록이 등록되지 않음</div>
              ) : (
                <div className="space-y-3">
                  {progress.map(p => (
                    <BlockProgressRow key={p.block_id} p={p} />
                  ))}
                </div>
              )}
            </div>

            {/* 미입력 알림 */}
            {!loading && incomplete.length > 0 && (
              <div>
                <div className="font-black text-sm text-gray-700 mb-2 flex items-center gap-1 px-1">
                  <span className="material-icons text-base text-danger">priority_high</span>
                  미입력 ({incomplete.length}건)
                </div>
                <div className="space-y-2">
                  {incomplete.map(s => (
                    <Link
                      key={s.id}
                      href={`/sessions/${s.id}`}
                      className="block bg-white border-l-4 border-danger border-y border-r border-gray-200 rounded-xl p-3 hover:bg-danger-light/30"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="font-black text-sm flex items-center gap-1.5">
                          <span className="inline-block w-2.5 h-2.5 rounded-full bg-danger animate-pulse" />
                          {s.block_code} · {s.coat_label}
                        </div>
                        <span className="text-[11px] text-gray-500 font-bold">
                          {format(new Date(s.inspected_at), 'M/d HH:mm')}
                        </span>
                      </div>
                      <div className="text-xs text-gray-700 mb-1.5 font-bold">
                        {s.recorder_maker && `${s.recorder_maker} · `}{s.recorder_name}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {s.missing.map((m, i) => (
                          <span
                            key={i}
                            className="bg-danger-light text-danger px-2 py-0.5 rounded-full text-[10px] font-black flex items-center gap-0.5 border border-dashed border-danger"
                          >
                            <span className="material-icons text-[12px]">warning</span>
                            {m}
                          </span>
                        ))}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* 최근 검사 기록 */}
            <div>
              <div className="font-black text-sm text-gray-700 mb-2 flex items-center gap-1 px-1">
                <span className="material-icons text-base">history</span>
                최근 검사 ({recentSessions.length})
              </div>
              {loading ? (
                <div className="bg-white rounded-xl p-6 text-center text-sm text-gray-500">
                  불러오는 중...
                </div>
              ) : recentSessions.length === 0 ? (
                <div className="bg-white rounded-xl p-6 text-center text-sm text-gray-500">
                  아직 검사 기록이 없습니다.
                </div>
              ) : (
                <div className="space-y-2">
                  {recentSessions.slice(0, 10).map(s => (
                    <Link
                      key={s.id}
                      href={`/sessions/${s.id}`}
                      className="block bg-white border border-gray-200 rounded-xl p-3 hover:border-primary"
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
                      <div className="text-xs text-gray-700 font-bold">
                        {s.recorder_maker && `${s.recorder_maker} · `}{s.recorder_name}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
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

function BlockProgressRow({ p }: { p: Progress }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <div className="text-sm font-black flex items-center gap-1">
          {p.block_code}
          {p.vendor_name && (
            <span className="text-[10px] text-gray-500 font-bold ml-1">
              · {p.vendor_name}
            </span>
          )}
        </div>
        <div className="text-sm font-black">{p.percent}%</div>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-1.5">
        <div
          className={`h-full transition-all ${
            p.percent === 100 ? 'bg-success' : p.percent >= 50 ? 'bg-primary' : 'bg-warning'
          }`}
          style={{ width: `${p.percent}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {p.coat_orders.map(o => {
          const done = p.completed_coats.includes(o)
          return (
            <span
              key={o}
              className={`px-2 py-0.5 rounded text-[10px] font-black ${
                done
                  ? 'bg-success-light text-success'
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              {o === 99 ? 'FINAL' : `${o}${coatSuffix(o)}`}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function coatSuffix(n: number): string {
  if (n === 1) return 'ST'
  if (n === 2) return 'ND'
  if (n === 3) return 'RD'
  return 'TH'
}

function iconByCoat(order: number): string {
  if (order === 1) return 'science'
  if (order === 99) return 'flag'
  return 'format_paint'
}

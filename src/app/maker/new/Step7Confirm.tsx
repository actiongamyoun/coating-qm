'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { WizardState } from './Wizard'
import { saveInspection, fillInspectionData } from '@/lib/actions/inspection-save'

type Props = {
  state: WizardState
  user: { id: string; name: string; maker: string }
  sessionId: string | null
  onBack: () => void
}

export default function Step7Confirm({ state, user, sessionId, onBack }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isFirst = state.coat_order === 1
  const isFinal = state.coat_order === 99

  const envFilled = state.env_air_temp && state.env_surface_temp && state.env_humidity
  const batchMissing = isFinal
    ? 0
    : state.batches.filter(b => !b.base_no.trim() && !b.hardener_no.trim()).length
  const measureMissing = state.measurements.filter(m => {
    if (isFirst) return !m.salt && !m.dust_size && !m.dust_quantity && !m.profile
    return !m.dft_avg && !m.dft_min && !m.dft_max
  }).length

  async function handleSave() {
    setError('')
    setSaving(true)

    let result: { success: boolean; session_id?: string; error?: string }

    if (sessionId) {
      // 이미 세션이 있음 (Step 2에서 createInspectionSession 호출됨)
      // → 나머지 데이터만 채워 넣기
      const res = await fillInspectionData(sessionId, state, user.id)
      result = { ...res, session_id: sessionId }
    } else {
      // 세션 없음 (기존 흐름) → 한 번에 저장
      result = await saveInspection(state, user.id)
    }

    setSaving(false)

    if (result.success) {
      alert('저장 완료')
      if (result.session_id) {
        router.push(`/sessions/${result.session_id}`)
      } else {
        router.push('/maker')
      }
    } else {
      setError(result.error || '저장 실패')
    }
  }

  return (
    <div className="space-y-3">
      {sessionId && (
        <div className="bg-success-light text-success p-3 rounded-lg text-xs font-bold flex items-start gap-2">
          <span className="material-icons text-base">check_circle</span>
          <div>
            검사 세션이 이미 저장되었습니다. <strong>완료</strong> 버튼을 누르면 환경·Batch·측정값이 추가 저장됩니다.
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="font-black text-sm text-gray-700 mb-3 flex items-center gap-1">
          <span className="material-icons text-base text-primary">summarize</span>요약
        </div>
        <SummaryRow label="호선" value={state.ship_name} />
        <SummaryRow label="블록 / 회차" value={`${state.block_code} / ${state.coat_label}`} />
        <SummaryRow label="협력사" value={state.vendor_name || '-'} />
        <SummaryRow label="기록자" value={`${user.maker} · ${user.name}`} />
        <SummaryRow label="구역" value={`${state.zone_ids.length}개`} last />
      </div>

      {!isFinal && state.batches.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="font-black text-sm text-gray-700 mb-3 flex items-center gap-1">
            <span className="material-icons text-base text-paint">format_paint</span>Batch
          </div>
          {state.batches.map(b => (
            <div key={b.paint_name} className="flex justify-between items-start py-2 border-b border-gray-200 last:border-0 text-sm">
              <div>
                <div className="font-black">{b.paint_name}</div>
                <div className="text-[10px] text-gray-500">
                  {b.zone_ids.map(id => state.zones_info.find(z => z.id === id)?.name).filter(Boolean).join(', ')}
                </div>
              </div>
              <div className="text-right text-xs font-bold">
                {(b.base_no || b.hardener_no) ? (
                  <>
                    {b.base_no && <div>주제 {b.base_no}</div>}
                    {b.hardener_no && <div>경화제 {b.hardener_no}</div>}
                  </>
                ) : (
                  <MissingBadge />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="font-black text-sm text-gray-700 mb-3 flex items-center gap-1">
          <span className="material-icons text-base text-primary">fact_check</span>입력 현황
        </div>
        <StatusRow icon="thermostat" iconColor="text-paint" label="환경" status={envFilled ? 'ok' : 'miss'} note="" />
        {!isFinal && (
          <StatusRow
            icon="format_paint"
            iconColor="text-paint"
            label="Batch"
            status={batchMissing === 0 ? 'ok' : 'miss'}
            note={batchMissing > 0 ? `${batchMissing}건 미입력` : ''}
          />
        )}
        <StatusRow
          icon={isFirst ? 'science' : 'straighten'}
          iconColor="text-primary"
          label={isFirst ? '표면(Salt/Dust/Profile)' : 'DFT'}
          status={measureMissing === 0 ? 'ok' : 'miss'}
          note={measureMissing > 0 ? `${measureMissing}건 미입력` : ''}
          last
        />
      </div>

      {(batchMissing > 0 || measureMissing > 0 || !envFilled) && (
        <div className="bg-warning-light text-warning p-3 rounded-lg text-xs font-bold flex items-start gap-2">
          <span className="material-icons text-base">info</span>
          미입력 항목이 있어도 저장 가능합니다. 검사 상세 화면에서 ✏️ 수정 버튼으로 보완할 수 있습니다.
        </div>
      )}

      {error && (
        <div className="bg-danger-light text-danger p-3 rounded-lg text-sm font-bold flex items-center gap-2">
          <span className="material-icons text-base">error</span>{error}
        </div>
      )}

      <div className="flex gap-2 pt-3 border-t border-gray-200">
        <button onClick={onBack} className="flex-1 py-3 border-2 border-primary text-primary rounded-lg font-black">
          이전
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-success text-white py-3 rounded-lg font-black flex items-center justify-center gap-1 disabled:opacity-50"
        >
          <span className="material-icons">{saving ? 'hourglass_top' : 'check_circle'}</span>
          {saving ? '저장 중...' : sessionId ? '완료' : '저장'}
        </button>
      </div>
    </div>
  )
}

function SummaryRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex justify-between py-2 ${last ? '' : 'border-b border-gray-200'} text-sm`}>
      <span className="text-gray-700 font-bold">{label}</span>
      <span className="font-black">{value}</span>
    </div>
  )
}

function StatusRow({
  icon, iconColor, label, status, note, last,
}: {
  icon: string
  iconColor: string
  label: string
  status: 'ok' | 'miss'
  note: string
  last?: boolean
}) {
  return (
    <div className={`flex justify-between items-center py-2 ${last ? '' : 'border-b border-gray-200'}`}>
      <span className="font-bold text-sm flex items-center gap-1">
        <span className={`material-icons text-base ${iconColor}`}>{icon}</span>
        {label}
      </span>
      {status === 'ok' ? (
        <span className="bg-success-light text-success px-2 py-1 rounded-full text-[11px] font-black flex items-center gap-0.5">
          <span className="material-icons text-[14px]">check_circle</span>완료
        </span>
      ) : (
        <MissingBadge text={note} />
      )}
    </div>
  )
}

function MissingBadge({ text = '미입력' }: { text?: string }) {
  return (
    <span className="bg-danger-light text-danger px-2 py-1 rounded-full text-[11px] font-black border border-dashed border-danger flex items-center gap-0.5">
      <span className="material-icons text-[14px]">warning</span>{text}
    </span>
  )
}

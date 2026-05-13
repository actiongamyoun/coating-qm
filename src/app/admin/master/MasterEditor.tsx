'use client'

import { useState, useEffect } from 'react'
import { MASTER_COLUMNS, emptyRow, type MasterRow } from '@/types/master'
import { saveMasterData } from '@/lib/actions/master'
import { adminLogout } from '@/lib/actions/admin-auth'

export default function MasterEditor() {
  const [rows, setRows] = useState<MasterRow[]>(() =>
    Array.from({ length: 5 }, () => emptyRow())
  )
  const [toast, setToast] = useState<{ msg: string; type: 'success'|'error'|'info' } | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  const rowCount = rows.length
  const missingCount = rows.reduce((sum, r) => {
    let m = 0
    for (const col of MASTER_COLUMNS) {
      if (col.required && !r[col.key]?.toString().trim()) m++
    }
    return sum + m
  }, 0)

  function updateCell(rowIdx: number, key: keyof MasterRow, value: string) {
    setRows(prev => {
      const next = [...prev]
      next[rowIdx] = { ...next[rowIdx], [key]: value }
      return next
    })
  }

  function addRow() {
    setRows(prev => [...prev, emptyRow()])
  }

  function deleteRow(rowIdx: number) {
    setRows(prev => prev.filter((_, i) => i !== rowIdx))
  }

  function clearAll() {
    if (!confirm('모든 행을 삭제하시겠습니까?')) return
    setRows(Array.from({ length: 5 }, () => emptyRow()))
    setToast({ msg: '전체 삭제됨', type: 'info' })
  }

  function loadDemo() {
    if (!confirm('현재 표를 비우고 데모 데이터를 채울까요?')) return
    const demo: MasterRow[] = [
      { project:'NYK 계약', ship:'NYK 3395', block:'B20P0', code:'1A1A', name:'FLAT BOTTOM', surface:'B2', area_total:'176', area_pre:'162', coat_order:'1', maker:'KCC', paint:'EH2352(HS) SILVER RED-M', dft:'150', wet:'176', tsr:'5.7', psr:'2.9', theory_qty:'29', actual_qty:'55', stage:'선행', shop:'사내', pspc:'X', qm:'' },
      { project:'NYK 계약', ship:'NYK 3395', block:'B20P0', code:'1A1A', name:'FLAT BOTTOM', surface:'B2', area_total:'176', area_pre:'162', coat_order:'2', maker:'KCC', paint:'EH2352(HS) SILVER RED-M', dft:'150', wet:'176', tsr:'5.7', psr:'2.9', theory_qty:'29', actual_qty:'55', stage:'선행', shop:'사내', pspc:'X', qm:'' },
      { project:'NYK 계약', ship:'NYK 3395', block:'B20P0', code:'1A1A', name:'FLAT BOTTOM', surface:'B2', area_total:'176', area_pre:'162', coat_order:'3', maker:'KCC', paint:'EH2560 (L/YELLOW)', dft:'100', wet:'200', tsr:'5.0', psr:'3.0', theory_qty:'32', actual_qty:'54', stage:'선행', shop:'사내', pspc:'O', qm:'' },
      { project:'NYK 계약', ship:'NYK 3395', block:'B20P0', code:'4A1A', name:'BILGE WELL', surface:'T3', area_total:'4', area_pre:'4', coat_order:'1', maker:'KCC', paint:'EH2350(HS) RED 2260-M', dft:'150', wet:'167', tsr:'6.0', psr:'3.0', theory_qty:'1', actual_qty:'1', stage:'후행', shop:'사내', pspc:'X', qm:'O' },
      { project:'NYK 계약', ship:'NYK 3395', block:'B20S0', code:'1A1A', name:'FLAT BOTTOM', surface:'B2', area_total:'176', area_pre:'162', coat_order:'1', maker:'KCC', paint:'EH2352(HS) SILVER RED-M', dft:'150', wet:'176', tsr:'5.7', psr:'2.9', theory_qty:'29', actual_qty:'55', stage:'선행', shop:'사내', pspc:'X', qm:'' },
    ]
    setRows(demo)
    setToast({ msg: `${demo.length}행 데모 데이터 로드됨`, type: 'success' })
  }

  useEffect(() => {
    function handlePaste(e: ClipboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA') {
        return
      }
      const text = e.clipboardData?.getData('text') || ''
      if (!text.includes('\t') && !text.includes('\n')) return
      e.preventDefault()

      const lines = text.split(/\r?\n/).filter(l => l.trim())
      const parsed: MasterRow[] = lines.map(line => {
        const cells = line.split('\t')
        const row = emptyRow()
        MASTER_COLUMNS.forEach((col, i) => {
          if (cells[i] !== undefined) {
            (row as Record<string, string>)[col.key] = cells[i].trim()
          }
        })
        return row
      })

      setRows(prev => {
        const allEmpty = prev.every(r =>
          MASTER_COLUMNS.every(c => !r[c.key]?.toString().trim())
        )
        return allEmpty ? parsed : [...prev, ...parsed]
      })
      setToast({ msg: `${parsed.length}행 붙여넣기 완료`, type: 'success' })
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [])

  async function handleSave() {
    if (missingCount > 0) {
      setToast({ msg: `필수 컬럼 ${missingCount}건 미입력`, type: 'error' })
      return
    }
    const valid = rows.filter(r => r.block?.trim() && r.name?.trim())
    if (valid.length === 0) {
      setToast({ msg: '저장할 데이터가 없습니다', type: 'error' })
      return
    }

    setSaving(true)
    const res = await saveMasterData(valid)
    setSaving(false)

    if (res.success && res.stats) {
      setToast({
        msg: `저장 완료: 프로젝트${res.stats.projects} 호선${res.stats.ships} 블록${res.stats.blocks} 구역${res.stats.zones} 사양${res.stats.specs}`,
        type: 'success'
      })
    } else {
      setToast({ msg: res.error || '저장 실패', type: 'error' })
    }
  }

  async function handleLogout() {
    if (!confirm('관리자 로그아웃 하시겠습니까?')) return
    await adminLogout()
  }

  return (
    <div className="min-h-screen bg-[#ECEFF1]">
      <div className="sticky top-0 z-20 bg-admin text-white px-5 py-3 flex items-center gap-3 shadow-md">
        <span className="material-icons text-2xl">admin_panel_settings</span>
        <div className="flex-1 font-black text-base">마스터 데이터 입력</div>
        <span className="bg-white/20 px-2 py-1 rounded-full text-[11px] font-black">관리자 전용</span>
        <button
          onClick={handleLogout}
          className="bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-full text-[12px] font-black flex items-center gap-1"
          title="로그아웃"
        >
          <span className="material-icons text-base">logout</span>로그아웃
        </button>
      </div>

      <div className="max-w-[1400px] mx-auto p-5">
        <div className="bg-white border-2 border-dashed border-admin rounded-xl p-4 mb-4 text-center">
          <span className="material-icons text-4xl text-admin">content_paste</span>
          <div className="font-black mt-1">Excel에서 복사한 데이터를 여기에 붙여넣으세요</div>
          <div className="text-xs text-gray-600 mt-1">
            <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 border-b-2 rounded font-mono text-xs">Ctrl</kbd>
            +
            <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 border-b-2 rounded font-mono text-xs">V</kbd>
            {' '}또는 표에서 직접 셀 클릭 후 입력
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 mb-4 flex flex-wrap gap-3 items-center shadow-sm">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <span className="material-icons text-admin">table_chart</span>
            <div className="text-sm text-gray-700">
              총 <strong className="text-gray-900 font-black">{rowCount}</strong>행 · 필수 미입력{' '}
              <strong className="text-danger font-black">{missingCount}</strong>건
            </div>
          </div>
          <button onClick={addRow} className="btn-secondary">
            <span className="material-icons text-base">add</span>행 추가
          </button>
          <button onClick={loadDemo} className="btn-secondary">
            <span className="material-icons text-base">science</span>데모
          </button>
          <button onClick={clearAll} className="btn-danger-cls">
            <span className="material-icons text-base">delete</span>전체 삭제
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-success-cls">
            <span className="material-icons text-base">{saving ? 'hourglass_top' : 'save'}</span>
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>

        <div className="bg-white rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto max-h-[70vh]">
            <table className="w-full min-w-[1800px] text-xs border-collapse">
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="bg-admin text-white px-2 py-2.5 border border-admin w-[40px]">#</th>
                  {MASTER_COLUMNS.map(col => (
                    <th
                      key={col.key}
                      className={`bg-admin text-white px-2 py-2.5 border border-admin font-black whitespace-nowrap text-[11px] ${col.width}`}
                    >
                      {col.label}
                      {col.required && <span className="text-yellow-300"> *</span>}
                      <div className="text-[9px] opacity-70 font-normal mt-0.5">{col.type}</div>
                    </th>
                  ))}
                  <th className="bg-admin text-white border border-admin w-[40px]"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, rowIdx) => (
                  <tr key={rowIdx} className={rowIdx % 2 === 1 ? 'bg-gray-50' : 'bg-white'}>
                    <td className="bg-gray-100 text-center font-bold text-gray-700 text-[11px] border border-gray-300">
                      {rowIdx + 1}
                    </td>
                    {MASTER_COLUMNS.map(col => (
                      <td
                        key={col.key}
                        className={`border border-gray-300 p-0 ${
                          col.key === 'name' && row.pspc === 'O' ? 'bg-pink-50' : ''
                        }`}
                      >
                        {col.type === 'select' ? (
                          <select
                            value={row[col.key]}
                            onChange={e => updateCell(rowIdx, col.key, e.target.value)}
                            className="w-full p-2 bg-transparent text-xs font-medium outline-none"
                          >
                            {col.options?.map(opt => (
                              <option key={opt} value={opt}>{opt || '-'}</option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={row[col.key]}
                            onChange={e => updateCell(rowIdx, col.key, e.target.value)}
                            className={`w-full p-2 bg-transparent text-xs font-medium outline-none ${
                              col.key === 'name' && row.pspc === 'O' ? 'text-pink-700 font-black' : ''
                            }`}
                          />
                        )}
                      </td>
                    ))}
                    <td className="bg-gray-100 text-center border border-gray-300 p-0 w-[40px]">
                      <button
                        onClick={() => deleteRow(rowIdx)}
                        className="text-danger hover:bg-danger-light p-2 rounded"
                        title="행 삭제"
                      >
                        <span className="material-icons text-base">close</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 px-5 py-3 rounded-lg font-bold text-sm shadow-lg z-50 flex items-center gap-2 text-white ${
          toast.type === 'success' ? 'bg-success' :
          toast.type === 'error' ? 'bg-danger' :
          'bg-gray-900'
        }`}>
          <span className="material-icons text-base">
            {toast.type === 'success' ? 'check_circle' : toast.type === 'error' ? 'error' : 'info'}
          </span>
          {toast.msg}
        </div>
      )}

      <style jsx>{`
        :global(.btn-secondary) {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 8px 14px;
          border: 1.5px solid #E0E0E0;
          background: white;
          color: #616161;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }
        :global(.btn-secondary:hover) { background: #f5f5f5; }
        :global(.btn-danger-cls) {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 8px 14px;
          border: 1.5px solid #C62828;
          background: #FFEBEE;
          color: #C62828;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }
        :global(.btn-success-cls) {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 8px 14px;
          background: #2E7D32;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 900;
          cursor: pointer;
        }
        :global(.btn-success-cls:disabled) { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  )
}

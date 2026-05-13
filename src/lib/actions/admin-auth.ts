'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const COOKIE_NAME = 'coating_qm_admin'
const SESSION_HOURS = 1

/**
 * 관리자 로그인
 * 환경변수 ADMIN_PASSWORD와 일치하면 쿠키 발급
 */
export async function adminLogin(password: string): Promise<{ success: boolean; error?: string }> {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) {
    return { success: false, error: '서버에 ADMIN_PASSWORD가 설정되지 않았습니다.' }
  }
  if (!password) {
    return { success: false, error: '비밀번호를 입력하세요.' }
  }
  if (password !== expected) {
    return { success: false, error: '비밀번호가 일치하지 않습니다.' }
  }

  // 비번 검증 통과 → 쿠키 발급 (간단한 토큰: 만료시간 포함)
  const expiresAt = Date.now() + SESSION_HOURS * 60 * 60 * 1000
  const token = Buffer.from(JSON.stringify({ exp: expiresAt })).toString('base64')

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_HOURS * 60 * 60,
    path: '/',
  })

  return { success: true }
}

/**
 * 현재 관리자 로그인 상태 확인 (서버 컴포넌트에서 호출)
 */
export async function isAdminAuthed(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return false

  try {
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'))
    if (!decoded.exp || typeof decoded.exp !== 'number') return false
    if (Date.now() > decoded.exp) return false
    return true
  } catch {
    return false
  }
}

/**
 * 관리자 로그아웃
 */
export async function adminLogout() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
  redirect('/admin/master')
}

'use server'

import { createClient } from '@/lib/supabase/server'

export type SignupInput = {
  role: 'maker' | 'qm' | 'owner'
  maker_name?: string
  name: string
  device_id: string
}

export async function signup(input: SignupInput) {
  const supabase = await createClient()

  try {
    let maker_id: string | null = null
    if (input.role === 'maker' && input.maker_name) {
      const { data: existing } = await supabase
        .from('paint_makers')
        .select('id')
        .eq('name', input.maker_name)
        .maybeSingle()

      if (existing) {
        maker_id = existing.id
      } else {
        const { data: inserted, error } = await supabase
          .from('paint_makers')
          .insert({ name: input.maker_name })
          .select('id')
          .single()
        if (error) throw error
        maker_id = inserted.id
      }
    }

    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('device_id', input.device_id)
      .maybeSingle()

    const userPayload = {
      role: input.role,
      maker_id,
      name: input.name,
      device_id: input.device_id,
    }

    let userId: string
    if (existing) {
      const { error } = await supabase
        .from('users')
        .update(userPayload)
        .eq('id', existing.id)
      if (error) throw error
      userId = existing.id
    } else {
      const { data: inserted, error } = await supabase
        .from('users')
        .insert(userPayload)
        .select('id')
        .single()
      if (error) throw error
      userId = inserted.id
    }

    return {
      success: true,
      user_id: userId,
      role: input.role,
      maker_name: input.maker_name || null,
      name: input.name,
    }
  } catch (error: unknown) {
    console.error('Signup error:', error)
    const msg = error instanceof Error ? error.message : '등록 실패'
    return { success: false, error: msg }
  }
}

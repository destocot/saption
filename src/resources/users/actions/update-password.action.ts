'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function updatePasswordAction(phone: string) {
  let supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()

  supabase = createAdminClient()

  if (error) throw new Error('Unauthorized')

  return await supabase.auth.admin.updateUserById(data.user.id, {
    phone,
  })
}

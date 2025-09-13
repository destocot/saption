'use client'

import { createClient } from '@/lib/supabase/client'
import { useTransition } from 'react'
import { Button } from '@/components/ui/button'

export const LogoutButton = () => {
  const [isPending, startTransition] = useTransition()

  const handleClick = async () => {
    const supabase = createClient()

    startTransition(async () => {
      await supabase.auth.signOut()
      window.location.href = '/login'
    })
  }

  return (
    <Button
      size='sm'
      variant='destructive'
      onClick={handleClick}
      disabled={isPending}
    >
      Log Out
    </Button>
  )
}

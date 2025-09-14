'use client'

import { Button, buttonVariants } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { ProfileApartment } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'
import { TrashIcon } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { toast } from 'sonner'

interface ApartmentsListProps {
  apartments: Array<ProfileApartment>
}

export const ApartmentsList = ({ apartments }: ApartmentsListProps) => {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleDeleteApartment = async (apartmentId: string) => {
    const supabase = createClient()

    startTransition(async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error) throw new Error('Unauthorized')

      const { error: deleteError } = await supabase
        .from('profile_apartments')
        .delete()
        .eq('id', apartmentId)
        .eq('profile_id', data.user.id)

      if (deleteError) return void toast.error(deleteError.message)

      router.refresh()
    })
  }

  return (
    <>
      <h2 className='text-2xl font-bold'>Saved Apartments</h2>

      <div className='space-y-2'>
        {apartments.length === 0 && (
          <div className='text-muted-foreground'>
            No saved apartments found.
          </div>
        )}
        {apartments.map((apt) => (
          <div
            key={apt.id}
            className={cn(
              buttonVariants({ variant: 'secondary' }),
              'h-14 w-full',
              'justify-between',
            )}
          >
            <div className='flex flex-col'>
              <span>
                {apt.building_address}
                {apt.apartment_no ? `, Apt ${apt.apartment_no}` : ''}
              </span>
              <span className='text-muted-foreground text-sm'>
                {apt.start_date ? `Lease: ${apt.start_date}` : ''}
                {apt.offered_rent ? ` • $${apt.offered_rent}` : ''}
              </span>
            </div>

            <Button
              variant='destructive'
              size='icon'
              className='size-8 rounded-full'
              onClick={handleDeleteApartment.bind(null, apt.id)}
              disabled={isPending}
            >
              <TrashIcon />
            </Button>
          </div>
        ))}
      </div>
    </>
  )
}

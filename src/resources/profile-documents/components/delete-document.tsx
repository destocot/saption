'use client'

import type { ProfileDocument } from '@/lib/supabase/types'
import { TrashIcon } from 'lucide-react'
import { useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button, buttonVariants } from '@/components/ui/button'

interface DeleteDocumentButtonProps {
  profileDocument: ProfileDocument
}

export const DeleteDocument = ({
  profileDocument,
}: DeleteDocumentButtonProps) => {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleClick = async () => {
    const supabase = createClient()

    startTransition(async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error) throw new Error('Unauthorized')

      const { data: files, error: removeError } = await supabase.storage
        .from('documents')
        .remove([profileDocument.path])

      if (removeError) return void toast.error(removeError.message)

      if (files.length === 0)
        return void toast.error('Oops, Something went wrong.')

      const { error: deleteError } = await supabase
        .from('profile_documents')
        .delete()
        .eq('id', profileDocument.id)
        .eq('profile_id', data.user.id)

      if (deleteError) return void toast.error(deleteError.message)

      router.refresh()
    })
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger className='inline-flex items-center gap-x-2'>
        <TrashIcon /> Delete
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Document?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete {profileDocument.filename}? This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={handleClick}
            className={buttonVariants({ variant: 'destructive' })}
          >
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

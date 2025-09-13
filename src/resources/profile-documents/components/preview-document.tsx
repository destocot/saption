'use client'

import { useEffect, useState } from 'react'
import { EyeIcon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ProfileDocument } from '@/lib/supabase/types'
import { formatDate } from '@/lib/utils'

interface PreviewDocumentProps {
  profileDocument: ProfileDocument
}

export const PreviewDocument = ({ profileDocument }: PreviewDocumentProps) => {
  const [open, setOpen] = useState(false)
  const [signedUrl, setSignedUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return

    const supabase = createClient()

    ;(async function run() {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(profileDocument.path)

      if (error) return void toast.error(error.message)

      const url = URL.createObjectURL(data)
      setSignedUrl(url)

      return () => {
        URL.revokeObjectURL(url)
        setSignedUrl(null)
      }
    })()
  }, [open, profileDocument.path])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant='ghost' size='icon' className='size-8'>
          <EyeIcon size={16} />
          <span className='sr-only'>Preview Document</span>
        </Button>
      </DialogTrigger>

      <DialogContent className='sm:max-w-3xl'>
        <DialogHeader>
          <DialogTitle>
            Preview Document - {profileDocument.filename}
          </DialogTitle>
          <DialogDescription>
            Created at: {formatDate(profileDocument.created_at)}
          </DialogDescription>
        </DialogHeader>

        {signedUrl && (
          <iframe
            src={signedUrl}
            style={{ width: '100%', height: '80vh', border: 'none' }}
            title={profileDocument.filename}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

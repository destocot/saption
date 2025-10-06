'use client'

import { createClient } from '@/lib/supabase/client'
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import * as v from 'valibot'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { LoaderIcon } from 'lucide-react'

const DOC_TYPES = [
  'BANK STATEMENT 1',
  'BANK STATEMENT 2',
  'BANK STATEMENT 3',
  'PAY STUB 1',
  'PAY STUB 2',
  'PAY STUB 3',
  'PHOTO ID',
  'LANDLORD REFERENCE',
  'PROOF OF PAYMENT',
  '1040',
  'W-2',
] as const

const UploadFileSchema = v.object({
  type: v.pipe(
    v.picklist(DOC_TYPES),
    v.transform((val) => val.replace(' ', '_')),
  ),
  year: v.pipe(
    v.number(),
    v.integer(),
    v.minValue(2000),
    v.maxValue(new Date().getFullYear()),
  ),
})

export const UploadDocument = () => {
  const [file, setFile] = useState<File | null>(null)
  const [isPending, startTransition] = useTransition()
  const [year, setYear] = useState(new Date().getFullYear())
  const [type, setType] = useState<(typeof DOC_TYPES)[number] | null>(null)
  const ref = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const handleClick = async () => {
    if (!file) return void toast.error('Please upload a file.')

    const parsed = v.safeParse(UploadFileSchema, { type, year })

    if (!parsed.success) {
      const message = parsed.issues[0]?.message ?? 'Oops! Something went wrong.'
      return void toast.error(message)
    }

    const { output } = parsed

    const supabase = createClient()

    startTransition(async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error) throw new Error('Unauthorized')

      const filename = `${output.type}_${output.year}`
      const ext = file.name.split('.').pop()

      const path = `${data.user.id}/${filename}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(path, file)

      if (uploadError) return void toast.error(uploadError.message)

      const { error: insertError } = await supabase
        .from('profile_documents')
        .insert({
          profile_id: data.user.id,
          filename,
          path,
        })

      if (insertError) return void toast.error(insertError.message)

      if (ref.current) ref.current.value = ''
      setFile(null)
      router.refresh()
    })
  }

  return (
    <div className='space-y-4'>
      <h2 className='text-2xl font-bold'>Upload Document</h2>

      <div className='space-y-2'>
        <div className='flex items-center gap-x-2'>
          <Select
            onValueChange={(val) => setType(val as (typeof DOC_TYPES)[number])}
          >
            <SelectTrigger className='bg-card flex-1'>
              <SelectValue placeholder='Select document type' />
            </SelectTrigger>
            <SelectContent>
              {DOC_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            className='bg-card w-20'
            type='number'
            step='1'
            value={year}
            onChange={(evt) => setYear(Number(evt.target.value))}
          />
        </div>

        <div className='flex items-center gap-x-2'>
          <Input
            ref={ref}
            type='file'
            className='file-input bg-card h-9 flex-1 border-dashed'
            onChange={(evt) => {
              const file = evt.target.files?.[0]
              if (file) setFile(file)
            }}
          />
          <Button onClick={handleClick} disabled={isPending || !file || !type}>
            {isPending && <LoaderIcon className='animate-spin' />}
            Upload
          </Button>
        </div>
      </div>
    </div>
  )
}

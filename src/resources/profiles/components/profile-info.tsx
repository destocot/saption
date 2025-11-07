'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
} from '@/components/ui/table'
import { Profile } from '@/lib/supabase/types'
import { useState, useTransition } from 'react'
import type { User } from '@supabase/supabase-js'
import { PencilIcon } from 'lucide-react'
import * as v from 'valibot'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { updatePasswordAction } from '@users/actions/update-password.action'

const EditProfileSchema = v.object({
  firstName: v.pipe(v.string(), v.nonEmpty('Please enter your first name.')),
  lastName: v.pipe(v.string(), v.nonEmpty('Please enter your last name.')),
  phone: v.union([
    v.pipe(
      v.string(),
      v.nonEmpty('Please enter your phone number.'),
      v.regex(/^\+?[1-9]\d{1,14}$/, 'The phone number is badly formatted.'),
    ),
    v.literal(''),
  ]),
  linkedIn: v.string(),
})

interface ProfileInfoProps {
  profile: Profile & Pick<User, 'email' | 'phone'>
}

export const ProfileInfo = ({ profile }: ProfileInfoProps) => {
  const [editing, setEditing] = useState(false)
  const edit = () => setEditing(true)
  const done = () => setEditing(false)

  if (editing) {
    return <ProfileInfoEditForm profile={profile} onDone={done} />
  }

  return (
    <div className='space-y-4'>
      <Table>
        <TableBody>
          <TableRow>
            <TableHead scope='row' className='w-32'>
              Email
            </TableHead>
            <TableCell>{profile.email}</TableCell>
          </TableRow>
          <TableRow>
            <TableHead scope='row' className='w-32'>
              Phone
            </TableHead>
            <TableCell>{profile.phone || ''}</TableCell>
          </TableRow>
          <TableRow>
            <TableHead scope='row' className='w-32'>
              First Name
            </TableHead>
            <TableCell>{profile.first_name}</TableCell>
          </TableRow>
          <TableRow>
            <TableHead scope='row' className='w-32'>
              Last Name
            </TableHead>
            <TableCell>{profile.last_name}</TableCell>
          </TableRow>
          <TableRow>
            <TableHead scope='row' className='w-32'>
              LinkedIn
            </TableHead>
            <TableCell>{profile.linked_in || ''}</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      <Button onClick={edit}>Edit</Button>
    </div>
  )
}

interface ProfileInfoEditFormProps extends ProfileInfoProps {
  onDone: () => void
}

const ProfileInfoEditForm = ({ profile, onDone }: ProfileInfoEditFormProps) => {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleSubmit = async (evt: React.FormEvent<HTMLFormElement>) => {
    evt.preventDefault()

    const formData = new FormData(evt.target as HTMLFormElement)
    const parsed = v.safeParse(
      EditProfileSchema,
      Object.fromEntries(formData.entries()),
    )

    if (!parsed.success) {
      const message = parsed.issues[0]?.message ?? 'Oops! Something went wrong.'
      return void toast.error(message)
    }

    const { output } = parsed
    const { phone, ...rest } = output

    const supabase = createClient()

    startTransition(async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error) throw new Error('Unauthorized')

      // HANDLE PHONE NUMBER UPDATE
      let phoneChanged = false
      if (phone !== data.user.phone && phone !== '') {
        const { error: updateError } = await updatePasswordAction(phone)
        if (updateError) return void toast.error(updateError.message)
        phoneChanged = true
      }

      // HANDLE PROFILE UPDATE
      const { firstName, lastName, linkedIn } = rest

      let profileChanged = false
      if (
        firstName === profile.first_name &&
        lastName === profile.last_name &&
        linkedIn === profile.linked_in
      ) {
        if (!phoneChanged) {
          toast.success('Profile updated successfully.')
          return void onDone()
        }
      } else {
        profileChanged = true
      }

      if (profileChanged) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            first_name: firstName,
            last_name: lastName,
            linked_in: linkedIn,
          })
          .eq('id', profile.id)
          .select()
          .single()

        if (updateError) return void toast.error(updateError.message)
      }

      toast.success('Profile updated successfully.')
      if (phoneChanged) await supabase.auth.getUser()
      router.refresh()
      onDone()
    })
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <Table>
        <TableBody>
          <TableRow>
            <TableHead scope='row' className='w-32'>
              Email
            </TableHead>
            <TableCell>{profile.email}</TableCell>
          </TableRow>
          <TableRow>
            <TableHead scope='row' className='w-32'>
              Phone
            </TableHead>
            <TableCell>
              <div className='flex items-center gap-x-4'>
                <label htmlFor='phone' className='sr-only'>
                  Phone
                </label>
                <Input
                  id='phone'
                  name='phone'
                  defaultValue={profile.phone || ''}
                  className='h-full rounded-none border-0 border-b p-0 shadow-none focus-visible:ring-0'
                />
                <PencilIcon size={16} />
              </div>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableHead scope='row' className='w-32'>
              First Name
            </TableHead>
            <TableCell className='h-9'>
              <div className='flex items-center gap-x-4'>
                <label htmlFor='firstName' className='sr-only'>
                  First Name
                </label>
                <Input
                  id='firstName'
                  name='firstName'
                  defaultValue={profile.first_name}
                  className='h-full rounded-none border-0 border-b p-0 shadow-none focus-visible:ring-0'
                />
                <PencilIcon size={16} />
              </div>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableHead scope='row' className='w-32'>
              Last Name
            </TableHead>
            <TableCell>
              <div className='flex items-center gap-x-4'>
                <label htmlFor='lastName' className='sr-only'>
                  Last Name
                </label>
                <Input
                  id='lastName'
                  name='lastName'
                  defaultValue={profile.last_name}
                  className='h-full rounded-none border-0 border-b p-0 shadow-none focus-visible:ring-0'
                />

                <PencilIcon size={16} />
              </div>
            </TableCell>
          </TableRow>
          <TableRow>
            <TableHead scope='row' className='w-32'>
              LinkedIn
            </TableHead>
            <TableCell>
              <div className='flex items-center gap-x-4'>
                <label htmlFor='linkedIn' className='sr-only'>
                  LinkedIn
                </label>
                <Input
                  id='linkedIn'
                  name='linkedIn'
                  defaultValue={profile.linked_in || ''}
                  className='h-full rounded-none border-0 border-b p-0 shadow-none focus-visible:ring-0'
                />
                <PencilIcon size={16} />
              </div>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
      <div className='flex items-center gap-x-4'>
        <Button
          type='button'
          variant='secondary'
          onClick={onDone}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type='submit' disabled={isPending}>
          Save
        </Button>
      </div>
    </form>
  )
}

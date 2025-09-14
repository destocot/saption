import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { NewApplicationForm } from '@applications/new-application-form'
import { ArrowLeftIcon } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function NewApplicationPage() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single()
    .throwOnError()

  const { data: profile_documents } = await supabase
    .from('profile_documents')
    .select('*')
    .eq('profile_id', profile.id)
    .throwOnError()

  const { data: profile_apartments } = await supabase
    .from('profile_apartments')
    .select('*')
    .eq('profile_id', profile.id)
    .throwOnError()

  const profileWithEmailAndPhone = {
    ...profile,
    email: data.user.email,
    phone: data.user.phone,
  }

  return (
    <>
      <Header />

      <main className='min-h-[calc(100dvh-8rem)]'>
        {' '}
        <div className='container mx-auto flex h-16 items-center px-4 pt-16 pb-8'>
          <Button size='sm' variant='ghost' asChild>
            <Link href='/'>
              <ArrowLeftIcon />
              <span className='sr-only'>Back</span>
            </Link>
          </Button>
        </div>
        <div className='container mx-auto space-y-6 px-4 pt-8 pb-16'>
          <h2 className='text-2xl font-bold'>New Application</h2>

          <NewApplicationForm
            profile={profileWithEmailAndPhone}
            documents={profile_documents}
            apartments={profile_apartments}
          />
        </div>
      </main>

      <Footer />
    </>
  )
}

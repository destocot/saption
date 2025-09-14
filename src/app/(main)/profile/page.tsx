import { Footer } from '@/components/footer'
import { Header } from '@/components/header'
import { createClient } from '@/lib/supabase/server'
import { ApartmentsList } from '@/resources/applications/apartments-list'
import { ProfileInfo } from '@/resources/profile/components/profile-info'
import { redirect } from 'next/navigation'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single()
    .throwOnError()

  const profileWithEmailAndPhone = {
    ...profile,
    email: data.user.email,
    phone: data.user.phone,
  }

  const { data: apartments } = await supabase
    .from('profile_apartments')
    .select('*')
    .eq('profile_id', data.user.id)
    .order('updated_at', { ascending: false })
    .throwOnError()

  return (
    <>
      <Header />

      <main className='min-h-[calc(100dvh-8rem)]'>
        <div className='container mx-auto space-y-6 px-4 py-16'>
          <h2 className='text-2xl font-bold'>Profile</h2>

          <ProfileInfo profile={profileWithEmailAndPhone} />

          <ApartmentsList apartments={apartments} />
        </div>
      </main>

      <Footer />
    </>
  )
}

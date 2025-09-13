import { redirect } from 'next/navigation'
import { Footer } from '@/components/footer'
import { LogoutButton } from '@/components/logout-button'
import { createClient } from '@/lib/supabase/server'
import { UploadDocument } from '@profileDocuments/components/upload-document'
import { DocumentsTable } from '@profileDocuments/components/documents-table'

export default async function Page() {
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

  return (
    <>
      <header className='h-16 border-b shadow-md'>
        <div className='container mx-auto flex h-full items-center justify-between gap-x-4 px-4'>
          <h2 className='text-2xl font-bold'>Saption</h2>
          <LogoutButton />
        </div>
      </header>

      <main className='min-h-[calc(100dvh-8rem)]'>
        <div className='container mx-auto space-y-6 px-4 py-16'>
          <UploadDocument />
          <DocumentsTable profileDocuments={profile_documents} />
        </div>
      </main>

      <Footer />
    </>
  )
}

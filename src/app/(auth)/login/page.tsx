'use client'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { LoaderIcon } from 'lucide-react'
import Link from 'next/link'
import { useTransition } from 'react'
import { toast } from 'sonner'
import * as v from 'valibot'

const LoginSchema = v.object({
  email: v.pipe(
    v.string(),
    v.nonEmpty('Please enter your email address.'),
    v.email('The email address is badly formatted.'),
  ),
  password: v.pipe(v.string(), v.nonEmpty('Please enter your password.')),
})

export default function LoginPage() {
  const [isPending, startTransition] = useTransition()

  const handleSubmit = async (evt: React.FormEvent<HTMLFormElement>) => {
    evt.preventDefault()

    const formData = new FormData(evt.target as HTMLFormElement)
    const parsed = v.safeParse(
      LoginSchema,
      Object.fromEntries(formData.entries()),
    )

    if (!parsed.success) {
      const message = parsed.issues[0]?.message ?? 'Oops! Something went wrong.'
      return void toast.error(message)
    }

    const { output } = parsed

    const supabase = createClient()

    startTransition(async () => {
      const { error } = await supabase.auth.signInWithPassword({
        email: output.email,
        password: output.password,
      })

      if (error) return void toast.error(error.message)

      window.location.href = '/'
    })
  }

  return (
    <>
      <main className='flex h-[calc(100dvh-4rem)] items-center justify-center'>
        <Card className='w-full max-w-sm'>
          <CardHeader>
            <CardTitle>Login</CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div className='space-y-1'>
                <Label htmlFor='email'>Email</Label>
                <Input id='email' name='email' type='email' />
              </div>

              <div className='space-y-1'>
                <Label htmlFor='password'>Password</Label>
                <Input id='password' name='password' type='password' />
              </div>

              <Button disabled={isPending} className='w-full'>
                {isPending && <LoaderIcon className='animate-spin' />}
                Login
              </Button>
            </form>
          </CardContent>

          <CardFooter>
            <p className='text-muted-foreground text-sm'>
              Don&apos;t have an account? Click{' '}
              <Link
                href='/signup'
                className='text-primary underline-offset-4 hover:underline'
              >
                here
              </Link>{' '}
              to signup.
            </p>
          </CardFooter>
        </Card>
      </main>

      <Footer />
    </>
  )
}

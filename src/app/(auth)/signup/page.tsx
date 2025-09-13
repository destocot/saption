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

const SignupSchema = v.pipe(
  v.object({
    firstName: v.pipe(v.string(), v.nonEmpty('Please enter your first name.')),
    lastName: v.pipe(v.string(), v.nonEmpty('Please enter your last name.')),
    email: v.pipe(
      v.string(),
      v.nonEmpty('Please enter your email address.'),
      v.email('The email address is badly formatted.'),
    ),
    password: v.pipe(
      v.string(),
      v.nonEmpty('Please enter your password.'),
      v.minLength(6),
    ),
    confirmPassword: v.pipe(
      v.string(),
      v.nonEmpty('Please confirm your password.'),
    ),
  }),
  v.forward(
    v.partialCheck(
      [['password'], ['confirmPassword']],
      (input) => input.password === input.confirmPassword,
      'The two passwords do not match.',
    ),
    ['confirmPassword'],
  ),
)

export default function SignupPage() {
  const [isPending, startTransition] = useTransition()

  const handleSubmit = async (evt: React.FormEvent<HTMLFormElement>) => {
    evt.preventDefault()

    const formData = new FormData(evt.target as HTMLFormElement)
    const parsed = v.safeParse(
      SignupSchema,
      Object.fromEntries(formData.entries()),
    )

    if (!parsed.success) {
      const message = parsed.issues[0]?.message ?? 'Oops! Something went wrong.'
      return void toast.error(message)
    }

    const { output } = parsed

    const supabase = createClient()

    startTransition(async () => {
      const { error } = await supabase.auth.signUp({
        email: output.email,
        password: output.password,
        options: {
          data: {
            first_name: output.firstName,
            last_name: output.lastName,
          },
        },
      })

      if (error) throw new Error(error.message)

      window.location.href = '/'
    })
  }

  return (
    <>
      <main className='flex h-[calc(100dvh-4rem)] items-center justify-center'>
        <Card className='w-full max-w-sm'>
          <CardHeader>
            <CardTitle>Sign Up</CardTitle>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className='space-y-4'>
              <div className='space-y-1'>
                <Label htmlFor='firstName'>First Name</Label>
                <Input id='firstName' name='firstName' type='text' />
              </div>

              <div className='space-y-1'>
                <Label htmlFor='lastName'>Last Name</Label>
                <Input id='lastName' name='lastName' type='text' />
              </div>

              <div className='space-y-1'>
                <Label htmlFor='email'>Email</Label>
                <Input
                  id='email'
                  name='email'
                  type='email'
                  className='bg-background'
                />
              </div>

              <div className='space-y-1'>
                <Label htmlFor='password'>Password</Label>
                <Input
                  id='password'
                  name='password'
                  type='password'
                  className='bg-background'
                />
              </div>

              <div className='space-y-1'>
                <Label htmlFor='confirmPassword'>Confirm Password</Label>
                <Input
                  id='confirmPassword'
                  name='confirmPassword'
                  type='password'
                  className='bg-background'
                />
              </div>

              <Button disabled={isPending} className='w-full'>
                {isPending && <LoaderIcon className='animate-spin' />}
                Sign Up
              </Button>
            </form>
          </CardContent>

          <CardFooter>
            <p className='text-muted-foreground text-sm'>
              Already have an account? Click{' '}
              <Link
                href='/login'
                className='text-primary underline-offset-4 hover:underline'
              >
                here
              </Link>{' '}
              to login.
            </p>
          </CardFooter>
        </Card>
      </main>

      <Footer />
    </>
  )
}

import { LogoutButton } from '@/components/logout-button'
import { Button } from './ui/button'
import Link from 'next/link'
import { UserIcon } from 'lucide-react'

export const Header = () => {
  return (
    <header className='h-16 border-b shadow-md'>
      <div className='container mx-auto flex h-full items-center justify-between gap-x-4 px-4'>
        <Link href='/' className='text-2xl font-bold'>
          Saption
        </Link>

        <div className='flex items-center gap-x-4'>
          <Button size='sm' asChild>
            <Link href='/profile'>
              <UserIcon />
              Profile
            </Link>
          </Button>
          <LogoutButton />
        </div>
      </div>
    </header>
  )
}

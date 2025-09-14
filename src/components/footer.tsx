export const Footer = () => {
  return (
    <footer className='bg-card h-16 border-t shadow-md'>
      <div className='container mx-auto flex h-full items-center justify-between gap-4 px-4'>
        <div className='items center flex gap-x-2'>
          <img src='/logo.png' alt='logo' className='size-4' />
          <p className='text-muted-foreground text-sm leading-none font-bold'>
            Saption
          </p>
        </div>
        <p className='text-muted-foreground text-sm'>
          &copy; Khurram Ali. All rights reserved.
        </p>
      </div>
    </footer>
  )
}

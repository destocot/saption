'use client'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import type {
  Profile,
  ProfileApartment,
  ProfileDocument,
} from '@/lib/supabase/types'
import type { User } from '@supabase/supabase-js'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  DollarSignIcon,
  DownloadIcon,
  SearchIcon,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { PDFDocument } from 'pdf-lib'
import React, { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { PreviewDocument } from '@profileDocuments/components/preview-document'
import { Checkbox } from '@/components/ui/checkbox'
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate } from '@/lib/utils'
import { useDebouncedCallback } from 'use-debounce'

interface NewApplicationFormProps {
  profile: Profile & Pick<User, 'email' | 'phone'>
  documents: Array<ProfileDocument>
  apartments: Array<ProfileApartment>
}

const initialMetadata = {
  buildingAddress: '',
  apartmentNo: '',
  startDate: '',
  offeredRent: '',
}

const columns: Array<ColumnDef<ProfileDocument>> = [
  {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label='Select all'
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label='Select row'
      />
    ),
  },
  {
    accessorKey: 'filename',
    header: 'Filename',
  },
  {
    accessorKey: 'updated_at',
    header: 'Updated At',
    cell: ({ row }) => formatDate(row.getValue('updated_at')),
  },
  {
    id: 'preview',
    header: () => <p className='text-center'>Preview</p>,
    cell: ({ row }) => (
      <div className='text-center'>
        <PreviewDocument profileDocument={row.original} />
      </div>
    ),
  },
]

type SearchResult = {
  place_id: string
  address: Record<string, string>
}

export const NewApplicationForm = ({
  profile,
  documents,
  apartments,
}: NewApplicationFormProps) => {
  const [isPending, startTransition] = useTransition()
  const [metadata, setMetadata] = useState(initialMetadata)
  const router = useRouter()
  const MAX_PAGE = 2
  const [page, setPage] = useState(1)
  const [rowSelection, setRowSelection] = useState({})
  const [results, setResults] = useState<Array<SearchResult>>([])

  const next = () => setPage((x) => Math.min(MAX_PAGE, x + 1))
  const prev = () => setPage((x) => Math.max(1, x - 1))

  const handleDownload = async () => {
    if (!selected.length) return

    const supabase = createClient()

    startTransition(async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error) throw new Error('Unauthorized')

      const merged = await PDFDocument.create()

      // === Create Cover Page ===
      const cover = await PDFDocument.create()
      const page = cover.addPage([595.28, 841.89]) // A4 size in points

      const { width, height } = page.getSize()
      const titleFontSize = 24
      const subtitleFontSize = 16

      // Title
      const title = 'Apartment Application'
      const titleWidth = titleFontSize * (title.length / 2) // Approximation
      page.drawText(title, {
        x: (width - titleWidth) / 2,
        y: height - 4 * titleFontSize,
        size: titleFontSize,
      })

      // Subtitle: Building Address + Apartment No.
      const subtitle = `${metadata.buildingAddress}${metadata.apartmentNo ? ', Apt ' + metadata.apartmentNo : ''}`
      const subtitleWidth = subtitleFontSize * (subtitle.length / 2)
      page.drawText(subtitle, {
        x: (width - subtitleWidth) / 2,
        y: height - 5.5 * titleFontSize,
        size: subtitleFontSize,
      })

      page.drawText(`Email: ${data.user.email}`, {
        x: 50,
        y: height - 7 * titleFontSize,
        size: 12,
      })

      if (data.user.phone) {
        page.drawText(`Phone: ${data.user.phone}`, {
          x: 50,
          y: height - 8 * titleFontSize,
          size: 12,
        })
      }

      page.drawText(`Name: ${profile.first_name} ${profile.last_name}`, {
        x: 50,
        y: height - 9 * titleFontSize,
        size: 12,
      })

      const [year, month, day] = metadata.startDate.split('-').map(Number)
      const startDate = new Date(year, month - 1, day).toLocaleDateString(
        undefined,
        {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        },
      )
      page.drawText(`Start Date: ${startDate}`, {
        x: 50,
        y: height - 11 * titleFontSize,
        size: 12,
      })
      page.drawText(`Offered Rent: $${metadata.offeredRent}`, {
        x: 50,
        y: height - 12 * titleFontSize,
        size: 12,
      })

      const [coverPage] = await merged.copyPages(cover, cover.getPageIndices())
      merged.addPage(coverPage)

      // === Append Selected Documents ===

      for (const doc of selected) {
        const { data, error } = await supabase.storage
          .from('documents')
          .download(doc.path)

        if (error) return void toast.error(error.message)

        const buffer = await data.arrayBuffer()
        const pdf = await PDFDocument.load(buffer, { ignoreEncryption: true })
        const copied = await merged.copyPages(pdf, pdf.getPageIndices())
        copied.forEach((page) => merged.addPage(page))
      }

      const bytes = await merged.save()
      const blob = new Blob([new Uint8Array(bytes)], {
        type: 'application/pdf',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url

      const now = new Date()
      const pad = (n: number) => n.toString().padStart(2, '0')

      const filename = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(
        now.getHours(),
      )}${pad(now.getMinutes())}${pad(now.getSeconds())}.pdf`

      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      toast.success('Your apartment application PDF is ready! 🎉')

      const aptToSave: Pick<
        ProfileApartment,
        'building_address' | 'apartment_no' | 'start_date' | 'offered_rent'
      > = {
        building_address: metadata.buildingAddress
          .trim()
          .replace(/,\s+/g, ', '),
        apartment_no: metadata.apartmentNo.trim(),
        start_date: metadata.startDate.trim(),
        offered_rent: Number(metadata.offeredRent.trim()),
      }

      if (aptToSave.building_address) {
        const { data: existingApt, error: fetchError } = await supabase
          .from('profile_apartments')
          .select('*')
          .eq('profile_id', profile.id)
          .ilike('building_address', aptToSave.building_address)
          .ilike('apartment_no', aptToSave.apartment_no)
          .maybeSingle()

        if (fetchError) throw fetchError

        if (!existingApt) {
          await supabase
            .from('profile_apartments')
            .insert({ ...aptToSave, profile_id: profile.id })
        } else {
          await supabase
            .from('profile_apartments')
            .update({ ...aptToSave })
            .eq('id', existingApt.id)
        }
      }

      router.refresh()
    })
  }

  const handleChangeMetadata = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = evt.target
    setMetadata((m) => ({ ...m, [name]: value.trim() }))
  }

  const handleLoadApartmentMetadata = (apartmentId: string) => {
    const apt = apartments.find((a) => a.id === apartmentId)
    if (!apt) return
    setMetadata({
      buildingAddress: apt.building_address,
      apartmentNo: apt.apartment_no,
      startDate: apt.start_date,
      offeredRent: String(apt.offered_rent),
    })
  }

  const handleReset = () => {
    setMetadata(initialMetadata)
  }

  const table = useReactTable({
    data: documents,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
  })

  const selected = table
    .getSelectedRowModel()
    .flatRows.map((row) => row.original)

  const search = useDebouncedCallback(async (value: string) => {
    if (value.length < 3) return

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&countrycodes=us&addressdetails=1&limit=3&q=${encodeURIComponent(value)}`,
    )
    const data = await res.json()
    setResults(data)
  }, 600)

  const formatAddress = (r: SearchResult) => {
    const addr = r.address
    return [
      addr.house_number,
      addr.road,
      addr.city || addr.town || addr.village,
      addr.state,
      addr.postcode,
    ]
      .filter(Boolean)
      .join(', ')
  }

  return (
    <>
      {page === 1 && (
        <div className='space-y-4'>
          <h3 className='text-xl font-bold'>Select Documents</h3>

          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((hg) => (
                <TableRow key={hg.id}>
                  {hg.headers.map((h) => (
                    <TableHead key={h.id}>
                      {flexRender(h.column.columnDef.header, h.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>

            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((r) => (
                  <TableRow
                    key={r.id}
                    data-state={r.getIsSelected() && 'selected'}
                  >
                    {r.getVisibleCells().map((c) => (
                      <TableCell key={c.id}>
                        {flexRender(c.column.columnDef.cell, c.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className='h-24 text-center'
                  >
                    No results.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className='flex items-center justify-end gap-x-4'>
            <Button onClick={next} disabled={!selected.length} variant='ghost'>
              Next <ArrowRightIcon />
            </Button>
          </div>
        </div>
      )}

      {page === 2 && (
        <div className='space-y-4'>
          <div className='flex items-center gap-x-2'>
            <h3 className='text-xl font-bold'>Apartment Metadata</h3>
            <SearchSavedApartments
              apartments={apartments}
              handleLoadApartmentMetadata={handleLoadApartmentMetadata}
            />
          </div>

          <div className='space-y-1'>
            <Label htmlFor='buildingAddress'>Building Address</Label>
            <Input
              id='buildingAddress'
              name='buildingAddress'
              className='bg-card'
              value={metadata.buildingAddress}
              onChange={(evt) => {
                const value = evt.target.value
                setMetadata((m) => ({ ...m, buildingAddress: value }))
                search(value)
              }}
              required
            />
            {results.length > 0 && (
              <ul className='"bg-popover text-popover-foreground relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border p-1 shadow-md'>
                {results.map((r) => (
                  <li
                    className='focus:bg-accent focus:text-accent-foreground hover:bg-accent hover:text-accent-foreground relative flex w-full cursor-pointer items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none'
                    key={r.place_id}
                    onClick={() => {
                      setMetadata((m) => ({
                        ...m,
                        buildingAddress: formatAddress(r),
                      }))
                      setResults([])
                    }}
                  >
                    {formatAddress(r)}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className='space-y-1'>
            <Label htmlFor='apartmentNo'>Apartment No.</Label>
            <Input
              id='apartmentNo'
              name='apartmentNo'
              className='bg-card'
              value={metadata.apartmentNo}
              onChange={handleChangeMetadata}
              required
            />
          </div>

          <div className='space-y-1'>
            <Label htmlFor='startDate'>Lease Start Date</Label>
            <Input
              id='startDate'
              name='startDate'
              className='bg-card'
              type='date'
              value={metadata.startDate}
              onChange={handleChangeMetadata}
            />
          </div>

          <div className='space-y-1'>
            <Label htmlFor='offeredRent'>Offered Rent</Label>
            <div className='relative'>
              <DollarSignIcon
                className='stroke-muted-foreground absolute top-1/2 left-2 -translate-y-1/2'
                size={16}
              />
              <Input
                id='offeredRent'
                name='offeredRent'
                className='bg-card pl-6'
                type='number'
                value={metadata.offeredRent}
                onChange={handleChangeMetadata}
              />
            </div>
          </div>

          <div className='flex items-center justify-between gap-x-4'>
            <Button onClick={prev} disabled={isPending} variant='ghost'>
              <ArrowLeftIcon />
              Prev
            </Button>

            <div className='flex items-center gap-x-4'>
              <Button onClick={handleDownload} disabled={isPending}>
                Download <DownloadIcon />
              </Button>

              <Button onClick={handleReset} variant='secondary'>
                Reset
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

interface SearchSavedApartmentsProps {
  apartments: Array<ProfileApartment>
  handleLoadApartmentMetadata: (apartmentId: string) => void
}

const SearchSavedApartments = ({
  apartments,
  handleLoadApartmentMetadata,
}: SearchSavedApartmentsProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size='icon' variant='outline' className='size-8 rounded-full'>
          <SearchIcon />
          <span className='sr-only'>Search</span>
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select Saved Apartment</DialogTitle>
          <DialogDescription>
            Choose an apartment to autofill its metadata.
          </DialogDescription>
        </DialogHeader>
        <div className='space-y-2'>
          {apartments.length === 0 && (
            <div className='text-muted-foreground'>
              No saved apartments found.
            </div>
          )}
          {apartments.map((apt) => (
            <Button
              key={apt.id}
              variant='secondary'
              className='h-14 w-full flex-col items-start'
              onClick={() => handleLoadApartmentMetadata(apt.id)}
            >
              <span>
                {apt.building_address}
                {apt.apartment_no ? `, Apt ${apt.apartment_no}` : ''}
              </span>
              <span className='text-muted-foreground text-sm'>
                {apt.start_date ? `Lease: ${apt.start_date}` : ''}
                {apt.offered_rent ? ` • $${apt.offered_rent}` : ''}
              </span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

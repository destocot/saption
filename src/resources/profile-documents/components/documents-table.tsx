'use client'

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import type { ProfileDocument } from '@/lib/supabase/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDate } from '@/lib/utils'
import { PreviewDocument } from '@profileDocuments/components/preview-document'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  LoaderIcon,
  MoreHorizontalIcon,
} from 'lucide-react'
import { DeleteDocument } from '@profileDocuments/components/delete-document'
import { Checkbox } from '@/components/ui/checkbox'
import { useState, useTransition } from 'react'
import { PDFDocument } from 'pdf-lib'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'

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
  {
    id: 'actions',
    cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant='ghost' size='icon' className='size-8'>
            <MoreHorizontalIcon />
            <span className='sr-only'>Menu</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align='end'>
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onSelect={(evt) => evt.preventDefault()}>
            <DeleteDocument profileDocument={row.original} />
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
  },
]

interface DocumentsTableProps {
  profileDocuments: Array<ProfileDocument>
}

export const DocumentsTable = ({ profileDocuments }: DocumentsTableProps) => {
  const [isPending, startTransition] = useTransition()
  const [rowSelection, setRowSelection] = useState({})
  const MAX_PAGE = 2
  const [page, setPage] = useState(1)
  const [metadata, setMetadata] = useState({
    buildingAddress: '',
    apartmentNo: '',
    startDate: '',
    offeredRent: '',
  })

  const next = () => setPage((x) => Math.min(MAX_PAGE, x + 1))
  const prev = () => setPage((x) => Math.max(1, x - 1))

  const table = useReactTable({
    data: profileDocuments,
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

  const handleDownload = async () => {
    if (!selected.length) return

    const supabase = createClient()

    startTransition(async () => {
      const { data, error } = await supabase.auth.getUser()
      if (error) throw new Error('Unauthorized')

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', data.user.id)
        .single()
        .throwOnError()

      const merged = await PDFDocument.create()

      // === Create Cover Page ===
      const cover = await PDFDocument.create()
      const page = cover.addPage([595.28, 841.89]) // A4 size in points

      const { width, height } = page.getSize()
      const titleFontSize = 24
      const subtitleFontSize = 16

      // Title
      const title = 'Apartment Application For'
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

      const formattedStartDate = formatDate(metadata.startDate).substring(
        0,
        formatDate(metadata.startDate).lastIndexOf(','),
      )
      page.drawText(`Start Date: ${formattedStartDate}`, {
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
        const pdf = await PDFDocument.load(buffer)
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
    })
  }

  return (
    <div className='space-y-6'>
      {page === 1 && (
        <>
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
          <div className='flex justify-end'>
            <Button
              onClick={next}
              disabled={
                !table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()
              }
            >
              Next <ArrowRightIcon />
            </Button>
          </div>
        </>
      )}

      {page === 2 && (
        <>
          <div className='space-y-4'>
            <h3 className='text-xl font-bold'>Selected Documents</h3>

            <ul className='list-inside list-disc'>
              {selected.map((doc) => (
                <li key={doc.id} className='text-sm'>
                  {doc.filename}
                </li>
              ))}
            </ul>

            <h3 className='text-xl font-bold'>Apartment Metadata</h3>
            <Input
              className='bg-card'
              placeholder='Building Address'
              value={metadata.buildingAddress}
              onChange={(e) =>
                setMetadata((m) => ({ ...m, buildingAddress: e.target.value }))
              }
            />
            <Input
              className='bg-card'
              placeholder='Apartment No.'
              value={metadata.apartmentNo}
              onChange={(e) =>
                setMetadata((m) => ({ ...m, apartmentNo: e.target.value }))
              }
            />
            <Input
              className='bg-card'
              placeholder='Start Date'
              type='date'
              value={metadata.startDate}
              onChange={(e) =>
                setMetadata((m) => ({ ...m, startDate: e.target.value }))
              }
            />
            <Input
              className='bg-card'
              placeholder='Offered Rent'
              type='number'
              value={metadata.offeredRent}
              onChange={(e) =>
                setMetadata((m) => ({ ...m, offeredRent: e.target.value }))
              }
            />
          </div>

          <div className='flex items-center justify-end gap-x-4'>
            <Button onClick={prev} disabled={isPending}>
              <ArrowLeftIcon />
              Prev
            </Button>
            <Button
              onClick={handleDownload}
              disabled={
                !table.getIsSomeRowsSelected() && !table.getIsAllRowsSelected()
              }
            >
              {isPending && <LoaderIcon className='animate-spin' />}
              Download
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

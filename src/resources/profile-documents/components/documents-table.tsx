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
import { LoaderIcon, MoreHorizontalIcon } from 'lucide-react'
import { DeleteDocument } from '@profileDocuments/components/delete-document'
import { Checkbox } from '@/components/ui/checkbox'
import { useState, useTransition } from 'react'
import { PDFDocument } from 'pdf-lib'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

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
      const { error } = await supabase.auth.getUser()
      if (error) throw new Error('Unauthorized')

      const merged = await PDFDocument.create()

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
    })
  }

  return (
    <div className='space-y-6'>
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
              <TableRow key={r.id} data-state={r.getIsSelected() && 'selected'}>
                {r.getVisibleCells().map((c) => (
                  <TableCell key={c.id}>
                    {flexRender(c.column.columnDef.cell, c.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className='h-24 text-center'>
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <div className='space-y-4'>
        <h2 className='text-2xl font-bold'>Aggregate Documents</h2>

        <ul className='list-inside list-disc space-y-2'>
          {selected.map((doc) => (
            <li key={doc.id}>{doc.filename}</li>
          ))}
        </ul>

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
    </div>
  )
}

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
import { ArrowRightIcon, MoreHorizontalIcon } from 'lucide-react'
import { DeleteDocument } from '@profileDocuments/components/delete-document'
import { useState } from 'react'
import Link from 'next/link'

const columns: Array<ColumnDef<ProfileDocument>> = [
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

  const hasDocuments = profileDocuments.length > 0

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

      <div className='flex justify-end'>
        {hasDocuments ? (
          <Button asChild>
            <Link href='/applications/new'>
              Create Apartment Application <ArrowRightIcon />
            </Link>
          </Button>
        ) : (
          <Button disabled>
            Create Apartment Application <ArrowRightIcon />
          </Button>
        )}
      </div>
    </div>
  )
}

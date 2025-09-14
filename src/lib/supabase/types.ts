import type { Database } from './database.types'

export type Profile = Database['public']['Tables']['profiles']['Row']

export type ProfileDocument =
  Database['public']['Tables']['profile_documents']['Row']

export type ProfileApartment =
  Database['public']['Tables']['profile_apartments']['Row']

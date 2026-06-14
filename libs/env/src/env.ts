import { Redacted } from 'effect'

const read = (key: string, fallback = ''): string => {
  const value = typeof process === 'undefined' ? undefined : process.env[key]
  return value === undefined || value === '' ? fallback : value
}

const secret = (key: string): Redacted.Redacted<string> => Redacted.make(read(key))

/** Lazy environment reader for the shared provider and infrastructure stack. */
export const env = {
  get NODE_ENV(): string {
    return read('NODE_ENV', 'development')
  },
  get DATABASE_URL(): Redacted.Redacted<string> | undefined {
    const value = read('DATABASE_URL')
    return value === '' ? undefined : Redacted.make(value)
  },
  get NEXT_PUBLIC_SUPABASE_URL(): string {
    return read('NEXT_PUBLIC_SUPABASE_URL')
  },
  get NEXT_PUBLIC_SUPABASE_ANON_KEY(): string {
    return read('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  },
  get SUPABASE_URL(): string {
    return read('SUPABASE_URL', read('NEXT_PUBLIC_SUPABASE_URL'))
  },
  get SUPABASE_ANON_KEY(): Redacted.Redacted<string> {
    const value = read('SUPABASE_ANON_KEY', read('NEXT_PUBLIC_SUPABASE_ANON_KEY'))
    return value === '' ? secret('SUPABASE_ANON_KEY') : Redacted.make(value)
  },
  get SUPABASE_SERVICE_ROLE_KEY(): Redacted.Redacted<string> {
    return secret('SUPABASE_SERVICE_ROLE_KEY')
  }
}

export type Env = typeof env

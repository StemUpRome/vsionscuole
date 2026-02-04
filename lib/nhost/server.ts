'use server'

import { NhostClient } from '@nhost/nextjs'

// Server-side Nhost client (stesso config del client; per session da cookie usare createServerSideClient con context)
export const getNhostServerClient = () => {
  return new NhostClient({
    subdomain: process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN || '',
    region: process.env.NEXT_PUBLIC_NHOST_REGION || 'eu-central-1',
  })
}

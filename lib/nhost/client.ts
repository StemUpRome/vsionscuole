'use client'

import { NhostClient, NhostProvider } from '@nhost/nextjs'

// Initialize Nhost Client
export const nhost = new NhostClient({
  subdomain: process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN || '',
  region: process.env.NEXT_PUBLIC_NHOST_REGION || 'eu-central-1',
})

export { NhostProvider }

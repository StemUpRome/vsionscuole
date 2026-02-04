import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Root "/" = nuova home (landing abbonamenti).
 * "/dashboard" = app interna, accessibile senza login.
 * Nessun redirect: la prima visita deve mostrare la landing.
 */
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/dashboard'],
}

import { NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

/**
 * Restituisce l'elenco di tutte le immagini avatar nella cartella public.
 * Utile per galleria, carousel e fallback: carica tutti i file .png, .jpg, .jpeg, .webp
 * escludendo logo e file di configurazione.
 */
export async function GET() {
  try {
    const publicDir = path.join(process.cwd(), 'public')
    const files = fs.readdirSync(publicDir)
    const imageExtensions = /\.(png|jpg|jpeg|webp)$/i
    const exclude = (f: string) =>
      f === 'verse-logo.png' ||
      f === '_redirects' ||
      f.startsWith('.')
    const images = files
      .filter((f) => imageExtensions.test(f) && !exclude(f))
      .sort((a, b) => {
        // Ordina avatar-N.png in testa, poi il resto alfabetico
        const aNum = a.match(/^avatar-(\d+)\./)?.[1]
        const bNum = b.match(/^avatar-(\d+)\./)?.[1]
        if (aNum && bNum) return Number(aNum) - Number(bNum)
        if (aNum) return -1
        if (bNum) return 1
        return a.localeCompare(b)
      })
      .map((f) => `/${encodeURI(f)}`)
    return NextResponse.json({ images })
  } catch (e) {
    console.error('[avatar-images]', e)
    // Fallback: almeno i classici avatar-1..16
    const fallback = Array.from({ length: 16 }, (_, i) => `/avatar-${i + 1}.png`)
    return NextResponse.json({ images: fallback })
  }
}

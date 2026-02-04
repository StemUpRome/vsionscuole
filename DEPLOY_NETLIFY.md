# Deploy su Netlify – ZenkAI (Next.js)

## Impostazioni build in Netlify

In **Site configuration** → **Build & deploy** → **Build settings** imposta:

| Campo | Valore |
|-------|--------|
| **Build command** | `npm run build` |
| **Publish directory** | *(lascia vuoto)* |

### Perché Publish directory va lasciato vuoto

Il progetto usa il **plugin Next.js** (`@netlify/plugin-nextjs`) nel `netlify.toml`. Il plugin gestisce da solo l’output del build e il routing. Se imposti una Publish directory (es. `.next`, `out`, `dist`) rischi il 404 sulle route lato client (es. `/dashboard`, `/avatars`).

- **`.next`** = cartella di build/cache di Next.js, **non** è la directory da pubblicare.
- **`out`** = va usata solo se in `next.config.js` hai `output: 'export'` (questo progetto non lo usa).
- **`dist`** = non usata da Next.js.

Lascia il campo **vuoto** e lascia che sia il plugin a decidere dove pubblicare.

---

## File `_redirects` (routing lato client)

È stato creato **`public/_redirects`** con:

```
/*    /index.html   200
```

Questo fa sì che le richieste a path non trovati (es. `/dashboard` al primo caricamento) vengano servite dalla root, così il router Next.js può gestire la route lato client. Netlify copia il contenuto di `public/` nel deploy, quindi `_redirects` viene applicato.

---

## Riepilogo

1. **Build command:** `npm run build`
2. **Publish directory:** vuoto (nessun valore).
3. Il file `public/_redirects` è già nel repo.
4. Dopo aver cambiato le impostazioni, fai **Trigger deploy** (o un nuovo deploy).

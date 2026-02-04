# Variabili d'ambiente – ZenkAI

Guida passo passo: **Key** (nome) e **Value** (valore) da copiare e incollare.

---

## Deploy da condividere (senza Nhost)

**Se vuoi solo pubblicare il sito su Netlify per condividerlo, non serve impostare nessuna variabile.**

1. Collega il repo a Netlify e fai **Deploy**.
2. **Non aggiungere** variabili in Site configuration → Environment variables.
3. L’app funziona: home, dashboard, avatar (demo), chat, material, settings, quiz, summary, room.  
4. Login e salvataggio su database (Nhost) resteranno disattivati finché non configuri Nhost.

Quando vorrai auth e database, aggiungi le variabili Nhost descritte sotto.

---

## 1. Dove impostarle

### In locale (`.env.local`)
Crea un file `.env.local` nella **root del progetto** (stessa cartella di `package.json`) e incolla le righe sotto, sostituendo i valori con i tuoi.

### Su Netlify
1. Vai su [app.netlify.com](https://app.netlify.com) → il tuo sito
2. **Site configuration** → **Environment variables** → **Add a variable** o **Import from .env**
3. Per ogni variabile: **Key** = nome sotto, **Value** = il valore (o quello che Netlify ti suggerisce)

---

## 2. Variabili Nhost (auth, database, storage)

Se usi **Nhost** per login, avatar e documenti:

| # | Key (copia esatta) | Value (esempio – sostituisci con i tuoi) | Obbligatoria |
|---|--------------------|------------------------------------------|--------------|
| 1 | `NEXT_PUBLIC_NHOST_SUBDOMAIN` | `abcdefgh` | Sì, se usi Nhost |
| 2 | `NEXT_PUBLIC_NHOST_REGION` | `eu-central-1` | No (default: eu-central-1) |

**Dove trovi i valori Nhost:**
- Accedi a [app.nhost.io](https://app.nhost.io) → il tuo progetto
- **Settings** → **General**: vedi **Subdomain** (es. `abcdefgh`) e **Region** (es. `eu-central-1`)

**Esempio righe per `.env.local` (Nhost):**
```env
NEXT_PUBLIC_NHOST_SUBDOMAIN=abcdefgh
NEXT_PUBLIC_NHOST_REGION=eu-central-1
```

---

## 3. Variabile API (servizio DAI / analisi)

Se usi il **backend di analisi** (room, OCR, “zona da inquadrare”, ecc.):

| # | Key (copia esatta) | Value (esempio) | Obbligatoria |
|---|--------------------|-----------------|--------------|
| 1 | `NEXT_PUBLIC_API_BASE` | `https://tuo-api.herokuapp.com` | Solo se usi l’API |
| 2 | `NEXT_PUBLIC_API_URL` | `https://tuo-api.herokuapp.com` | Alternativa a sopra |

- In sviluppo locale l’app usa `http://localhost:3001` se queste variabili **non** sono impostate.
- In produzione (Netlify) imposta **una** delle due con l’URL reale del tuo backend.

**Esempio righe per `.env.local` (API):**
```env
NEXT_PUBLIC_API_BASE=https://tuo-api.herokuapp.com
```

---

## 4. Riepilogo copia-incolla

### Solo Nhost
```env
NEXT_PUBLIC_NHOST_SUBDOMAIN=TUO_SUBDOMAIN_QUI
NEXT_PUBLIC_NHOST_REGION=eu-central-1
```

### Solo API (backend DAI)
```env
NEXT_PUBLIC_API_BASE=https://URL_DEL_TUO_BACKEND
```

### Nhost + API
```env
NEXT_PUBLIC_NHOST_SUBDOMAIN=TUO_SUBDOMAIN_QUI
NEXT_PUBLIC_NHOST_REGION=eu-central-1
NEXT_PUBLIC_API_BASE=https://URL_DEL_TUO_BACKEND
```

---

## 5. Netlify – passo passo

1. **Apri** il sito su Netlify → **Site configuration** → **Environment variables**.
2. Clicca **Add a variable** → **Add single variable** (o **Import from .env** se hai già un file).
3. Per ogni variabile:
   - **Key**: incolla **esattamente** il nome (es. `NEXT_PUBLIC_NHOST_SUBDOMAIN`).
   - **Value**: incolla il valore (subdomain, URL API, ecc.).
   - **Scopes**: lascia “All” (o seleziona gli ambienti che ti servono).
4. Salva e **Trigger deploy** (redeploy del sito) perché le variabili siano applicate.

---

## 6. Note

- Le variabili che iniziano con `NEXT_PUBLIC_` sono visibili nel browser; non mettere segreti (password, admin secret) in queste.
- Su Netlify, dopo aver aggiunto o modificato variabili, è necessario un nuovo deploy.
- Il file `.env.local` **non** va committato su Git (dovrebbe essere in `.gitignore`).

# Configurazione Nhost per Vsion Scuola

## Setup Iniziale

1. **Crea un account su Nhost** (https://nhost.io)
2. **Crea un nuovo progetto** nel dashboard Nhost
3. **Copia le credenziali**:
   - Subdomain
   - Region
   - Admin Secret (dalle impostazioni del progetto)

## Configurazione Variabili d'Ambiente

Crea un file `.env.local` nella root del progetto:

```env
NEXT_PUBLIC_NHOST_SUBDOMAIN=your-subdomain
NEXT_PUBLIC_NHOST_REGION=eu-central-1
NEXT_PUBLIC_NHOST_ADMIN_SECRET=your-admin-secret
```

## Setup Database

1. **Accedi al dashboard Nhost** → Database → SQL Editor
2. **Copia e incolla il contenuto** del file `database/schema.sql`
3. **Esegui lo script SQL** per creare:
   - Tabelle
   - Indici
   - Trigger
   - Row Level Security (RLS) policies

## Setup Storage

1. **Accedi a Storage** nel dashboard Nhost
2. **Crea i seguenti bucket**:
   - `avatars` - per immagini avatar
   - `knowledge-documents` - per documenti Knowledge Bank
   - `lab-snapshots` - per snapshot dei laboratori (futuro)

3. **Configura le policies di accesso**:
   - `avatars`: pubblico lettura, autenticati scrittura
   - `knowledge-documents`: privato, solo utente proprietario
   - `lab-snapshots`: privato, solo docenti della scuola

## Testare la Configurazione

```bash
# Installa le dipendenze (già fatto)
npm install

# Avvia il server di sviluppo
npm run dev
```

## Prossimi Passi

1. Integrare Nhost nel layout principale (`app/layout.tsx`)
2. Creare funzioni helper per CRUD operazioni
3. Implementare autenticazione
4. Implementare upload file su Storage
5. Sostituire localStorage con database per gli avatar

## Note Importanti

- Le RLS policies garantiscono che gli utenti vedano solo i propri dati
- I documenti sono scoped per `user_id` e `school_id`
- Le licenze controllano i limiti (max avatar, studenti, storage)
- Gli avatar possono essere template globali (solo superadmin)

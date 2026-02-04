// Nhost Configuration
export const nhostConfig = {
  subdomain: process.env.NEXT_PUBLIC_NHOST_SUBDOMAIN || '',
  region: process.env.NEXT_PUBLIC_NHOST_REGION || 'eu-central-1',
}

export const getNhostBackendUrl = () => {
  if (!nhostConfig.subdomain) {
    throw new Error('NEXT_PUBLIC_NHOST_SUBDOMAIN is not configured')
  }
  return `https://${nhostConfig.subdomain}.nhost.run`
}

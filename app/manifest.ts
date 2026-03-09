import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lumix Transport ERP',
    short_name: 'Lumix ERP',
    description: 'Transportation ERP and driver workflow for dispatch, trips, documents, invoicing, and reporting.',
    start_url: '/fi/driver',
    display: 'standalone',
    background_color: '#f8fafc',
    theme_color: '#0ea5e9',
    icons: [
      {
        src: '/logo.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  }
}

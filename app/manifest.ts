import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Lumix Transport ERP',
    short_name: 'Lumix ERP',
    description: 'Transportation ERP and driver workflow for dispatch, trips, documents, invoicing, and reporting.',
    start_url: '/fi/driver',
    display: 'standalone',
    background_color: '#f8efe3',
    theme_color: '#f47f5a',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}

import type { MetadataRoute } from 'next'

const SITE_URL = 'https://eprohori.tech'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const routes = ['', '/report', '/monitor', '/about', '/contact', '/privacy', '/terms', '/account']
  return routes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === '' || path === '/monitor' ? 'daily' : 'monthly',
    priority: path === '' ? 1.0 : path === '/report' || path === '/monitor' ? 0.9 : 0.6,
  }))
}

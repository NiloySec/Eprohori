import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/admin-eprohori-secure/', '/api/'] },
    ],
    sitemap: 'https://eprohori.tech/sitemap.xml',
    host: 'https://eprohori.tech',
  }
}

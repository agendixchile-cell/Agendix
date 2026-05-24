import type { MetadataRoute } from 'next'
import { getMarketingBaseUrl } from '@/lib/urls'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getMarketingBaseUrl()
  const now = new Date()

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
  ]
}

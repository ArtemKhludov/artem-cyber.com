import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://energylogic-ai.com'

    return {
        rules: [
            {
                userAgent: '*',
                allow: '/',
                disallow: ['/admin', '/api/private', '/dashboard', '/auth'],
            },
            {
                userAgent: 'Googlebot',
                allow: '/',
                disallow: ['/admin', '/api/private', '/dashboard', '/auth'],
            },
        ],
        sitemap: `${baseUrl}/sitemap.xml`,
    }
}


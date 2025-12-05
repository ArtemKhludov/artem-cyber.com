import { Metadata } from 'next'

export interface SEOHeadProps {
    title?: string
    description?: string
    keywords?: string[]
    ogImage?: string
    canonicalUrl?: string
    noindex?: boolean
    nofollow?: boolean
}

/**
 * SEO Head Component
 * Generates comprehensive SEO metadata for pages
 */
export function generateSEOMetadata({
    title = 'EnergyLogic – AI Life Navigation System for Adults 25–45',
    description = 'EnergyLogic is an AI-powered life navigation system that helps adults 25–45 escape debt, burnout, and career chaos with a daily adaptive path.',
    keywords = [
        'AI life navigation system',
        'personal life GPS',
        'financial stability app',
        'burnout recovery',
        'life navigation software',
        'personal growth platform',
        'financial stress management',
        'career guidance AI',
        'life path planning',
        'debt recovery app',
        'AI Life GPS',
        'burnout and debt recovery',
        'adaptive 30 60 90 day plan',
    ],
    ogImage = '/og-image-1200x630.png',
    canonicalUrl,
    noindex = false,
    nofollow = false,
}: SEOHeadProps): Metadata {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://energylogic-ai.com'
    const fullOgImage = ogImage.startsWith('http') ? ogImage : `${siteUrl}${ogImage}`
    const canonical = canonicalUrl
        ? canonicalUrl.startsWith('http')
            ? canonicalUrl
            : `${siteUrl}${canonicalUrl}`
        : siteUrl

    return {
        title: {
            default: title,
            template: '%s | EnergyLogic',
        },
        description,
        keywords,
        authors: [{ name: 'EnergyLogic Inc' }],
        creator: 'EnergyLogic Inc',
        publisher: 'EnergyLogic Inc',
        metadataBase: new URL(siteUrl),
        alternates: {
            canonical,
        },
        openGraph: {
            type: 'website',
            locale: 'en_US',
            url: canonical,
            siteName: 'EnergyLogic',
            title,
            description,
            images: [
                {
                    url: fullOgImage,
                    width: 1200,
                    height: 630,
                    alt: 'EnergyLogic - AI Life Navigation System',
                },
            ],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [fullOgImage],
            creator: '@energylogic',
        },
        robots: {
            index: !noindex,
            follow: !nofollow,
            googleBot: {
                index: !noindex,
                follow: !nofollow,
                'max-video-preview': -1,
                'max-image-preview': 'large',
                'max-snippet': -1,
            },
        },
        verification: {
            google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
            yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
        },
    }
}

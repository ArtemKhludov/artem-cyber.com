import Script from 'next/script'

export interface StructuredDataProps {
    type?: 'SoftwareApplication' | 'Organization' | 'WebSite' | 'Product' | 'Article' | 'BreadcrumbList' | 'FAQPage'
    data?: Record<string, any>
}

/**
 * Structured Data Component (Schema.org)
 * Adds JSON-LD structured data for better SEO
 */
export function StructuredData({ type = 'SoftwareApplication', data }: StructuredDataProps) {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://energylogic-ai.com'

    // Default structured data based on type
    const getDefaultData = () => {
        switch (type) {
            case 'SoftwareApplication':
                return {
                    '@context': 'https://schema.org',
                    '@type': 'SoftwareApplication',
                    name: 'EnergyLogic',
                    applicationCategory: 'ProductivityApplication',
                    operatingSystem: 'Web',
                    inLanguage: 'en-US',
                    offers: {
                        '@type': 'Offer',
                        price: '9.99',
                        priceCurrency: 'USD',
                        availability: 'https://schema.org/InStock',
                    },
                    aggregateRating: {
                        '@type': 'AggregateRating',
                        ratingValue: '4.8',
                        ratingCount: '1250',
                        bestRating: '5',
                        worstRating: '1',
                    },
                    author: {
                        '@type': 'Organization',
                        name: 'EnergyLogic Inc',
                        url: baseUrl,
                    },
                    description:
                        'AI-powered Life Navigation System for personal growth and financial stability',
                    url: baseUrl,
                    screenshot: `${baseUrl}/og-image-1200x630.png`,
                }

            case 'Organization':
                return {
                    '@context': 'https://schema.org',
                    '@type': 'Organization',
                    name: 'EnergyLogic Inc',
                    url: baseUrl,
                    inLanguage: 'en-US',
                    logo: `${baseUrl}/logo.png`,
                    sameAs: [
                        'https://twitter.com/energylogic',
                        'https://linkedin.com/company/energylogic',
                        'https://facebook.com/energylogic',
                    ],
                    contactPoint: {
                        '@type': 'ContactPoint',
                        contactType: 'Customer Service',
                        email: 'support@energylogic-ai.com',
                    },
                }

            case 'WebSite':
                return {
                    '@context': 'https://schema.org',
                    '@type': 'WebSite',
                    name: 'EnergyLogic',
                    url: baseUrl,
                    inLanguage: 'en-US',
                    potentialAction: {
                        '@type': 'SearchAction',
                        target: {
                            '@type': 'EntryPoint',
                            urlTemplate: `${baseUrl}/search?q={search_term_string}`,
                        },
                        'query-input': 'required name=search_term_string',
                    },
                }

            case 'Product':
                return {
                    '@context': 'https://schema.org',
                    '@type': 'Product',
                    name: 'EnergyLogic AI Life Navigation System',
                    description:
                        'AI-powered navigation system that builds personalized recovery paths from debt, burnout, and career stagnation',
                    brand: {
                        '@type': 'Brand',
                        name: 'EnergyLogic',
                    },
                    inLanguage: 'en-US',
                    offers: {
                        '@type': 'Offer',
                        price: '9.99',
                        priceCurrency: 'USD',
                        availability: 'https://schema.org/InStock',
                    },
                }

            case 'Article':
                return {
                    '@context': 'https://schema.org',
                    '@type': 'Article',
                    headline: data?.headline || 'EnergyLogic Blog',
                    description: data?.description || 'Articles about AI life navigation',
                    author: {
                        '@type': 'Organization',
                        name: 'EnergyLogic Inc',
                    },
                    publisher: {
                        '@type': 'Organization',
                        name: 'EnergyLogic Inc',
                        logo: {
                            '@type': 'ImageObject',
                            url: `${baseUrl}/logo.png`,
                        },
                    },
                    datePublished: data?.datePublished || new Date().toISOString(),
                    dateModified: data?.dateModified || new Date().toISOString(),
                }

            case 'BreadcrumbList':
                return {
                    '@context': 'https://schema.org',
                    '@type': 'BreadcrumbList',
                    itemListElement: data?.itemListElement || [
                        {
                            '@type': 'ListItem',
                            position: 1,
                            name: 'Home',
                            item: `${baseUrl}/`,
                        },
                    ],
                }

            case 'FAQPage':
                return {
                    '@context': 'https://schema.org',
                    '@type': 'FAQPage',
                    mainEntity: data?.mainEntity || [],
                }

            default:
                return {}
        }
    }

    const structuredData = data || getDefaultData()

    return (
        <Script
            id={`structured-data-${type}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
    )
}

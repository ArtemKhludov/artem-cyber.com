// Pricing configuration for all EnergyLogic products and services

export interface Product {
    id: string
    name: string
    type: 'pdf' | 'program' | 'course' | 'consultation'
    price: number
    originalPrice?: number
    currency: 'RUB' | 'USD'
    description: string
    features: string[]
    duration?: string
    popular?: boolean
    available: boolean
}

export interface PDFDocument {
    id: string
    title: string
    description: string
    price: number
    originalPrice?: number
    file_url: string
    cover_url?: string
    page_count: number
    category: string
}

// PDF documents with concrete prices
export const PDF_DOCUMENTS: PDFDocument[] = [
    {
        id: 'energylogic-art',
        title: "EnergyLogic: The Art of Reality Recalibration",
        description: "An exploration of deep mechanisms for transforming perception and multi-level work with layers of reality. A practical guide to changing foundational beliefs.",
        price: 2990,
        originalPrice: 3990,
        file_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/energylogic-iskusstvo-perekalibrovki-realnosti/main.pdf",
        cover_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/energylogic-iskusstvo-perekalibrovki-realnosti/cover.png",
        page_count: 45,
        category: "Core"
    },
    {
        id: 'self-knowledge-map',
        title: "Self-Knowledge Map: When I Understand Nothing",
        description: "A practical guide for navigating periods of uncertainty and finding internal reference points.",
        price: 1990,
        originalPrice: 2490,
        file_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/karta-samopoznaniya-kogda-ya-nichego-ne-ponimayu/main.pdf",
        cover_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/karta-samopoznaniya-kogda-ya-nichego-ne-ponimayu/cover.png",
        page_count: 32,
        category: "Self-discovery"
    },
    {
        id: 'neurobiology-emotions',
        title: "Neurobiology of Emotions: Biological Foundations and Synchronization Methods",
        description: "A scientific seminar on the neurobiological foundations of emotional processes.",
        price: 2490,
        originalPrice: 3290,
        file_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/nejrobiologiya-emocij-biologicheskie-osnovy-i-metody-sinhronizacii/main.pdf",
        cover_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/nejrobiologiya-emocij-biologicheskie-osnovy-i-metody-sinhronizacii/cover.png",
        page_count: 38,
        category: "Science"
    },
    {
        id: 'external-scenarios',
        title: "Recognizing External Scenarios: Tools for Self-Observation",
        description: "A deep study of how external systems embed into our consciousness without personal will, and methods to recognize these insertions.",
        price: 3490,
        originalPrice: 4490,
        file_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/raspoznavanie-vneshnih-scenariev-instrumenty-samonablyudeniya/main.pdf",
        cover_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/raspoznavanie-vneshnih-scenariev-instrumenty-samonablyudeniya/cover.png",
        page_count: 52,
        category: "Psychology"
    },
    {
        id: 'adjustable-reality',
        title: "Configurable Reality: A Metaphysical Model of Consciousness",
        description: "If reality is configurable and its properties can be tuned like parameters in a complex system, a completely new understanding of the universe and our place in it emerges.",
        price: 3990,
        originalPrice: 4990,
        file_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/nastraivaemaya-realnost-metafizicheskaya-model-soznaniya/main.pdf",
        cover_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/nastraivaemaya-realnost-metafizicheskaya-model-soznaniya/cover.png",
        page_count: 48,
        category: "Philosophy"
    },
    {
        id: 'quantum-architecture',
        title: "Quantum Architecture of Intention: A Method for Conscious Reality Rewrite",
        description: "Deep mechanisms for shaping reality by tuning personal consciousness and synchronizing it with the metaverse field.",
        price: 4990,
        originalPrice: 6990,
        file_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/kvantovaya-arhitektura-namereniya-metod-soznatelnoj-perezapisi-realnosti/main.pdf",
        cover_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/kvantovaya-arhitektura-namereniya-metod-soznatelnoj-perezapisi-realnosti/cover.png",
        page_count: 65,
        category: "Quantum physics"
    }
]

// Programs and courses with concrete prices
export const PROGRAMS: Product[] = [
    {
        id: 'mini-session',
        name: 'Mini session',
        type: 'consultation',
        price: 4999,
        originalPrice: 6999,
        currency: 'RUB',
        description: 'Express personality analysis with basic recommendations. Perfect for a first introduction to the system.',
        features: [
            'Speech pattern analysis',
            'Basic PDF report',
            'General recommendations',
            '7 days of support'
        ],
        duration: '20 minutes',
        popular: false,
        available: true
    },
    {
        id: 'deep-day',
        name: 'Deep day',
        type: 'program',
        price: 24999,
        originalPrice: 34999,
        currency: 'RUB',
        description: 'Comprehensive analysis with deep work on every aspect of personality and a personalized development program.',
        features: [
            'In-depth psychoanalysis',
            'Detailed 50+ page PDF report',
            'Personal development program',
            'Individual exercises',
            '30 days of support',
            'Follow-up session after one month'
        ],
        duration: '6 hours',
        popular: true,
        available: true
    },
    {
        id: 'transformation-21',
        name: '21 days',
        type: 'course',
        price: 49999,
        originalPrice: 69999,
        currency: 'RUB',
        description: 'Complete personality transformation in 21 days with daily guidance and coaching.',
        features: [
            'Daily mini sessions',
            'Personal mentor',
            'Weekly reports',
            'Support group',
            'Final session with a one-year plan',
            'Lifetime support'
        ],
        duration: '21 days',
        popular: false,
        available: true
    }
]

// Additional services
export const ADDITIONAL_SERVICES: Product[] = [
    {
        id: 'personal-consultation',
        name: 'Personal consultation',
        type: 'consultation',
        price: 8999,
        originalPrice: 11999,
        currency: 'RUB',
        description: 'One-on-one consultation with deep analysis of your situation and personalized recommendations.',
        features: [
            '1.5 hours of individual work',
            'Detailed situation analysis',
            'Personal action plan',
            '14 days of support'
        ],
        duration: '1.5 hours',
        popular: false,
        available: true
    },
    {
        id: 'group-session',
        name: 'Group session',
        type: 'program',
        price: 2999,
        originalPrice: 3999,
        currency: 'RUB',
        description: 'Group work with like-minded people led by an expert.',
        features: [
            '2 hours of group work',
            'Mutual participant support',
            'Group exercises',
            'Access to session recording'
        ],
        duration: '2 hours',
        popular: false,
        available: true
    },
    {
        id: 'monthly-support',
        name: 'Monthly support',
        type: 'consultation',
        price: 14999,
        originalPrice: 19999,
        currency: 'RUB',
        description: 'Monthly guidance with regular consultations and support.',
        features: [
            '4 consultations per month',
            'Weekly reports',
            'Priority support',
            'Access to a private group'
        ],
        duration: '1 month',
        popular: false,
        available: true
    }
]

// Pricing helpers
export function formatPrice(price: number, currency: 'RUB' | 'USD' = 'RUB'): string {
    if (currency === 'USD') {
        return `$${price.toLocaleString()}`
    }
    return `${price.toLocaleString('en-US')} ₽`
}

export function calculateDiscount(originalPrice: number, currentPrice: number): number {
    return Math.round(((originalPrice - currentPrice) / originalPrice) * 100)
}

export function getProductById(id: string): Product | PDFDocument | undefined {
    const allProducts = [...PROGRAMS, ...ADDITIONAL_SERVICES, ...PDF_DOCUMENTS]
    return allProducts.find(product => product.id === id)
}

export function getProductsByType(type: 'pdf' | 'program' | 'course' | 'consultation'): Product[] {
    return [...PROGRAMS, ...ADDITIONAL_SERVICES].filter(product => product.type === type)
}

export function getPopularProducts(): Product[] {
    return [...PROGRAMS, ...ADDITIONAL_SERVICES].filter(product => product.popular)
}

export function getAvailableProducts(): Product[] {
    return [...PROGRAMS, ...ADDITIONAL_SERVICES, ...PDF_DOCUMENTS].filter(product => (product as any).available) as Product[]
}

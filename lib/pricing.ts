// Конфигурация цен для всех продуктов и услуг EnergyLogic

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

// PDF-документы с конкретными ценами
export const PDF_DOCUMENTS: PDFDocument[] = [
    {
        id: 'energylogic-art',
        title: "EnergyLogic: Искусство Перекалибровки Реальности",
        description: "Исследование глубинных механизмов трансформации восприятия и многоуровневой работы с слоями реальности. Практическое руководство по изменению фундаментальных убеждений.",
        price: 2990,
        originalPrice: 3990,
        file_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/energylogic-iskusstvo-perekalibrovki-realnosti/main.pdf",
        cover_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/energylogic-iskusstvo-perekalibrovki-realnosti/cover.png",
        page_count: 45,
        category: "Основные"
    },
    {
        id: 'self-knowledge-map',
        title: "Карта Самопознания: Когда Я Ничего Не Понимаю",
        description: "Практическое руководство по навигации в периоды неопределенности и поиску внутренних ориентиров.",
        price: 1990,
        originalPrice: 2490,
        file_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/karta-samopoznaniya-kogda-ya-nichego-ne-ponimayu/main.pdf",
        cover_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/karta-samopoznaniya-kogda-ya-nichego-ne-ponimayu/cover.png",
        page_count: 32,
        category: "Самопознание"
    },
    {
        id: 'neurobiology-emotions',
        title: "Нейробиология эмоций: биологические основы и методы синхронизации",
        description: "Научный семинар, посвященный нейробиологическим основам эмоциональных процессов.",
        price: 2490,
        originalPrice: 3290,
        file_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/nejrobiologiya-emocij-biologicheskie-osnovy-i-metody-sinhronizacii/main.pdf",
        cover_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/nejrobiologiya-emocij-biologicheskie-osnovy-i-metody-sinhronizacii/cover.png",
        page_count: 38,
        category: "Наука"
    },
    {
        id: 'external-scenarios',
        title: "Распознавание внешних сценариев: Инструменты самонаблюдения",
        description: "Глубинное исследование механизмов, через которые внешние системы встраиваются в наше сознание без личной воли, и методы распознавания этих вставок.",
        price: 3490,
        originalPrice: 4490,
        file_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/raspoznavanie-vneshnih-scenariev-instrumenty-samonablyudeniya/main.pdf",
        cover_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/raspoznavanie-vneshnih-scenariev-instrumenty-samonablyudeniya/cover.png",
        page_count: 52,
        category: "Психология"
    },
    {
        id: 'adjustable-reality',
        title: "Настраиваемая реальность: метафизическая модель сознания",
        description: "Если принять за аксиому, что реальность настраиваема и её свойства можно менять так же, как параметры в сложной системе, то открывается совершенно иное понимание мироздания и нашего места в нём.",
        price: 3990,
        originalPrice: 4990,
        file_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/nastraivaemaya-realnost-metafizicheskaya-model-soznaniya/main.pdf",
        cover_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/nastraivaemaya-realnost-metafizicheskaya-model-soznaniya/cover.png",
        page_count: 48,
        category: "Философия"
    },
    {
        id: 'quantum-architecture',
        title: "Квантовая Архитектура Намерения: Метод Сознательной Перезаписи Реальности",
        description: "Глубинные механизмы формирования реальности через настройку личного сознания и его синхронизацию с метаполем.",
        price: 4990,
        originalPrice: 6990,
        file_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/kvantovaya-arhitektura-namereniya-metod-soznatelnoj-perezapisi-realnosti/main.pdf",
        cover_url: "https://mcexzjzowwanxawbiizd.supabase.co/storage/v1/object/public/course-materials/courses/kvantovaya-arhitektura-namereniya-metod-soznatelnoj-perezapisi-realnosti/cover.png",
        page_count: 65,
        category: "Квантовая физика"
    }
]

// Программы и курсы с конкретными ценами
export const PROGRAMS: Product[] = [
    {
        id: 'mini-session',
        name: 'Mini-сессия',
        type: 'consultation',
        price: 4999,
        originalPrice: 6999,
        currency: 'RUB',
        description: 'Экспресс-анализ личности с базовыми рекомендациями. Идеально для первого знакомства с системой.',
        features: [
            'Анализ речевых паттернов',
            'Базовый PDF-отчет',
            'Общие рекомендации',
            'Поддержка 7 дней'
        ],
        duration: '20 минут',
        popular: false,
        available: true
    },
    {
        id: 'deep-day',
        name: 'Глубокий день',
        type: 'program',
        price: 24999,
        originalPrice: 34999,
        currency: 'RUB',
        description: 'Комплексный анализ с детальной проработкой всех аспектов личности и персональной программой развития.',
        features: [
            'Глубокий психоанализ',
            'Детальный PDF-отчет 50+ страниц',
            'Персональная программа развития',
            'Индивидуальные упражнения',
            'Поддержка 30 дней',
            'Дополнительная сессия через месяц'
        ],
        duration: '6 часов',
        popular: true,
        available: true
    },
    {
        id: 'transformation-21',
        name: '21 день',
        type: 'course',
        price: 49999,
        originalPrice: 69999,
        currency: 'RUB',
        description: 'Полная трансформация личности за 21 день с ежедневным сопровождением и коучингом.',
        features: [
            'Ежедневные мини-сессии',
            'Персональный куратор',
            'Еженедельные отчеты',
            'Группа поддержки',
            'Финальная сессия с планом на год',
            'Пожизненная поддержка'
        ],
        duration: '21 день',
        popular: false,
        available: true
    }
]

// Дополнительные услуги
export const ADDITIONAL_SERVICES: Product[] = [
    {
        id: 'personal-consultation',
        name: 'Персональная консультация',
        type: 'consultation',
        price: 8999,
        originalPrice: 11999,
        currency: 'RUB',
        description: 'Индивидуальная консультация с глубоким анализом вашей ситуации и персональными рекомендациями.',
        features: [
            '1.5 часа индивидуальной работы',
            'Детальный анализ ситуации',
            'Персональный план действий',
            'Поддержка 14 дней'
        ],
        duration: '1.5 часа',
        popular: false,
        available: true
    },
    {
        id: 'group-session',
        name: 'Групповая сессия',
        type: 'program',
        price: 2999,
        originalPrice: 3999,
        currency: 'RUB',
        description: 'Групповая работа с единомышленниками под руководством эксперта.',
        features: [
            '2 часа групповой работы',
            'Взаимная поддержка участников',
            'Групповые упражнения',
            'Доступ к записи сессии'
        ],
        duration: '2 часа',
        popular: false,
        available: true
    },
    {
        id: 'monthly-support',
        name: 'Месячная поддержка',
        type: 'consultation',
        price: 14999,
        originalPrice: 19999,
        currency: 'RUB',
        description: 'Ежемесячное сопровождение с регулярными консультациями и поддержкой.',
        features: [
            '4 консультации в месяц',
            'Еженедельные отчеты',
            'Приоритетная поддержка',
            'Доступ к закрытой группе'
        ],
        duration: '1 месяц',
        popular: false,
        available: true
    }
]

// Функции для работы с ценами
export function formatPrice(price: number, currency: 'RUB' | 'USD' = 'RUB'): string {
    if (currency === 'USD') {
        return `$${price.toLocaleString()}`
    }
    return `${price.toLocaleString('ru-RU')} ₽`
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
    return [...PROGRAMS, ...ADDITIONAL_SERVICES, ...PDF_DOCUMENTS].filter(product => product.available)
}

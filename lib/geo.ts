interface IPInfoResponse {
  ip: string
  hostname?: string
  city?: string
  region?: string
  country: string
  loc?: string
  org?: string
  postal?: string
  timezone?: string
}

export async function getCountryByIP(): Promise<string | null> {
  try {
    const response = await fetch('https://ipinfo.io/json', {
      headers: {
        'Accept': 'application/json',
      },
    })
    
    if (!response.ok) {
      throw new Error('Failed to fetch IP info')
    }
    
    const data: IPInfoResponse = await response.json()
    return data.country
  } catch (error) {
    console.error('Error fetching country by IP:', error)
    return null
  }
}

export function shouldUseCryptomus(country: string | null): boolean {
  if (!country) return false
  
  // Страны СНГ, где рекомендуется Cryptomus
  const cngCountries = ['RU', 'BY', 'KZ', 'AM', 'AZ', 'KG', 'MD', 'TJ', 'TM', 'UZ']
  return cngCountries.includes(country)
}

export function getRecommendedPaymentMethod(country: string | null): 'stripe' | 'cryptomus' {
  return shouldUseCryptomus(country) ? 'cryptomus' : 'stripe'
}

export function getCountryName(countryCode: string | null): string {
  if (!countryCode) return 'Неизвестная страна'
  
  const countryNames: Record<string, string> = {
    'RU': 'Россия',
    'BY': 'Беларусь', 
    'KZ': 'Казахстан',
    'AM': 'Армения',
    'AZ': 'Азербайджан',
    'KG': 'Киргизия',
    'MD': 'Молдова',
    'TJ': 'Таджикистан',
    'TM': 'Туркменистан',
    'UZ': 'Узбекистан',
    'UA': 'Украина',
    'US': 'США',
    'GB': 'Великобритания',
    'DE': 'Германия',
    'FR': 'Франция',
    'IT': 'Италия',
    'ES': 'Испания',
    'PL': 'Польша',
    'TR': 'Турция',
    'CN': 'Китай',
    'JP': 'Япония',
    'IN': 'Индия',
    'BR': 'Бразилия',
    'CA': 'Канада',
    'AU': 'Австралия'
  }
  
  return countryNames[countryCode] || countryCode
}

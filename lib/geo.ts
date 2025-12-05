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
  
  // CIS countries where Cryptomus is recommended
  const cngCountries = ['RU', 'BY', 'KZ', 'AM', 'AZ', 'KG', 'MD', 'TJ', 'TM', 'UZ']
  return cngCountries.includes(country)
}

export function getRecommendedPaymentMethod(country: string | null): 'stripe' | 'cryptomus' {
  return shouldUseCryptomus(country) ? 'cryptomus' : 'stripe'
}

export function getCountryName(countryCode: string | null): string {
  if (!countryCode) return 'Unknown country'
  
  const countryNames: Record<string, string> = {
    'RU': 'Russia',
    'BY': 'Belarus', 
    'KZ': 'Kazakhstan',
    'AM': 'Armenia',
    'AZ': 'Azerbaijan',
    'KG': 'Kyrgyzstan',
    'MD': 'Moldova',
    'TJ': 'Tajikistan',
    'TM': 'Turkmenistan',
    'UZ': 'Uzbekistan',
    'UA': 'Ukraine',
    'US': 'United States',
    'GB': 'United Kingdom',
    'DE': 'Germany',
    'FR': 'France',
    'IT': 'Italy',
    'ES': 'Spain',
    'PL': 'Poland',
    'TR': 'Turkey',
    'CN': 'China',
    'JP': 'Japan',
    'IN': 'India',
    'BR': 'Brazil',
    'CA': 'Canada',
    'AU': 'Australia'
  }
  
  return countryNames[countryCode] || countryCode
}

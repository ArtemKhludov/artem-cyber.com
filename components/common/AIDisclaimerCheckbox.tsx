'use client'

import { useState } from 'react'
import Link from 'next/link'

interface AIDisclaimerCheckboxProps {
    onAgree: (agreed: boolean) => void
    required?: boolean
    className?: string
}

export function AIDisclaimerCheckbox({ onAgree, required = true, className = '' }: AIDisclaimerCheckboxProps) {
    const [isAgreed, setIsAgreed] = useState(false)

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const agreed = e.target.checked
        setIsAgreed(agreed)
        onAgree(agreed)
    }

    return (
        <div className={`bg-yellow-50 border border-yellow-200 rounded-lg p-4 ${className}`}>
            <div className="flex items-start space-x-3">
                <input
                    type="checkbox"
                    id="ai-disclaimer"
                    checked={isAgreed}
                    onChange={handleChange}
                    required={required}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="ai-disclaimer" className="text-sm text-gray-700 leading-relaxed">
                    <span className="font-medium text-yellow-800">⚠️ Important:</span>{' '}
                    I confirm that I understand the results are not a diagnosis and accept responsibility for using the materials.{' '}
                    <Link href="/disclaimer" className="text-blue-600 hover:underline font-medium">
                        Disclaimer
                    </Link>
                </label>
            </div>
        </div>
    )
}

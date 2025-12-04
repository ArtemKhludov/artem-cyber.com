import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
    try {
        // Specific prices to update (use exact titles from DB)
        const pricingUpdates = [
            {
                title: "EnergyLogic: The Art of Reality Recalibration",
                price: 2990,
                price_rub: 2990
            },
            {
                title: "Self-Discovery Map: When I Understand Nothing",
                price: 1990,
                price_rub: 1990
            },
            {
                title: "Neurobiology of Emotions: Foundations and Synchronization Methods",
                price: 2490,
                price_rub: 2490
            },
            {
                title: "Recognizing External Scripts: Self-Observation Tools",
                price: 3490,
                price_rub: 3490
            },
            {
                title: "Configurable Reality: Metaphysical Model of Consciousness",
                price: 3990,
                price_rub: 3990
            },
            {
                title: "Quantum Architecture of Intention: Conscious Reality Rewrite",
                price: 4990,
                price_rub: 4990
            }
        ]

        const results = []

        for (const update of pricingUpdates) {
            const { data, error } = await supabase
                .from('documents')
                .update({
                    price: update.price,
                    price_rub: update.price_rub
                })
                .eq('title', update.title)
                .select()

            if (error) {
                console.error(`Error updating ${update.title}:`, error)
                results.push({ title: update.title, success: false, error: error.message })
            } else {
                results.push({ title: update.title, success: true, updated: data })
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Prices updated',
            results
        })

    } catch (error) {
        console.error('Update pricing error:', error)
        return NextResponse.json(
            { error: 'Pricing update failed' },
            { status: 500 }
        )
    }
}

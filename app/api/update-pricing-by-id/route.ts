import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
    try {
        // Specific prices to update by ID
        const pricingUpdates = [
            {
                id: "84f1cc74-936a-4bb7-8dba-33fea9d515be",
                title: "EnergyLogic: The Art of Reality Recalibration",
                price: 2990,
                price_rub: 2990
            },
            {
                id: "5080ac5b-e820-494f-88b3-0490b520db7f",
                title: "Self-Discovery Map: When I Understand Nothing",
                price: 1990,
                price_rub: 1990
            },
            {
                id: "811a76b4-18d9-458a-a6f9-9072687f8ea2",
                title: "Neurobiology of Emotions: Foundations and Synchronization Methods",
                price: 2490,
                price_rub: 2490
            },
            {
                id: "5e677c76-1818-4adc-850a-4352c9e36196",
                title: "Recognizing External Scripts: Self-Observation Tools",
                price: 3490,
                price_rub: 3490
            },
            {
                id: "96736874-7846-4af7-a2ef-a9cd3ff2b676",
                title: "Configurable Reality: Metaphysical Model of Consciousness",
                price: 3990,
                price_rub: 3990
            },
            {
                id: "7b3e63f4-45fb-44a3-93cd-ff4abeead3e4",
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
                .eq('id', update.id)
                .select()

            if (error) {
                console.error(`Error updating ${update.title}:`, error)
                results.push({ id: update.id, title: update.title, success: false, error: error.message })
            } else {
                results.push({ id: update.id, title: update.title, success: true, updated: data })
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Prices updated by ID',
            results
        })

    } catch (error) {
        console.error('Update pricing by ID error:', error)
        return NextResponse.json(
            { error: 'Pricing update failed' },
            { status: 500 }
        )
    }
}

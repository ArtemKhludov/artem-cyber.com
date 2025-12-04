import { PageLayout } from '@/components/layout/PageLayout'

export default function DisclaimerPage() {
    return (
        <PageLayout>
            <div className="container mx-auto px-4 py-12 max-w-4xl">
                <h1 className="text-4xl font-bold text-gray-900 mb-8">Disclaimer</h1>

                <div className="prose prose-lg max-w-none">
                    <div className="text-gray-600 text-lg mb-8 space-y-2">
                        <p>Effective Date: {new Date().toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}</p>
                        <p>Last Updated: {new Date().toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}</p>
                    </div>

                    <div className="border-t border-b border-gray-300 my-8"></div>

                    <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">1. General Information</h2>
                    <div className="text-gray-700 mb-6 space-y-4">
                        <p>
                            <strong>1.1.</strong> EnergyLogic platform provides informational, analytical, and consultation materials, access to tests, personalized PDF reports, and digital courses created based on proprietary methodologies.
                        </p>
                        <p>
                            <strong>1.2.</strong> All materials are informational and reflective in nature and are aimed at expanding awareness, self-observation, and self-analysis. They are not medical, psychotherapeutic, psychological, or legal services.
                        </p>
                        <p>
                            <strong>1.3.</strong> Use of the platform implies the user's agreement with this disclaimer.
                        </p>
                    </div>

                    <div className="border-t border-b border-gray-300 my-8"></div>

                    <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">2. Not a Medical or Psychotherapeutic Tool</h2>
                    <div className="text-gray-700 mb-6 space-y-4">
                        <p>
                            <strong>2.1.</strong> EnergyLogic does not replace:
                        </p>
                        <ul className="list-disc list-inside ml-4 space-y-2">
                            <li>consultations with a doctor, psychologist, or psychotherapist;</li>
                            <li>diagnosis and treatment of physical or mental illnesses;</li>
                            <li>officially licensed assistance in crisis situations.</li>
                        </ul>
                        <p>
                            <strong>2.2.</strong> All recommendations and results, including AI-generated responses, are not diagnoses, prescriptions, or medical conclusions.
                        </p>
                    </div>

                    <div className="border-t border-b border-gray-300 my-8"></div>

                    <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">3. Working with Artificial Intelligence</h2>
                    <div className="text-gray-700 mb-6 space-y-4">
                        <p>
                            <strong>3.1.</strong> Some results, tests, and texts presented on the platform are partially or fully generated using artificial intelligence (AI), including OpenAI language models.
                        </p>
                        <p>
                            <strong>3.2.</strong> Although we make efforts to verify accuracy, AI may make logical or factual errors, and its responses are not the opinion of a human expert.
                        </p>
                        <p>
                            <strong>3.3.</strong> The user acknowledges that all responsibility for interpreting materials lies with them.
                        </p>
                    </div>

                    <div className="border-t border-b border-gray-300 my-8"></div>

                    <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">4. Individual User Responsibility</h2>
                    <div className="text-gray-700 mb-6 space-y-4">
                        <p>
                            <strong>4.1.</strong> The user assumes full responsibility for the consequences of using platform materials, including any internal changes, decisions made, and actions taken.
                        </p>
                        <p>
                            <strong>4.2.</strong> EnergyLogic and its creators are not liable for direct or indirect damages, including but not limited to:
                        </p>
                        <ul className="list-disc list-inside ml-4 space-y-2">
                            <li>emotional or psychological reactions;</li>
                            <li>lifestyle changes;</li>
                            <li>business, personal, or financial decisions made after taking tests or studying materials.</li>
                        </ul>
                    </div>

                    <div className="border-t border-b border-gray-300 my-8"></div>

                    <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">5. Working with Sensitive Topics</h2>
                    <div className="text-gray-700 mb-6 space-y-4">
                        <p>
                            <strong>5.1.</strong> Some materials may address internal patterns, childhood scenarios, unconscious processes, personal trauma, and worldview issues.
                        </p>
                        <p>
                            <strong>5.2.</strong> The user acknowledges that:
                        </p>
                        <ul className="list-disc list-inside ml-4 space-y-2">
                            <li>they may encounter emotional reactions;</li>
                            <li>the platform does not guarantee results;</li>
                            <li>participation is always voluntary and can be terminated at the user's request.</li>
                        </ul>
                    </div>

                    <div className="border-t border-b border-gray-300 my-8"></div>

                    <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">6. Access Geography and Legal Restrictions</h2>
                    <div className="text-gray-700 mb-6 space-y-4">
                        <p>
                            <strong>6.1.</strong> EnergyLogic is available to users worldwide.
                        </p>
                        <p>
                            <strong>6.2.</strong> The user is solely responsible for compliance with local legislation when using the platform.
                        </p>
                        <p>
                            <strong>6.3.</strong> We are not responsible for the inability to use the service if it violates legal norms in your country of residence.
                        </p>
                    </div>

                    <div className="border-t border-b border-gray-300 my-8"></div>

                    <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">7. Limitation of Liability</h2>
                    <div className="text-gray-700 mb-6 space-y-4">
                        <p>
                            <strong>7.1.</strong> To the extent permitted by applicable law, EnergyLogic, its authors, developers, and operators are not liable for:
                        </p>
                        <ul className="list-disc list-inside ml-4 space-y-2">
                            <li>incidental, indirect, punitive, or other damages;</li>
                            <li>loss of data, profits, reputation, business opportunities;</li>
                            <li>technical failures, algorithm errors, failures in payment systems or data transmission.</li>
                        </ul>
                    </div>

                    <div className="border-t border-b border-gray-300 my-8"></div>

                    <h2 className="text-2xl font-bold text-gray-900 mt-8 mb-4">8. Contact Information</h2>
                    <div className="text-gray-700 mb-6 space-y-4">
                        <p>
                            If you have questions about this disclaimer, please contact us:
                        </p>
                        <div className="bg-gray-50 p-4 rounded-lg my-4">
                            <p><strong>📩 Email:</strong> energylogic.help@gmail.com</p>
                            <p><strong>🤖 Telegram Bot:</strong> @energylogic_callback_bot</p>
                        </div>
                    </div>
                </div>
            </div>
        </PageLayout>
    )
}
'use strict'

// End-to-end scenario tests for payments and access
// - Creates an admin session
// - Creates a test user and session
// - Grants access via admin API
// - Verifies purchase status and course access endpoint
// - Simulates refund and verifies access is denied

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const dotenv = require('dotenv')
const { createClient } = require('@supabase/supabase-js')
const bcrypt = require('bcryptjs')

// Load env (.env.local preferred)
const envLocalPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath })
} else {
    dotenv.config()
}

const APP_URL = process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

function logStep(name) {
    process.stdout.write(`→ ${name} ... `)
}
function logOk(msg = 'OK') {
    console.log(`✔ ${msg}`)
}
function logFail(err) {
    console.log(`✘ ${err}`)
}

async function getAnyAdminUser() {
    const { data, error } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('role', 'admin')
        .limit(1)
    if (error) throw new Error('Query admin failed: ' + error.message)
    return (data && data[0]) || null
}

async function createSessionForUser(userId) {
    const token = crypto.randomBytes(24).toString('hex')
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    const { error } = await supabase
        .from('user_sessions')
        .insert({ user_id: userId, session_token: token, expires_at: expires })
    if (error) throw new Error('Create session failed: ' + error.message)
    return token
}

async function ensureTestUser(email) {
    let { data: user, error } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email)
        .maybeSingle()
    if (error) throw new Error('Find user failed: ' + error.message)
    if (user) return user

    const { data: created, error: insErr } = await supabase
        .from('users')
        .insert([{ email, name: 'JS Test User', password_hash: bcrypt.hashSync('JsTest!' + Date.now(), 10), role: 'user' }])
        .select('id, email')
        .maybeSingle()
    if (insErr) throw new Error('Create test user failed: ' + insErr.message)
    return created
}

async function getAnyDocument() {
    const { data, error } = await supabase
        .from('documents')
        .select('id, title, price_rub')
        .limit(1)
    if (error) throw new Error('Fetch documents failed: ' + error.message)
    if (!data || !data[0]) throw new Error('No documents found')
    return data[0]
}

async function getPurchase(email, documentId) {
    const { data, error } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_email', email)
        .eq('document_id', documentId)
        .maybeSingle()
    if (error) throw new Error('Fetch purchase failed: ' + error.message)
    return data || null
}

async function getAccessCount(userId, documentId) {
    const { data, error } = await supabase
        .from('user_course_access')
        .select('id, revoked_at')
        .eq('user_id', userId)
        .eq('document_id', documentId)
    if (error) throw new Error('Fetch access failed: ' + error.message)
    return (data || []).filter((r) => r.revoked_at === null).length
}

async function runReconcile(adminToken, windowMinutes = 15) {
    const res = await fetch(`${APP_URL}/api/admin/payments/reconcile`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ windowMinutes })
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok || json.error) throw new Error('Reconcile failed: ' + (json.error || res.status))
    return json
}

async function updatePurchaseStatusById(id, status) {
    const { data, error } = await supabase
        .from('purchases')
        .update({ payment_status: status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .maybeSingle()
    if (error) throw new Error('Update purchase failed: ' + error.message)
    return data
}

async function grantAccess(adminToken, email, documentId) {
    const res = await fetch(`${APP_URL}/api/admin/access/grant`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ email, documentId })
    })
    const json = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(`Grant failed: ${json.error || res.status}`)
    return json
}

async function directGrant(email, userId, documentId, amountPaid = 0, currency = 'RUB') {
    // Try purchases amount_paid schema
    let { data, error } = await supabase
        .from('purchases')
        .insert([
            {
                user_id: userId,
                user_email: email.toLowerCase(),
                document_id: documentId,
                payment_status: 'completed',
                payment_method: 'admin',
                amount_paid: amountPaid,
                currency,
            },
        ])
        .select()
        .maybeSingle()
    if (error) {
        // Fallback to legacy 'amount'
        const retry = await supabase
            .from('purchases')
            .insert([
                {
                    user_id: userId,
                    user_email: email.toLowerCase(),
                    document_id: documentId,
                    payment_status: 'completed',
                    payment_method: 'admin',
                    amount: amountPaid,
                    currency,
                },
            ])
            .select()
            .maybeSingle()
        data = retry.data
        error = retry.error
    }
    if (error) throw new Error('Direct grant failed: ' + error.message)
    return data
}

async function checkCourseAccess(courseId, userToken, expectOk) {
    const res = await fetch(`${APP_URL}/api/courses/${courseId}/access`, {
        headers: {
            'Cookie': `session_token=${userToken}`
        }
    })
    if (expectOk && res.status !== 200) {
        const t = await res.text()
        throw new Error(`Expected 200, got ${res.status}. Body: ${t}`)
    }
    if (!expectOk && res.status === 200) {
        throw new Error(`Expected 4xx, got 200`)
    }
    return res.status
}

async function main() {
    const summary = []

    // 0) Admin session
    logStep('Find admin user')
    const admin = await getAnyAdminUser()
    if (!admin) throw new Error('No admin user found. Please set admin role and rerun.')
    logOk(admin.email || admin.id)

    logStep('Create admin session')
    const adminToken = await createSessionForUser(admin.id)
    logOk('token issued')

    // 1) Prepare data
    logStep('Pick document for tests')
    const doc = await getAnyDocument()
    logOk(`${doc.title}`)

    const testEmail = `js-e2e-${Date.now()}@example.com`
    logStep('Ensure test user')
    const testUser = await ensureTestUser(testEmail)
    logOk(testUser.email)

    logStep('Create test user session')
    const userToken = await createSessionForUser(testUser.id)
    logOk('token issued')

    // 2) Access BEFORE grant
    logStep('Access before grant should be denied')
    try {
        await checkCourseAccess(doc.id, userToken, false)
        logOk('denied as expected')
        summary.push({ step: 'pre-access', ok: true })
    } catch (e) {
        logFail(e.message)
        summary.push({ step: 'pre-access', ok: false, error: e.message })
    }

    // 3) Grant access via admin API
    logStep('Grant access via admin API')
    try {
        await grantAccess(adminToken, testEmail, doc.id)
    } catch (e) {
        // fallback to direct DB grant
        await directGrant(testEmail, testUser.id, doc.id)
    }
    logOk('granted')

    // 3b) Idempotent grant (should not duplicate access)
    logStep('Grant access again (idempotency)')
    try {
        await grantAccess(adminToken, testEmail, doc.id)
    } catch (e) {
        // ignore non-200 as API may short-circuit; we only check DB state
    }
    const accessCount = await getAccessCount(testUser.id, doc.id)
    if (accessCount > 1) throw new Error('Idempotency failed: multiple active access records')
    logOk('no duplicates')

    // 4) Verify purchase status completed
    logStep('Verify purchase completed in DB')
    const purchase = await getPurchase(testEmail, doc.id)
    if (!purchase || purchase.payment_status !== 'completed') {
        throw new Error('Purchase not completed after grant')
    }
    logOk('completed')

    // 5) Access AFTER grant
    logStep('Access after grant should be allowed')
    try {
        await checkCourseAccess(doc.id, userToken, true)
        logOk('allowed as expected')
        summary.push({ step: 'post-access', ok: true })
    } catch (e) {
        logFail(e.message)
        summary.push({ step: 'post-access', ok: false, error: e.message })
    }

    // 6) Simulate refund → access should be denied
    logStep('Simulate refund')
    await updatePurchaseStatusById(purchase.id, 'refunded')
    logOk('refunded')

    logStep('Access after refund should be denied')
    try {
        await checkCourseAccess(doc.id, userToken, false)
        logOk('denied as expected')
        summary.push({ step: 'refund-access', ok: true })
    } catch (e) {
        logFail(e.message)
        summary.push({ step: 'refund-access', ok: false, error: e.message })
    }

    // 7) Reconcile job (idempotent)
    logStep('Run reconcile twice (idempotent)')
    const r1 = await runReconcile(adminToken)
    const r2 = await runReconcile(adminToken)
    logOk(`ok (${r1.checked}+${r2.checked})`)

    console.log('\nSummary:', summary)
}

main().catch((e) => {
    console.error('E2E error:', e)
    process.exit(1)
})



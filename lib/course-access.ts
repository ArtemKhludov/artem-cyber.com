import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database, Purchase } from '@/types'

type DbClient = SupabaseClient<Database>

 export type CourseAccessAction = 'granted' | 'reactivated' | 'revoked' | 'noop'

 export interface CourseAccessMutationResult {
   access_id: string | null
   user_id: string
   document_id: string
   action: CourseAccessAction
 }

 export interface AccessMutationOptions {
   actorId?: string | null
   actorEmail?: string | null
   source?: string | null
   metadata?: Record<string, unknown>
   reason?: string | null
 }

 type PurchaseLike = Pick<Purchase, 'id' | 'payment_method'>

 const mergeMetadata = (base: Record<string, unknown> | undefined): Record<string, unknown> | undefined => {
   if (!base) return undefined
   return Object.keys(base).length > 0 ? base : undefined
 }

 async function rpcGrantCourseAccess(
   supabase: DbClient,
   params: {
     userId?: string
     documentId?: string
     purchaseId?: string
     actorId?: string | null
     actorEmail?: string | null
     source?: string | null
     metadata?: Record<string, unknown>
     reason?: string | null
   }
 ): Promise<CourseAccessMutationResult[]> {
   if (params.purchaseId) {
     const rpcParams: Record<string, unknown> = {
       p_purchase_id: params.purchaseId,
     }

     if (params.actorId) rpcParams.p_actor_id = params.actorId
     if (params.actorEmail) rpcParams.p_actor_email = params.actorEmail
     if (params.source) rpcParams.p_source = params.source
     const metadata = mergeMetadata(params.metadata)
     if (metadata) rpcParams.p_metadata = metadata

     const { data, error } = await supabase.rpc('grant_course_access_from_purchase', rpcParams)
     if (error) throw error
     return data ?? []
   }

   if (!params.userId || !params.documentId) {
     throw new Error('userId and documentId are required to grant access')
   }

   const rpcParams: Record<string, unknown> = {
     p_user_id: params.userId,
     p_document_id: params.documentId,
   }

   if (params.actorId) rpcParams.p_actor_id = params.actorId
   if (params.actorEmail) rpcParams.p_actor_email = params.actorEmail
   if (params.source) rpcParams.p_source = params.source
   const metadata = mergeMetadata(params.metadata)
   if (metadata) rpcParams.p_metadata = metadata

   const { data, error } = await supabase.rpc('grant_course_access', rpcParams)
   if (error) throw error
   return data ?? []
 }

 async function rpcRevokeCourseAccess(
   supabase: DbClient,
   params: {
     userId?: string
     documentId?: string
     purchaseId?: string
     actorId?: string | null
     actorEmail?: string | null
     source?: string | null
     metadata?: Record<string, unknown>
     reason?: string | null
   }
 ): Promise<CourseAccessMutationResult[]> {
   if (params.purchaseId) {
     const rpcParams: Record<string, unknown> = {
       p_purchase_id: params.purchaseId,
     }

     if (params.actorId) rpcParams.p_actor_id = params.actorId
     if (params.actorEmail) rpcParams.p_actor_email = params.actorEmail
     if (params.source) rpcParams.p_source = params.source
     if (params.reason) rpcParams.p_reason = params.reason
     const metadata = mergeMetadata(params.metadata)
     if (metadata) rpcParams.p_metadata = metadata

     const { data, error } = await supabase.rpc('revoke_course_access_from_purchase', rpcParams)
     if (error) throw error
     return data ?? []
   }

   if (!params.userId || !params.documentId) {
     throw new Error('userId and documentId are required to revoke access')
   }

   const rpcParams: Record<string, unknown> = {
     p_user_id: params.userId,
     p_document_id: params.documentId,
   }

   if (params.actorId) rpcParams.p_actor_id = params.actorId
   if (params.actorEmail) rpcParams.p_actor_email = params.actorEmail
   if (params.source) rpcParams.p_source = params.source
   if (params.reason) rpcParams.p_reason = params.reason
   const metadata = mergeMetadata(params.metadata)
   if (metadata) rpcParams.p_metadata = metadata

   const { data, error } = await supabase.rpc('revoke_course_access', rpcParams)
   if (error) throw error
   return data ?? []
 }

 export async function grantCourseAccessFromPurchase(
   supabase: DbClient,
   purchase: PurchaseLike,
   options: AccessMutationOptions = {}
 ) {
   return rpcGrantCourseAccess(supabase, {
     purchaseId: purchase.id,
     actorId: options.actorId ?? null,
     actorEmail: options.actorEmail ?? null,
     source: options.source ?? purchase.payment_method ?? undefined,
     metadata: options.metadata,
   })
 }

 export async function grantCourseAccess(
   supabase: DbClient,
   args: {
     userId: string
     documentId: string
   },
   options: AccessMutationOptions = {}
 ) {
   return rpcGrantCourseAccess(supabase, {
     userId: args.userId,
     documentId: args.documentId,
     actorId: options.actorId ?? null,
     actorEmail: options.actorEmail ?? null,
     source: options.source ?? 'manual',
     metadata: options.metadata,
   })
 }

 export async function revokeCourseAccessFromPurchase(
   supabase: DbClient,
   purchase: PurchaseLike,
   options: AccessMutationOptions = {}
 ) {
   return rpcRevokeCourseAccess(supabase, {
     purchaseId: purchase.id,
     actorId: options.actorId ?? null,
     actorEmail: options.actorEmail ?? null,
     source: options.source ?? purchase.payment_method ?? undefined,
     metadata: options.metadata,
     reason: options.reason ?? null,
   })
 }

 export async function revokeCourseAccess(
   supabase: DbClient,
   args: {
     userId: string
     documentId: string
   },
   options: AccessMutationOptions = {}
 ) {
   return rpcRevokeCourseAccess(supabase, {
     userId: args.userId,
     documentId: args.documentId,
     actorId: options.actorId ?? null,
     actorEmail: options.actorEmail ?? null,
     source: options.source ?? 'manual',
     metadata: options.metadata,
     reason: options.reason ?? null,
   })
 }

 export async function syncCourseAccessByStatus(
   supabase: DbClient,
   purchases: PurchaseLike[] | null | undefined,
   status: Purchase['payment_status'],
   options: AccessMutationOptions = {}
 ) {
   if (!purchases || purchases.length === 0) return

   if (status === 'completed') {
     await Promise.all(
       purchases.map((purchase) =>
         grantCourseAccessFromPurchase(supabase, purchase, {
           ...options,
           source: options.source ?? purchase.payment_method ?? 'payment',
         })
       )
     )
     return
   }

   if (status === 'failed' || status === 'refunded') {
     const reason = options.reason ?? (status === 'refunded' ? 'payment_refunded' : 'payment_failed')
     await Promise.all(
       purchases.map((purchase) =>
         revokeCourseAccessFromPurchase(supabase, purchase, {
           ...options,
           source: options.source ?? purchase.payment_method ?? 'payment',
           reason,
         })
       )
     )
   }
 }

export async function ensureCourseAccessForUser(
  supabase: DbClient,
  userId: string,
  documentId: string
) {
   const { data: existingAccess } = await supabase
     .from('user_course_access')
     .select('id, revoked_at')
     .eq('user_id', userId)
     .eq('document_id', documentId)
     .is('revoked_at', null)
     .maybeSingle()

   if (existingAccess) {
     return existingAccess
   }

  const { data: userRow, error: userFetchError } = await supabase
    .from('users')
    .select('email')
    .eq('id', userId)
    .maybeSingle()

  if (userFetchError) {
    console.error('ensureCourseAccessForUser user fetch error', userFetchError)
  }

  const userEmail = userRow?.email?.toLowerCase() || null

  const { data: purchaseByUser, error: purchaseByUserError } = await supabase
    .from('purchases')
    .select('id, payment_method, user_id, user_email')
    .eq('document_id', documentId)
    .eq('payment_status', 'completed')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .maybeSingle()

  if (purchaseByUserError) {
    console.error('ensureCourseAccessForUser purchase (user) error', purchaseByUserError)
  }

  let purchase = purchaseByUser

  if (!purchase && userEmail) {
    const { data: purchaseByEmail, error: purchaseByEmailError } = await supabase
      .from('purchases')
      .select('id, payment_method, user_id, user_email')
      .eq('document_id', documentId)
      .eq('payment_status', 'completed')
      .eq('user_email', userEmail)
      .order('created_at', { ascending: false })
      .maybeSingle()

    if (purchaseByEmailError) {
      console.error('ensureCourseAccessForUser purchase (email) error', purchaseByEmailError)
    }

    purchase = purchaseByEmail ?? null
  }

  if (!purchase) {
    return null
  }

  if (!purchase.user_id) {
    const { error: updateError } = await supabase
      .from('purchases')
      .update({
        user_id: userId,
        user_email: purchase.user_email || userEmail || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', purchase.id)

    if (updateError) {
      console.error('ensureCourseAccessForUser purchase update error', updateError)
    }
  }

  const result = await grantCourseAccessFromPurchase(supabase, purchase, {
    source: 'auto_sync',
  })

  return result?.[0] ?? null
}

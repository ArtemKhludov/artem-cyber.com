'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
    User,
    Phone,
    Mail,
    Calendar,
    ShoppingCart,
    MessageSquare,
    DollarSign,
    Clock,
    FileText,
    BookOpen,
    Video,
    X,
    Edit,
    Plus,
    ShieldCheck,
    ShieldOff
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import AddPurchaseToUserModal from './AddPurchaseToUserModal'
import AddRequestToUserModal from './AddRequestToUserModal'
import EditRequestModal from './EditRequestModal'
import EditPurchaseModal from './EditPurchaseModal'
import GrantAccessModal from './GrantAccessModal'
import RevokeAccessModal from './RevokeAccessModal'

interface UserData {
    user: {
        id: string
        name: string
        email: string
        phone: string
        created_at: string
        last_activity: string
        total_requests: number
        total_purchases: number
        total_spent: number
        notes?: string
    }
    requests: Array<{
        id: string
        created_at: string
        product_type: string
        product_name: string
        status: string
        source_page: string
        message?: string
    }>
    purchases: Array<{
        id: string
        created_at: string
        product_name: string
        amount: number
        status: string
        payment_method: string
    }>
    accesses: Array<{
        id: string
        document_id: string
        document_title?: string
        granted_at: string
        revoked_at?: string | null
        source?: string | null
        metadata: Record<string, unknown>
    }>
}

interface UserCardProps {
    userId: string
    isOpen: boolean
    onClose: () => void
}

export default function UserCard({ userId, isOpen, onClose }: UserCardProps) {
    const [userData, setUserData] = useState<UserData | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'overview' | 'requests' | 'purchases' | 'access'>('overview')
    const [showAddPurchaseModal, setShowAddPurchaseModal] = useState(false)
    const [showAddRequestModal, setShowAddRequestModal] = useState(false)
    const [showEditRequestModal, setShowEditRequestModal] = useState(false)
    const [showEditPurchaseModal, setShowEditPurchaseModal] = useState(false)
    const [selectedRequest, setSelectedRequest] = useState<any>(null)
    const [selectedPurchase, setSelectedPurchase] = useState<any>(null)
    const [showGrantAccessModal, setShowGrantAccessModal] = useState(false)
    const [grantAccessDocumentId, setGrantAccessDocumentId] = useState<string | undefined>(undefined)
    const [revokeAccessState, setRevokeAccessState] = useState<{ documentId: string } | null>(null)

    const activeAccessCount = userData?.accesses?.filter((access) => !access.revoked_at).length ?? 0

    useEffect(() => {
        if (isOpen && userId) {
            fetchUserData()
        }
    }, [isOpen, userId])

    const fetchUserData = async () => {
        try {
            setLoading(true)
            const response = await fetch(`/api/users/${userId}`)
            const result = await response.json()

            if (result.success) {
                setUserData(result.data)
            } else {
                console.error('Error fetching user data:', result.error)
            }
        } catch (error) {
            console.error('Error fetching user data:', error)
        } finally {
            setLoading(false)
        }
    }

    const getProductIcon = (productType: string) => {
        switch (productType) {
            case 'pdf':
                return <FileText className="w-4 h-4 text-blue-500" />
            case 'program':
            case 'course':
                return <BookOpen className="w-4 h-4 text-green-500" />
            case 'consultation':
                return <Video className="w-4 h-4 text-purple-500" />
            default:
                return <MessageSquare className="w-4 h-4 text-gray-500" />
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'new':
                return 'bg-blue-100 text-blue-800'
            case 'completed':
                return 'bg-green-100 text-green-800'
            case 'pending':
                return 'bg-yellow-100 text-yellow-800'
            case 'cancelled':
                return 'bg-red-100 text-red-800'
            default:
                return 'bg-gray-100 text-gray-800'
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    const handleAddPurchaseSuccess = () => {
        fetchUserData() // Update user data
    }

    const handleAddRequestSuccess = () => {
        fetchUserData() // Update user data
    }

    const handleEditRequestSuccess = () => {
        fetchUserData() // Update user data
    }

    const handleEditPurchaseSuccess = () => {
        fetchUserData() // Update user data
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center space-x-4">
                            <div className="w-16 h-16 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                                <User className="w-8 h-8" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">
                                    {userData?.user.name || 'Loading...'}
                                </h2>
                                <p className="text-blue-100">
                                    {userData?.user.phone || ''}
                                </p>
                                {userData?.user.email && (
                                    <p className="text-blue-100 text-sm">
                                        {userData.user.email}
                                    </p>
                                )}
                            </div>
                        </div>
                        <Button
                            onClick={onClose}
                            variant="ghost"
                            size="sm"
                            className="text-white hover:bg-white hover:bg-opacity-20"
                        >
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200">
                    <nav className="flex space-x-8 px-6">
                        {[
                            { id: 'overview', label: 'Overview', icon: User },
                            { id: 'requests', label: `Requests (${userData?.requests.length || 0})`, icon: MessageSquare },
                            { id: 'purchases', label: `Purchases (${userData?.purchases.length || 0})`, icon: ShoppingCart },
                            { id: 'access', label: `Access (${activeAccessCount})`, icon: ShieldCheck }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-2 text-gray-600">Loading user data...</span>
                        </div>
                    ) : (
                        <>
                            {activeTab === 'overview' && userData && (
                                <div className="space-y-6">
                                    {/* Statistics */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="bg-blue-50 rounded-lg p-4">
                                            <div className="flex items-center">
                                                <MessageSquare className="w-8 h-8 text-blue-600 mr-3" />
                                                <div>
                                                    <p className="text-sm text-gray-600">Total Requests</p>
                                                    <p className="text-2xl font-bold text-blue-600">
                                                        {userData.user.total_requests}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-green-50 rounded-lg p-4">
                                            <div className="flex items-center">
                                                <ShoppingCart className="w-8 h-8 text-green-600 mr-3" />
                                                <div>
                                                    <p className="text-sm text-gray-600">Total Purchases</p>
                                                    <p className="text-2xl font-bold text-green-600">
                                                        {userData.user.total_purchases}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-purple-50 rounded-lg p-4">
                                            <div className="flex items-center">
                                                <DollarSign className="w-8 h-8 text-purple-600 mr-3" />
                                                <div>
                                                    <p className="text-sm text-gray-600">Spent</p>
                                                    <p className="text-2xl font-bold text-purple-600">
                                                        {userData.user.total_spent} ₽
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* User Information */}
                                    <div className="bg-gray-50 rounded-lg p-6">
                                        <h3 className="text-lg font-semibold mb-4">User Information</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="flex items-center space-x-3">
                                                <Calendar className="w-5 h-5 text-gray-400" />
                                                <div>
                                                    <p className="text-sm text-gray-600">Registration Date</p>
                                                    <p className="font-medium">{formatDate(userData.user.created_at)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-3">
                                                <Clock className="w-5 h-5 text-gray-400" />
                                                <div>
                                                    <p className="text-sm text-gray-600">Last Activity</p>
                                                    <p className="font-medium">{formatDate(userData.user.last_activity)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Recent Activity */}
                                    <div className="bg-white border rounded-lg p-6">
                                        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                                        <div className="space-y-3">
                                            {[...userData.requests, ...userData.purchases]
                                                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                                .slice(0, 5)
                                                .map((activity, index) => (
                                                    <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                                                        {'amount' in activity ? (
                                                            <>
                                                                <ShoppingCart className="w-5 h-5 text-green-600" />
                                                                <div className="flex-1">
                                                                    <p className="font-medium">Purchase: {activity.product_name}</p>
                                                                    <p className="text-sm text-gray-600">
                                                                        {formatDate(activity.created_at)} • {activity.amount} ₽ • {activity.payment_method}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500">
                                                                        Status: {activity.status}
                                                                    </p>
                                                                </div>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <MessageSquare className="w-5 h-5 text-blue-600" />
                                                                <div className="flex-1">
                                                                    <p className="font-medium">
                                                                        {activity.product_type === 'callback' ? 'Callback Request' : `Request: ${activity.product_name}`}
                                                                    </p>
                                                                    <p className="text-sm text-gray-600">
                                                                        {formatDate(activity.created_at)} • {activity.source_page}
                                                                    </p>
                                                                    {activity.message && (
                                                                        <p className="text-xs text-gray-500">
                                                                            Message: {activity.message}
                                                                        </p>
                                                                    )}
                                                                    <p className="text-xs text-gray-500">
                                                                        Status: {activity.status}
                                                                    </p>
                                                                </div>
                                                            </>
                                                        )}
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'requests' && userData && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-semibold">Request History</h3>
                                        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Request
                                        </Button>
                                    </div>
                                    {userData.requests.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                            <p>User has no requests yet</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {userData.requests.map((request) => (
                                                <div key={request.id} className="border rounded-lg p-4 hover:bg-gray-50">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-start space-x-3">
                                                            {getProductIcon(request.product_type)}
                                                            <div className="flex-1">
                                                                <p className="font-medium">
                                                                    {request.product_type === 'callback' ? 'Callback Request' : request.product_name}
                                                                </p>
                                                                <p className="text-sm text-gray-600">
                                                                    {formatDate(request.created_at)} • {request.source_page}
                                                                </p>
                                                                {request.message && (
                                                                    <p className="text-sm text-gray-500 mt-1">{request.message}</p>
                                                                )}
                                                                <p className="text-xs text-gray-400 mt-1">
                                                                    Type: {request.product_type} • Product: {request.product_name}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end space-y-2">
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                                                                {request.status}
                                                            </span>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="text-xs"
                                                                onClick={() => {
                                                                    setSelectedRequest(request)
                                                                    setShowEditRequestModal(true)
                                                                }}
                                                            >
                                                                <Edit className="w-3 h-3 mr-1" />
                                                                Edit
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'purchases' && userData && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-semibold">Purchase History</h3>
                                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                            <Plus className="w-4 h-4 mr-2" />
                                            Add Purchase
                                        </Button>
                                    </div>
                                    {userData.purchases.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                            <p>User has no purchases yet</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {userData.purchases.map((purchase) => (
                                                <div key={purchase.id} className="border rounded-lg p-4 hover:bg-gray-50">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex items-start space-x-3">
                                                            <ShoppingCart className="w-5 h-5 text-green-600" />
                                                            <div className="flex-1">
                                                                <p className="font-medium">{purchase.product_name}</p>
                                                                <p className="text-sm text-gray-600">
                                                                    {formatDate(purchase.created_at)} • {purchase.payment_method}
                                                                </p>
                                                                <p className="text-xs text-gray-400 mt-1">
                                                                    ID: {purchase.id}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-col items-end space-y-2">
                                                            <p className="font-semibold text-green-600">{purchase.amount} ₽</p>
                                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(purchase.status)}`}>
                                                                {purchase.status}
                                                            </span>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="text-xs"
                                                                onClick={() => {
                                                                    setSelectedPurchase(purchase)
                                                                    setShowEditPurchaseModal(true)
                                                                }}
                                                            >
                                                                <Edit className="w-3 h-3 mr-1" />
                                                                Edit
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {activeTab === 'access' && userData && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-lg font-semibold">Course Access</h3>
                                        <Button
                                            size="sm"
                                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                            onClick={() => {
                                                setGrantAccessDocumentId(undefined)
                                                setShowGrantAccessModal(true)
                                            }}
                                        >
                                            <ShieldCheck className="w-4 h-4 mr-2" />
                                            Grant Access
                                        </Button>
                                    </div>

                                    {/* CSV Export */}
                                    <div>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                try {
                                                    const headers = ['ID', 'Course', 'Granted', 'Revoked', 'Source', 'Reason', 'Comment']
                                                    const rows = (userData.accesses || []).map((a) => {
                                                        const meta = (a.metadata || {}) as Record<string, unknown>
                                                        const reason = (meta.reason as string) || ''
                                                        const notes = (meta.notes as string) || ''
                                                        return [
                                                            a.id,
                                                            a.document_title || a.document_id,
                                                            new Date(a.granted_at).toLocaleString('en-US'),
                                                            a.revoked_at ? new Date(a.revoked_at).toLocaleString('en-US') : '',
                                                            a.source || '',
                                                            reason,
                                                            (notes || '').replace(/\n|\r/g, ' ')
                                                        ].join(',')
                                                    })
                                                    const csv = [headers.join(','), ...rows].join('\n')
                                                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
                                                    const link = document.createElement('a')
                                                    const url = URL.createObjectURL(blob)
                                                    link.setAttribute('href', url)
                                                    link.setAttribute('download', `access_${userData.user.id}_${new Date().toISOString().split('T')[0]}.csv`)
                                                    link.style.visibility = 'hidden'
                                                    document.body.appendChild(link)
                                                    link.click()
                                                    document.body.removeChild(link)
                                                } catch (e) {
                                                    // no-op
                                                }
                                            }}
                                        >
                                            Export CSV
                                        </Button>
                                    </div>

                                    {userData.accesses.length === 0 ? (
                                        <div className="text-center py-8 text-gray-500">
                                            <ShieldOff className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                                            <p>No active access</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {userData.accesses.map((access) => {
                                                const isActive = !access.revoked_at
                                                const meta = (access.metadata || {}) as Record<string, unknown>
                                                const reason = (meta.reason as string) || undefined
                                                const notes = (meta.notes as string) || undefined
                                                return (
                                                    <div key={access.id} className="border rounded-lg p-4 hover:bg-gray-50">
                                                        <div className="flex items-start justify-between">
                                                            <div className="flex items-start space-x-3">
                                                                {isActive ? (
                                                                    <ShieldCheck className="w-5 h-5 text-green-600" />
                                                                ) : (
                                                                    <ShieldOff className="w-5 h-5 text-red-500" />
                                                                )}
                                                                <div className="flex-1">
                                                                    <p className="font-medium">{access.document_title || 'Course'}</p>
                                                                    <p className="text-sm text-gray-600">
                                                                        Granted: {formatDate(access.granted_at)}
                                                                        {access.source ? ` • ${access.source}` : ''}
                                                                    </p>
                                                                    {access.revoked_at && (
                                                                        <p className="text-sm text-red-500">
                                                                            Revoked: {formatDate(access.revoked_at)}
                                                                        </p>
                                                                    )}
                                                                    {(reason || notes) && (
                                                                        <p className="text-xs text-gray-500 mt-1">
                                                                            {reason ? `Reason: ${reason}` : ''}
                                                                            {reason && notes ? ' • ' : ''}
                                                                            {notes ? `Comment: ${notes}` : ''}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="flex flex-col items-end space-y-2">
                                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                                                                    {isActive ? 'Active' : 'Revoked'}
                                                                </span>
                                                                <Link
                                                                    href={`/courses/${access.document_id}`}
                                                                    className="text-xs px-2 py-1 border rounded-md text-blue-600 border-blue-200 hover:bg-blue-50"
                                                                >
                                                                    Open Course
                                                                </Link>
                                                                {isActive ? (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="text-xs"
                                                                        onClick={() => {
                                                                            setRevokeAccessState({ documentId: access.document_id })
                                                                        }}
                                                                    >
                                                                        <ShieldOff className="w-3 h-3 mr-1" />
                                                                        Revoke
                                                                    </Button>
                                                                ) : (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="text-xs"
                                                                        onClick={() => {
                                                                            setGrantAccessDocumentId(access.document_id)
                                                                            setShowGrantAccessModal(true)
                                                                        }}
                                                                    >
                                                                        <ShieldCheck className="w-3 h-3 mr-1" />
                                                                        Grant Again
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Add Purchase Modal */}
            {userData && (
                <AddPurchaseToUserModal
                    isOpen={showAddPurchaseModal}
                    onClose={() => setShowAddPurchaseModal(false)}
                    userId={userData.user.id}
                    userName={userData.user.name}
                    onSuccess={handleAddPurchaseSuccess}
                />
            )}

            {/* Add Request Modal */}
            {userData && (
                <AddRequestToUserModal
                    isOpen={showAddRequestModal}
                    onClose={() => setShowAddRequestModal(false)}
                    userId={userData.user.id}
                    userName={userData.user.name}
                    userPhone={userData.user.phone}
                    userEmail={userData.user.email || ''}
                    onSuccess={handleAddRequestSuccess}
                />
            )}

            {/* Edit Request Modal */}
            {selectedRequest && (
                <EditRequestModal
                    isOpen={showEditRequestModal}
                    onClose={() => {
                        setShowEditRequestModal(false)
                        setSelectedRequest(null)
                    }}
                    request={selectedRequest}
                    onSuccess={handleEditRequestSuccess}
                />
            )}

            {/* Edit Purchase Modal */}
            {selectedPurchase && (
                <EditPurchaseModal
                    isOpen={showEditPurchaseModal}
                    onClose={() => {
                        setShowEditPurchaseModal(false)
                        setSelectedPurchase(null)
                    }}
                    purchase={selectedPurchase}
                    onSuccess={handleEditPurchaseSuccess}
                />
            )}

            {/* Grant Access Modal */}
            {userData && (
                <GrantAccessModal
                    isOpen={showGrantAccessModal}
                    onClose={() => {
                        setShowGrantAccessModal(false)
                        setGrantAccessDocumentId(undefined)
                    }}
                    defaultEmail={userData.user.email}
                    defaultUserId={userData.user.id}
                    defaultDocumentId={grantAccessDocumentId}
                    onSuccess={() => {
                        setShowGrantAccessModal(false)
                        fetchUserData()
                    }}
                />
            )}

            {/* Revoke Access Modal */}
            {userData && revokeAccessState && (
                <RevokeAccessModal
                    isOpen={true}
                    onClose={() => setRevokeAccessState(null)}
                    defaultEmail={userData.user.email}
                    defaultUserId={userData.user.id}
                    defaultDocumentId={revokeAccessState.documentId}
                    onSuccess={() => {
                        setRevokeAccessState(null)
                        fetchUserData()
                    }}
                />
            )}
        </div>
    )
}

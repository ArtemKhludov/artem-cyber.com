"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { MainLayout } from "@/components/layout/MainLayout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Download, PlayCircle } from "lucide-react"
import { initPostHog } from "@/lib/posthog"

type PurchaseStatus =
  | "completed"
  | "active"
  | "in_progress"
  | "pending"
  | "expired"
  | "revoked"
  | "failed"

interface PurchaseRow {
  id: string
  product_name: string
  product_type: "mini_course" | "pdf" | "session"
  price: number
  status: PurchaseStatus
  payment_status?: "completed" | "pending" | "failed" | "requires_action"
  created_at: string
  document?: {
    id: string
    title: string
    description?: string
    course_type?: "pdf" | "mini_course"
  }
  receipt_url?: string | null
}

const PURCHASE_STATUS_META: Record<PurchaseStatus, { label: string; badgeClass: string; allowActions: boolean } > = {
  completed: { label: "Completed", badgeClass: "bg-green-100 text-green-800", allowActions: true },
  active: { label: "Active", badgeClass: "bg-emerald-100 text-emerald-800", allowActions: true },
  in_progress: { label: "Processing", badgeClass: "bg-blue-100 text-blue-800", allowActions: false },
  pending: { label: "Awaiting payment", badgeClass: "bg-yellow-100 text-yellow-800", allowActions: false },
  expired: { label: "Access expired", badgeClass: "bg-orange-100 text-orange-800", allowActions: false },
  revoked: { label: "Access revoked", badgeClass: "bg-red-100 text-red-800", allowActions: false },
  failed: { label: "Payment failed", badgeClass: "bg-rose-100 text-rose-800", allowActions: false }
}

export default function PurchasesPage() {
  const { user } = useAuth()
  const [purchases, setPurchases] = useState<PurchaseRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilterValue, setStatusFilterValue] = useState<"all" | PurchaseStatus>("all")

  useEffect(() => {
    if (!user) return
    void loadData()
  }, [user])

  const track = (event: string, props?: Record<string, unknown>) => {
    const ph = initPostHog()
    ph?.capture(event, props)
  }

  const loadData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const res = await fetch("/api/user/dashboard", { credentials: "include" })
      if (!res.ok) {
        throw new Error("Failed to fetch purchases")
      }
      const data = await res.json()
      setPurchases(data.purchases || [])
    } catch (e) {
      setError("Could not load purchases. Please try again later.")
    } finally {
      setIsLoading(false)
    }
  }

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return (purchases || []).filter((p) => {
      const matchesStatus = statusFilterValue === "all" || (p.status as string) === statusFilterValue
      if (!matchesStatus) return false
      if (!q) return true
      const tokens = [p.product_name, p.id, p.document?.title, p.document?.description]
        .filter(Boolean)
        .map((t) => String(t).toLowerCase())
      return tokens.some((t) => t.includes(q))
    })
  }, [purchases, searchTerm, statusFilterValue])

  const filteredTotal = useMemo(() => filtered.reduce((sum, p) => sum + (p.price || 0), 0), [filtered])

  const handleExport = () => {
    if (filtered.length === 0) return
    const header = ["ID", "Name", "Type", "Status", "Date", "Amount"]
    const rows = filtered.map((p) => [
      p.id,
      p.product_name,
      p.product_type,
      PURCHASE_STATUS_META[p.status].label,
      new Date(p.created_at).toLocaleDateString("en-US"),
      (p.price || 0).toFixed(2)
    ])
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `energylogic-purchases-${new Date().toISOString().slice(0,10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    track("purchases_export", { count: filtered.length })
  }

  const handleOpen = (p: PurchaseRow) => {
    track("purchase_open_click", { id: p.id, type: p.product_type })
    // persist Recently Viewed
    try {
      const key = "el_recently_viewed"
      const prev = JSON.parse(localStorage.getItem(key) || "[]") as any[]
      const item = {
        id: p.document?.id || p.id,
        title: p.product_name,
        type: p.product_type,
        href: p.product_type === "session" ? `/download/${p.id}` : p.document?.id ? `/courses/${p.document.id}/player` : undefined,
        ts: Date.now()
      }
      const next = [item, ...prev.filter((x) => x.href !== item.href)].slice(0, 12)
      localStorage.setItem(key, JSON.stringify(next))
    } catch {}
  }

  const handleReceipt = (p: PurchaseRow) => {
    track("purchase_receipt_click", { id: p.id })
    if (p.receipt_url) {
      window.open(p.receipt_url, "_blank", "noopener,noreferrer")
    } else {
      const subject = `Receipt request for purchase ${p.product_name}`
      const body = `Please send the receipt for purchase ${p.product_name} (ID ${p.id}).`
      window.location.href = `mailto:support@energylogic.ai?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    }
  }

  return (
    <MainLayout>
          <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900">My purchases</h1>
            <p className="text-gray-600">Filters, export, and quick actions</p>
          </div>

          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-4">
            <div className="flex w-full flex-col gap-3 md:flex-row md:items-end md:gap-4">
              <div className="w-full md:w-72">
                <label htmlFor="purchases-search" className="mb-1 block text-sm font-medium text-gray-600">Search</label>
                <Input id="purchases-search" placeholder="Name, course, or ID" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <div className="w-full md:w-56">
                <label htmlFor="purchases-status" className="mb-1 block text-sm font-medium text-gray-600">Status</label>
                <select
                  id="purchases-status"
                  className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={statusFilterValue}
                  onChange={(e) => setStatusFilterValue(e.target.value as any)}
                >
                  <option value="all">All statuses</option>
                  {Object.entries(PURCHASE_STATUS_META).map(([key, meta]) => (
                    <option key={key} value={key}>{meta.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="text-sm text-gray-600 md:text-right">
              <div>Selected {filtered.length} · {new Intl.NumberFormat("en-US", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(filteredTotal)}</div>
              <div className="mt-2">
                <Button size="sm" variant="outline" onClick={handleExport} disabled={filtered.length === 0}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`row-skel-${i}`} className="animate-pulse">
                      <TableCell colSpan={6}>
                        <div className="h-4 w-2/3 rounded bg-gray-200" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filtered.length > 0 ? (
                  filtered.map((p) => {
                    const meta = PURCHASE_STATUS_META[p.status]
                    const openHref = p.product_type === "session"
                      ? `/download/${p.id}`
                      : p.document?.id
                        ? `/courses/${p.document.id}/player`
                        : undefined
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium text-gray-900">
                          <div className="flex flex-col">
                            <span>{p.product_name}</span>
                            <span className="text-xs text-gray-500">ID: {p.id}</span>
                          </div>
                        </TableCell>
                        <TableCell>{p.product_type === "mini_course" ? "Mini-course" : p.product_type === "pdf" ? "Course" : "Session"}</TableCell>
                        <TableCell><Badge className={meta.badgeClass}>{meta.label}</Badge></TableCell>
                        <TableCell>{new Date(p.created_at).toLocaleDateString("en-US")}</TableCell>
                        <TableCell>{(p.price || 0).toLocaleString("en-US")} ₽</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {meta.allowActions && openHref ? (
                              <Button size="sm" variant="outline" asChild>
                                <a href={openHref} onClick={() => handleOpen(p)}>
                                  <PlayCircle className="h-4 w-4 mr-2" />
                                  Open
                                </a>
                              </Button>
                            ) : (
                              <Button size="sm" variant="outline" disabled>
                                Open
                              </Button>
                            )}
                            <Button size="sm" variant="ghost" onClick={() => handleReceipt(p)}>Receipt</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="py-6 text-center text-sm text-gray-500">
                      No purchases found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

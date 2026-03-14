"use client"

import { useState, useEffect } from "react"
import { Building, CreditCard, DollarSign, Filter } from "lucide-react"
import { createClient } from "@/utils/supabase/component"
import type { BankNames } from "@/types/database"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRole } from "@/components/role-provider"

type BankAccount = {
  id: string
  bankName: string
  accountName: string
  accountNumber: string
  accountType: string
  balance: number
  currency: string
  status: "active" | "inactive"
  branch: string
  swiftCode?: string
  routingNumber?: string
}

type Transaction = {
  id: string
  date: string
  time: string
  bankName: string
  method: string
  amount: number
  description: string
  status: "completed" | "pending" | "failed"
  accountId: string
  imei: string
}

export function BankInfoClient() {
  const supabase = createClient()
  const { hasPermission, organization } = useRole()
  const organizationId = organization?.id || null

  const [filterBankName, setFilterBankName] = useState("all")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [bankNames, setBankNames] = useState<BankNames>({})

  // Fetch transactions from Supabase sales table
  useEffect(() => {
    async function fetchBankTransactions() {
      setLoading(true)
      try {
        // Fetch org's bank_names config
        let configuredBankNames: BankNames = {}
        if (organizationId) {
          const { data: orgData } = await supabase
            .from('organizations')
            .select('bank_names')
            .eq('id', organizationId)
            .single()
          if (orgData && (orgData as any).bank_names) {
            configuredBankNames = (orgData as any).bank_names as BankNames
          }
        }
        setBankNames(configuredBankNames)

        let query = supabase
          .from('sales')
          .select('*')
          .eq('status', 'completed')
          .order('created_at', { ascending: false })

        if (organizationId) {
          query = query.eq('organization_id', organizationId)
        }

        const { data: sales, error } = await query

        if (error) {
          console.error('Error fetching sales:', error)
          setTransactions([])
          return
        }

        // Transform sales data into transactions
        const newTransactions: Transaction[] = []

        sales?.forEach((sale) => {
          // Use created_at for date and time
          const saleDate = new Date(sale.created_at)
          const date = saleDate.toISOString().split('T')[0]
          const time = saleDate.toTimeString().slice(0, 5)

          // bKash transactions
          if (sale.bkash_received > 0) {
            newTransactions.push({
              id: `TXN-BKASH-${sale.id}`,
              date,
              time,
              bankName: configuredBankNames.bkash || 'BRAC Bank Limited',
              method: 'bKash',
              amount: sale.bkash_received,
              description: `Sale payment via bKash - Invoice ${sale.invoice_number}`,
              status: 'completed',
              accountId: 'BANK-002',
              imei: sale.id.toString()
            })
          }

          // Nagad transactions
          if (sale.nagad_received > 0) {
            newTransactions.push({
              id: `TXN-NAGAD-${sale.id}`,
              date,
              time,
              bankName: configuredBankNames.nagad || 'BRAC Bank Limited',
              method: 'Nagad',
              amount: sale.nagad_received,
              description: `Sale payment via Nagad - Invoice ${sale.invoice_number}`,
              status: 'completed',
              accountId: 'BANK-002',
              imei: sale.id.toString()
            })
          }

          // Rocket transactions
          if (sale.rocket_received > 0) {
            newTransactions.push({
              id: `TXN-ROCKET-${sale.id}`,
              date,
              time,
              bankName: configuredBankNames.rocket || 'Dutch-Bangla Bank Limited',
              method: 'Rocket',
              amount: sale.rocket_received,
              description: `Sale payment via Rocket - Invoice ${sale.invoice_number}`,
              status: 'completed',
              accountId: 'BANK-001',
              imei: sale.id.toString()
            })
          }

          // Upay transactions
          if (sale.upay_received > 0) {
            newTransactions.push({
              id: `TXN-UPAY-${sale.id}`,
              date,
              time,
              bankName: configuredBankNames.upay || 'UCB Bank',
              method: 'Upay',
              amount: sale.upay_received,
              description: `Sale payment via Upay - Invoice ${sale.invoice_number}`,
              status: 'completed',
              accountId: 'BANK-003',
              imei: sale.id.toString()
            })
          }

          // Card transactions — org setting overrides POS-entered bank, else use sale's card_bank
          if (sale.card_received > 0) {
            newTransactions.push({
              id: `TXN-CARD-${sale.id}`,
              date,
              time,
              bankName: configuredBankNames.card || sale.card_bank || 'Unknown Bank',
              method: 'Card Payment',
              amount: sale.card_received,
              description: `Card payment - Invoice ${sale.invoice_number}`,
              status: 'completed',
              accountId: 'BANK-001',
              imei: sale.id.toString()
            })
          }

          // Bank transfer transactions — org setting overrides POS-entered bank
          if (sale.bank_transfer_received > 0) {
            newTransactions.push({
              id: `TXN-TRANSFER-${sale.id}`,
              date,
              time,
              bankName: configuredBankNames.bank_transfer || sale.bank_transfer_bank || 'Unknown Bank',
              method: 'Bank Transfer',
              amount: sale.bank_transfer_received,
              description: `Bank transfer - Invoice ${sale.invoice_number}`,
              status: 'completed',
              accountId: 'BANK-001',
              imei: sale.id.toString()
            })
          }
        })

        setTransactions(newTransactions)
      } catch (error) {
        console.error('Error processing transactions:', error)
        setTransactions([])
      } finally {
        setLoading(false)
      }
    }

    fetchBankTransactions()
  }, [supabase, organizationId])

  const filteredTransactions = transactions.filter((transaction) => {
    const matchesBankName = filterBankName === "all" || transaction.bankName === filterBankName

    // Date range filter
    let matchesDateRange = true
    if (startDate || endDate) {
      const transactionDate = transaction.date
      if (startDate && transactionDate < startDate) {
        matchesDateRange = false
      }
      if (endDate && transactionDate > endDate) {
        matchesDateRange = false
      }
    }

    return matchesBankName && matchesDateRange
  })

  // Calculate total amount from filtered transactions
  const totalAmount = filteredTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>
      case "failed":
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getBankIcon = (method: string) => {
    if (method.toLowerCase().includes("card")) {
      return <CreditCard className="h-4 w-4 text-blue-600" />
    } else if (["bkash", "nagad", "rocket", "upay"].some(m => method.toLowerCase().includes(m))) {
      return <DollarSign className="h-4 w-4 text-green-600" />
    } else {
      return <Building className="h-4 w-4 text-purple-600" />
    }
  }

  // Get unique bank names for filter
  const uniqueBankNames = Array.from(new Set(transactions.map(t => t.bankName))).sort()

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bank Information</h1>
          <p className="text-muted-foreground">
            Track all non-cash transactions from completed sales
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Filter className="mr-2 h-5 w-5" />
              Transaction Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="filter-bank-name">Bank Name</Label>
                <Select value={filterBankName} onValueChange={setFilterBankName}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Banks" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Banks</SelectItem>
                    {uniqueBankNames.map((bankName) => (
                      <SelectItem key={bankName} value={bankName}>
                        {bankName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
            <CardDescription>
              Total amount for selected filters
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Bank Deposits</p>
                <p className="text-3xl font-bold text-green-600">৳{totalAmount.toLocaleString()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Transactions</p>
                <p className="text-2xl font-semibold">{filteredTransactions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Non-Cash Transactions</CardTitle>
            <CardDescription>
              All card, mobile banking, and bank transfer transactions from completed sales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Bank Name</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Voucher</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Loading transactions...
                    </TableCell>
                  </TableRow>
                ) : filteredTransactions.length > 0 ? (
                  filteredTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{transaction.date}</p>
                          <p className="text-sm text-muted-foreground">{transaction.time}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getBankIcon(transaction.method)}
                          <span>{transaction.bankName}</span>
                        </div>
                      </TableCell>
                      <TableCell>{transaction.method}</TableCell>
                      <TableCell className="font-medium">৳{transaction.amount.toLocaleString()}</TableCell>
                      <TableCell className="max-w-48 truncate">{transaction.description}</TableCell>
                      <TableCell className="font-mono text-sm">{transaction.imei}</TableCell>
                      <TableCell>{getStatusBadge(transaction.status)}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No transactions found matching your criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

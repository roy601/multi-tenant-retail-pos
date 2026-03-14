"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/component"
import { Download, Filter, Plus, Search, Users, Edit, Eye, Trash2, Phone, Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import { CustomerSearch } from "./customer-search"
import { useRole } from "@/components/role-provider"

const supabase = createClient()

type DbCustomer = {
  id: number
  name: string
  phone_number?: string | null
  email?: string | null
  address?: string | null
  dues?: number | null
  created_at?: string | null
  updated_at?: string | null
  // optional / future fields - will be undefined if not present in table
  total_spent?: number | null
  orders?: number | null
  last_purchase?: string | null
  status?: string | null
  avatar?: string | null
  date_joined?: string | null
  notes?: string | null
}

export function CustomerClient() {
  const { organization } = useRole()
  const [searchTerm, setSearchTerm] = useState("")
  const [customers, setCustomers] = useState<DbCustomer[]>([])
  const [loading, setLoading] = useState(false)
  const organizationId = organization?.id || null

  useEffect(() => {
    if (organizationId) {
      fetchCustomers()
    }
  }, [organizationId])

  const [selectedCustomer, setSelectedCustomer] = useState<DbCustomer | null>(null)
  const [showCustomerDetails, setShowCustomerDetails] = useState(false)
  const [showAddCustomer, setShowAddCustomer] = useState(false)
  const [showEditCustomer, setShowEditCustomer] = useState(false)
  const [showSearchCustomerDialog, setShowSearchCustomerDialog] = useState(false)

  // add form state
  const [addName, setAddName] = useState("")
  const [addPhone, setAddPhone] = useState("")
  const [addEmail, setAddEmail] = useState("")
  const [addAddress, setAddAddress] = useState("")
  // edit form state
  const [editName, setEditName] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editAddress, setEditAddress] = useState("")

  // fetch customers (basic search if `q` provided)
  const fetchCustomers = async (q = "") => {
    try {
      setLoading(true)
      let query = supabase
        .from("customers")
        .select("*")
        .eq('organization_id', organizationId)
      
      if (q) {
        // search against name, email, phone_number
        query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%,phone_number.ilike.%${q}%`)
      }
      const { data, error } = await query.order("name", { ascending: true }).limit(100)
      if (error) throw error
      setCustomers((data as DbCustomer[]) ?? [])
    } catch (err) {
      console.error("fetchCustomers error:", err)
      alert("Failed to load customers.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    // reactive search (you can debounce later)
    fetchCustomers(searchTerm)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm])

  const handleViewCustomer = (customer: DbCustomer) => {
    setSelectedCustomer(customer)
    setShowCustomerDetails(true)
  }

  const openEditFor = (customer: DbCustomer) => {
    setSelectedCustomer(customer)
    setEditName(customer.name)
    setEditPhone(customer.phone_number ?? "")
    setEditEmail(customer.email ?? "")
    setEditAddress(customer.address ?? "")
    setShowEditCustomer(true)
  }

  const handleDeleteCustomer = async (customer: DbCustomer) => {
    if (!confirm(`Are you sure you want to delete ${customer.name}?`)) return
    try {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", customer.id)
        .eq("organization_id", organizationId)
      if (error) throw error
      setCustomers((prev) => prev.filter((c) => c.id !== customer.id))
      alert("Customer deleted successfully!")
    } catch (err) {
      console.error("delete customer error:", err)
      alert("Failed to delete customer.")
    }
  }

  const handleCallCustomer = (phone?: string | null) => {
    if (!phone) return alert("No phone number available")
    window.open(`tel:${phone}`)
  }

  const handleEmailCustomer = (email?: string | null) => {
    if (!email) return alert("No email available")
    window.open(`mailto:${email}`)
  }

  const handleExportData = async () => {
    // very simple CSV export from current state
    const header = ["id", "name", "phone_number", "email", "address", "dues", "created_at"]
    const rows = customers.map((c) =>
      header.map((h) => JSON.stringify((c as any)[h] ?? "")).join(","),
    )
    const csv = [header.join(","), ...rows].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `customers-${new Date().toISOString()}.csv`
    a.click()
    URL.revokeObjectURL(url)
    alert("Exported customers.csv")
  }

  const totalCustomers = customers.length
  // Use `dues` column for the "Average Purchase" card if `total_spent` missing
  const averagePurchase =
    customers.length > 0
      ? customers.reduce((s, c) => s + (Number(c.dues ?? c.total_spent ?? 0) || 0), 0) / customers.length
      : 0
  const totalRevenue = customers.reduce((s, c) => s + (Number(c.dues ?? c.total_spent ?? 0) || 0), 0)

  // Add new customer (maps to your customers table columns)
  const handleAddCustomer = async () => {
    if (!addName.trim() || !addPhone.trim()) {
      alert("Name and phone are required.")
      return
    }

    if (!organizationId) {
      alert("Organization ID not found. Please log in again.")
      return
    }

    try {
      const payload = {
        organization_id: organizationId,
        name: addName.trim(),
        phone_number: addPhone.trim(),
        email: addEmail?.trim() || null,
        address: addAddress?.trim() || null,
        dues: 0,
      }
      const { data, error } = await supabase
        .from("customers")
        .insert([payload])
        .select()
        .single()
      if (error) {
        // unique phone error or others will surface here
        console.error("insert error:", error)
        alert(`Failed to add customer: ${error.message}`)
        return
      }
      setCustomers((prev) => [data as DbCustomer, ...prev])
      setShowAddCustomer(false)
      setAddName("")
      setAddPhone("")
      setAddEmail("")
      setAddAddress("")
      alert("Customer added successfully")
    } catch (err) {
      console.error("handleAddCustomer error:", err)
      alert("Unexpected error adding customer.")
    }
  }

  // Update existing customer
  const handleSaveEditCustomer = async () => {
    if (!selectedCustomer) return
    if (!editName.trim() || !editPhone.trim()) {
      alert("Name and phone are required.")
      return
    }
    try {
      const updates = {
        name: editName.trim(),
        phone_number: editPhone.trim(),
        email: editEmail?.trim() || null,
        address: editAddress?.trim() || null,
        updated_at: new Date().toISOString(),
      }
      const { data, error } = await supabase
        .from("customers")
        .update(updates)
        .eq("id", selectedCustomer.id)
        .eq("organization_id", organizationId)
        .select()
        .single()
      if (error) throw error
      setCustomers((prev) => prev.map((c) => (c.id === data.id ? (data as DbCustomer) : c)))
      setShowEditCustomer(false)
      alert("Customer updated successfully")
    } catch (err) {
      console.error("update customer error:", err)
      alert("Failed to update customer.")
    }
  }

  const handleSelectFromSearch = (customer: DbCustomer) => {
    setSelectedCustomer(customer)
    setShowCustomerDetails(true)
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Customer Management</h2>
        <div className="flex items-center space-x-2">
          <Button onClick={() => setShowAddCustomer(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
          <Button variant="outline" onClick={() => setShowSearchCustomerDialog(true)}>
            <Search className="mr-2 h-4 w-4" />
            Find Customer
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCustomers}</div>
            <p className="text-xs text-muted-foreground">+180 this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Purchase</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">৳{averagePurchase.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">+12% from last month</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">৳{totalRevenue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">From all customers</p>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers..."
              className="pl-8 w-[200px] lg:w-[300px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>

          <Button variant="outline" size="icon" onClick={handleExportData}>
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Total Spent</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Last Purchase</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : (
                customers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={`/placeholder.svg?height=32&width=32&text=${(customer.name || "CU").slice(0,2)}`} />
                          <AvatarFallback>{(customer.name || "CU").slice(0,2)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{customer.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>{customer.email ?? "-"}</TableCell>
                    <TableCell>{customer.phone_number ?? "-"}</TableCell>
                    <TableCell>৳{((customer.total_spent ?? customer.dues ?? 0) as number).toFixed(2)}</TableCell>
                    <TableCell>{customer.orders ?? 0}</TableCell>
                    <TableCell>{customer.last_purchase ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{customer.status ?? "Regular"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleCallCustomer(customer.phone_number)}>
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEmailCustomer(customer.email)}>
                          <Mail className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleViewCustomer(customer)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEditFor(customer)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteCustomer(customer)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Customer Details Dialog */}
      <Dialog open={showCustomerDetails} onOpenChange={setShowCustomerDetails}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
            <DialogDescription>Complete customer information</DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={`/placeholder.svg?height=64&width=64&text=${(selectedCustomer.name || "CU").slice(0,2)}`} />
                  <AvatarFallback className="text-lg">{(selectedCustomer.name || "CU").slice(0,2)}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="text-lg font-semibold">{selectedCustomer.name}</h3>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.email ?? "-"}</p>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.phone_number ?? "-"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Total Spent</Label>
                  <p className="text-lg font-semibold">৳{(selectedCustomer.total_spent ?? selectedCustomer.dues ?? 0).toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Total Orders</Label>
                  <p className="text-lg font-semibold">{selectedCustomer.orders ?? 0}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Last Purchase</Label>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.last_purchase ?? "-"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Date Joined</Label>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.date_joined ?? selectedCustomer.created_at ?? "-"}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Address</Label>
                <p className="text-sm text-muted-foreground">{selectedCustomer.address ?? "-"}</p>
              </div>

              <div>
                <Label className="text-sm font-medium">Notes</Label>
                <p className="text-sm text-muted-foreground">{selectedCustomer.notes ?? "-"}</p>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleCallCustomer(selectedCustomer.phone_number)}>
                  <Phone className="mr-2 h-4 w-4" />
                  Call
                </Button>
                <Button variant="outline" onClick={() => handleEmailCustomer(selectedCustomer.email ?? "")}>
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </Button>
                <Button variant="outline">
                  View Orders
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCustomerDetails(false)}>Close</Button>
            <Button onClick={() => { setShowCustomerDetails(false); if (selectedCustomer) openEditFor(selectedCustomer) }}>Edit Customer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Customer Dialog */}
      <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>Enter customer information to create a new record</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="add-name">Full Name*</Label>
                <Input id="add-name" placeholder="Enter full name" value={addName} onChange={(e) => setAddName(e.target.value)} required />
              </div>
              <div>
                <Label htmlFor="add-phone">Phone Number*</Label>
                <Input id="add-phone" placeholder="Enter phone number" value={addPhone} onChange={(e) => setAddPhone(e.target.value)} required />
              </div>
            </div>
            <div>
              <Label htmlFor="add-email">Email Address</Label>
              <Input id="add-email" type="email" placeholder="Enter email address" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="add-address">Address</Label>
              <Input id="add-address" placeholder="Enter address" value={addAddress} onChange={(e) => setAddAddress(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCustomer(false)}>Cancel</Button>
            <Button onClick={handleAddCustomer}>Add Customer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={showEditCustomer} onOpenChange={setShowEditCustomer}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
            <DialogDescription>Update customer information</DialogDescription>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-name">Full Name*</Label>
                  <Input id="edit-name" value={editName} onChange={(e) => setEditName(e.target.value)} />
                </div>
                <div>
                  <Label htmlFor="edit-phone">Phone Number*</Label>
                  <Input id="edit-phone" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-email">Email Address</Label>
                <Input id="edit-email" type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="edit-address">Address</Label>
                <Input id="edit-address" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditCustomer(false)}>Cancel</Button>
            <Button onClick={handleSaveEditCustomer}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Customer Search Dialog (component uses Supabase too) */}
      <CustomerSearch open={showSearchCustomerDialog} onOpenChange={setShowSearchCustomerDialog} onSelectCustomer={handleSelectFromSearch} />
    </div>
  )
}

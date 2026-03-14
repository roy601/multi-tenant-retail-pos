"use client"

import { useMemo, useState, useEffect } from "react"
import { Save, X, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/utils/supabase/component"
import { useRole } from "@/components/role-provider"

type SaleItem = {
  id: number
  barcode: string | null
  product_name: string
  model_number: string | null
  color: string | null
  quantity: number
  unit_price: number
  total_price: number
  sales_id: number
}

type SaleInfo = {
  sale_id: number
  invoice_number?: string | null
  sale_date: string
  total_amount: number | null
  customer_name?: string | null
  customer_phone?: string | null
}

const supabase = createClient()

export function SalesReturnForm({ onClose }: { onClose?: () => void }) {
  const { toast } = useToast()
  const { organization } = useRole()
  const organizationId = organization?.id || null

  // IMEI load state
  const [imeiNumber, setImeiNumber] = useState("")
  const [loading, setLoading] = useState(false)

  // loaded sale & item
  const [saleInfo, setSaleInfo] = useState<SaleInfo | null>(null)
  const [selectedItem, setSelectedItem] = useState<SaleItem | null>(null)
  const [customerId, setCustomerId] = useState<number | null>(null)

  // form fields
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [productName, setProductName] = useState("")
  const [modelNumber, setModelNumber] = useState("")
  const [color, setColor] = useState("")
  const [quantity, setQuantity] = useState<number>(1)
  const [unitPrice, setUnitPrice] = useState<number>(0)
  const [reason, setReason] = useState("")
  const [returnDate, setReturnDate] = useState<string>("")
  const [notes, setNotes] = useState("")
  const [refundMethod, setRefundMethod] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const totalAmount = useMemo(() => Number((quantity * unitPrice || 0).toFixed(2)), [quantity, unitPrice])

  // Set today's date as default return date
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    setReturnDate(today)
  }, [])

  async function loadByImei() {
    const imei = imeiNumber.trim()
    if (!imei) {
      toast({ title: "Enter IMEI", description: "Please enter an IMEI number.", variant: "destructive" })
      return
    }

    setLoading(true)
    try {
      console.log("Searching for IMEI:", imei)

      // Find the sold product by IMEI (barcode)
      let productData = null

      // Try exact match first
      const { data: exactMatch } = await supabase
        .from("sold_products")
        .select("id, sales_id, barcode, product_name, model_number, color, quantity, unit_price, total_price")
        .eq("barcode", imei)
        .maybeSingle()

      if (exactMatch) {
        productData = exactMatch
      } else {
        // Try case-insensitive match
        const { data: caseMatch } = await supabase
          .from("sold_products")
          .select("id, sales_id, barcode, product_name, model_number, color, quantity, unit_price, total_price")
          .ilike("barcode", imei)
          .maybeSingle()

        if (caseMatch) {
          productData = caseMatch
        } else {
          // Try partial match (handles extra characters)
          const { data: partialMatch } = await supabase
            .from("sold_products")
            .select("id, sales_id, barcode, product_name, model_number, color, quantity, unit_price, total_price")
            .ilike("barcode", `%${imei}%`)
            .maybeSingle()

          if (partialMatch) {
            productData = partialMatch
          }
        }
      }

      if (!productData) {
        toast({ 
          title: "Not found", 
          description: `No product found with IMEI "${imei}".`, 
          variant: "destructive" 
        })
        return
      }

      console.log("Found product:", productData)

      // Get sales data separately to avoid JOIN issues
      let saleData = null
      if (productData.sales_id) {
        const { data: salesData, error: salesError } = await supabase
          .from("sales")
          .select("*")
          .eq("id", productData.sales_id)
          .maybeSingle()

        if (!salesError && salesData) {
          saleData = salesData
        }
      }

      // Get customer info from sale_customers table
      let customerName = ""
      let customerPhone = ""
      let customerEmail = ""
      let foundCustomerId = null
      
      if (productData.sales_id) {
        const { data: saleCustomer, error: customerError } = await supabase
          .from("sale_customers")
          .select("customer_id, customer_name, customer_phone, customer_email")
          .eq("sales_id", productData.sales_id)
          .maybeSingle()

        if (!customerError && saleCustomer) {
          customerName = saleCustomer.customer_name || ""
          customerPhone = saleCustomer.customer_phone || ""
          customerEmail = saleCustomer.customer_email || ""
          foundCustomerId = saleCustomer.customer_id
          console.log("Found customer from sale_customers:", saleCustomer)
        } else {
          console.log("No customer found in sale_customers table for sales_id:", productData.sales_id)
        }
      }

      setCustomerName(customerName)
      setCustomerPhone(customerPhone)

      // Use customer ID from sale_customers if available, otherwise try to find by phone
      if (foundCustomerId) {
        setCustomerId(foundCustomerId)
      } else if (customerPhone) {
        const { data: found } = await supabase
          .from("customers")
          .select("id")
          .eq("phone_number", customerPhone)
          .limit(1)
          .maybeSingle()
        setCustomerId(found?.id ?? null)
      } else {
        setCustomerId(null)
      }

      // Set product info
      setSelectedItem(productData)
      setProductName(productData.product_name || "")
      setModelNumber(productData.model_number || "")
      setColor(productData.color || "")
      setUnitPrice(productData.unit_price || 0)
      setQuantity(1)

      // Set sale info
      setSaleInfo({
        sale_id: productData.sales_id || 0,
        invoice_number: saleData?.invoice_number || saleData?.invoicenumber || "",
        sale_date: saleData?.sale_date || saleData?.saledate || "",
        total_amount: saleData?.total_amount || saleData?.totalamount || 0,
        customer_name: customerName,
        customer_phone: customerPhone
      })

      const displayId = saleData?.invoice_number || (productData.sales_id ? `#${productData.sales_id}` : "Unknown")
      toast({ 
        title: "Product loaded successfully", 
        description: `Loaded ${productData.product_name} from sale ${displayId}` 
      })

    } catch (e: any) {
      console.error("Load error:", e)
      toast({ 
        title: "Error", 
        description: e?.message || "Failed to load product.", 
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }

  async function processReturn(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return

    // Validation
    if (!selectedItem) {
      toast({ title: "No product loaded", description: "Load a product first using IMEI.", variant: "destructive" })
      return
    }
    if (!reason || !refundMethod) {
      toast({ title: "Missing fields", description: "Return reason and refund method are required.", variant: "destructive" })
      return
    }
    if (quantity <= 0) {
      toast({ title: "Invalid quantity", description: "Quantity must be at least 1.", variant: "destructive" })
      return
    }
    if (!returnDate) {
      toast({ title: "Missing return date", description: "Please select a return date.", variant: "destructive" })
      return
    }
    if (!customerName.trim()) {
      toast({ title: "Missing customer name", description: "Customer name is required.", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      // Calculate total refund
      const totalRefund = quantity * unitPrice

      // Create return record
      const { data: returnRecord, error: returnError } = await supabase
        .from("sales_returns")
        .insert({
          original_sale_id: saleInfo?.sale_id || selectedItem.sales_id,
          return_date: returnDate,
          return_reason: reason,
          refund_method: refundMethod,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.trim() || null,
          notes: notes || null,
          total_refund_amount: totalRefund,
          status: 'completed',
          organization_id: organizationId
        })
        .select()
        .single()

      if (returnError) throw returnError

      // Create return item record
      const { error: returnItemError } = await supabase
        .from("sales_return_items")
        .insert({
          return_id: returnRecord.id,
          product_name: productName,
          original_sold_product_id: selectedItem.id,
          quantity: quantity,
          unit_price: unitPrice,
          total_refund_amount: totalRefund,
          condition: 'good',
          organization_id: organizationId
        })

      if (returnItemError) throw returnItemError

      // Restock to inventory
      if (selectedItem.barcode) {
        // Check if product exists in inventory
        const { data: existingInventory } = await supabase
          .from("inventory")
          .select("id, quantity")
          .eq("barcode", selectedItem.barcode)
          .maybeSingle()

        if (existingInventory) {
          // Update existing inventory
          const { error: updateError } = await supabase
            .from("inventory")
            .update({ 
              quantity: existingInventory.quantity + quantity,
              updated_at: new Date().toISOString()
            })
            .eq("id", existingInventory.id)

          if (updateError) throw updateError
        } else {
          // Look up purchase_id from color_variants so purchase return can still trace the original purchase
          let linkedPurchaseId: number | null = null
          const { data: cvData } = await supabase
            .from("color_variants")
            .select("purchase_id")
            .eq("barcode", selectedItem.barcode)
            .maybeSingle()
          if (cvData?.purchase_id) {
            linkedPurchaseId = cvData.purchase_id
          }

          // Create new inventory record
          const { error: insertError } = await supabase
            .from("inventory")
            .insert({
              barcode: selectedItem.barcode,
              product_name: selectedItem.product_name,
              model_number: selectedItem.model_number,
              color: selectedItem.color,
              quantity: quantity,
              unit_price: unitPrice,
              purchase_id: linkedPurchaseId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              organization_id: organizationId
            })

          if (insertError) throw insertError
        }
      }

      toast({
        title: "Return processed successfully",
        description: `Refund ৳${totalRefund.toFixed(2)} • Return #${returnRecord.id} • Item added back to inventory`,
      })

      // Reset form for next return
      setQuantity(1)
      setReason("")
      setRefundMethod("")
      setNotes("")
      const today = new Date().toISOString().split('T')[0]
      setReturnDate(today)
      if (onClose) onClose()

    } catch (err: any) {
      console.error("Process return error:", err)
      toast({ title: "Error", description: err?.message ?? "Unexpected error occurred.", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="space-y-6 h-[calc(100vh-8rem)] overflow-y-auto pr-1" onSubmit={processReturn}>
      {/* Customer Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Customer Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="imei">IMEI Number</Label>
            <div className="flex gap-2">
              <Input
                id="imei"
                placeholder="Enter IMEI number"
                value={imeiNumber}
                onChange={(e) => setImeiNumber(e.target.value)}
              />
              <Button type="button" variant="outline" onClick={loadByImei} disabled={loading}>
                <Search className="mr-2 h-4 w-4" />
                {loading ? "Loading..." : "Load"}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Enter the IMEI number to load product and customer details
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="customer-name">Customer Name*</Label>
            <Input
              id="customer-name"
              placeholder="Auto-filled from sale record"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="customer-phone">Phone Number</Label>
            <Input
              id="customer-phone"
              placeholder="Auto-filled from sale record"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Product Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Product Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="product-name">Product Name*</Label>
            <Input
              id="product-name"
              placeholder="Auto-filled from IMEI lookup"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="model">Model Number</Label>
            <Input
              id="model"
              placeholder="Auto-filled from IMEI lookup"
              value={modelNumber}
              onChange={(e) => setModelNumber(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="color">Color</Label>
            <Input
              id="color"
              placeholder="Auto-filled from IMEI lookup"
              value={color}
              onChange={(e) => setColor(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="quantity">Quantity*</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              max={selectedItem?.quantity || 999}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Math.min(selectedItem?.quantity || 999, Number(e.target.value) || 1)))}
              required
            />
            {selectedItem && (
              <p className="text-xs text-gray-500 mt-1">
                Max available: {selectedItem.quantity}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="unit-price">Unit Price*</Label>
            <Input
              id="unit-price"
              type="number"
              value={unitPrice}
              onChange={(e) => setUnitPrice(Number(e.target.value) || 0)}
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="total-amount">Total Amount</Label>
          <Input id="total-amount" type="number" value={totalAmount} readOnly className="bg-gray-50" />
        </div>
      </div>

      {/* Return Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Return Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="return-reason">Return Reason*</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="defective">Defective Product</SelectItem>
                <SelectItem value="wrong_item">Wrong Item</SelectItem>
                <SelectItem value="not_satisfied">Customer Not Satisfied</SelectItem>
                <SelectItem value="damaged">Damaged in Transit</SelectItem>
                <SelectItem value="warranty_claim">Warranty Claim</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="return-date">Return Date*</Label>
            <Input
              id="return-date"
              type="date"
              value={returnDate}
              onChange={(e) => setReturnDate(e.target.value)}
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              Defaults to today, can be changed if needed
            </p>
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Additional notes about the return (optional)"
            className="h-20"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      {/* Refund Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Refund Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="refund-method">Refund Method*</Label>
            <Select value={refundMethod} onValueChange={setRefundMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select refund method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Credit/Debit Card</SelectItem>
                <SelectItem value="mobile_banking">Mobile Banking (bKash/Nagad)</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="store_credit">Store Credit</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="refund-amount">Refund Amount*</Label>
            <Input id="refund-amount" type="number" value={totalAmount} readOnly className="bg-gray-50" />
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-2 pt-4 sticky bottom-0 bg-white/80 backdrop-blur border-t">
        <Button type="button" variant="outline" onClick={() => window.location.reload()}>
          <X className="mr-2 h-4 w-4" />
          Reset Form
        </Button>
        <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={submitting || !selectedItem}>
          <Save className="mr-2 h-4 w-4" />
          {submitting ? "Processing Return..." : "Process Return"}
        </Button>
      </div>
    </form>
  )
}
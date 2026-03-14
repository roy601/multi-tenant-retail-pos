"use client"

import { useMemo, useState, useEffect } from "react"
import { Save, X, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createClient } from "@/utils/supabase/component"
import { useToast } from "@/hooks/use-toast"
import { useRole } from "@/components/role-provider"

const supabase = createClient()

type PurchaseItem = {
  id: number
  barcode: string
  color: string | null
  quantity: number
  cost_price: number | null
  imei: string | null
  purchase_id: number
}

type Purchase = {
  id: number
  invoice_number: string | null
  created_at: string
  supplier: string | null
  product_name: string | null
  model_number: string | null
  category: string | null
  brand: string | null
  cost_price: number | null
  sale_price: number | null
  description: string | null
}

type Supplier = {
  id: string
  name: string
}

export function PurchaseReturnForm({ onClose }: { onClose?: () => void }) {
  const { toast } = useToast()
  const { organization } = useRole()
  const organizationId = organization?.id || null
  const [suppliers, setSuppliers] = useState<Supplier[]>([])

  // Supplier / barcode info
  const [supplier, setSupplier] = useState<string>("")
  const [barcode, setBarcode] = useState<string>("")

  // Product Information
  const [productName, setProductName] = useState<string>("")
  const [modelNumber, setModelNumber] = useState<string>("")
  const [color, setColor] = useState<string>("")
  const [quantity, setQuantity] = useState<number | null>(null)
  const [unitCost, setUnitCost] = useState<number | null>(null)

  // Return Details
  const [returnReason, setReturnReason] = useState<string>("")
  const [returnDate, setReturnDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState<string>("")

  // Credit Information
  const [creditMethod, setCreditMethod] = useState<string>("")
  const [creditAmount, setCreditAmount] = useState<number | null>(null)

  const [submitting, setSubmitting] = useState(false)
  const [loadingBarcode, setLoadingBarcode] = useState(false)
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([])

  // Load suppliers from database when organization context is ready
  useEffect(() => {
    const loadSuppliers = async () => {
      if (!organizationId) return;

      try {
        const { data, error } = await supabase
          .from("suppliers")
          .select("id, name")
          .order("name", { ascending: true })

        if (error) throw error
        setSuppliers((data as Supplier[]) || [])
      } catch (err: any) {
        console.error("Failed to load suppliers:", err)
      }
    }

    if (organizationId) {
      loadSuppliers()
    }
  }, [organizationId])

  const totalAmount = useMemo<number | null>(() => {
    if (quantity == null || unitCost == null) return null
    const n = quantity * unitCost
    return Number.isFinite(n) ? Number(n.toFixed(2)) : null
  }, [quantity, unitCost])

  const mapReasonToCondition = (reason: string): string => {
    switch (reason) {
      case "defective-batch":
      case "quality-issues":
        return "defective"
      case "wrong-specifications":
        return "wrong_spec"
      case "damaged-shipment":
        return "damaged"
      case "overstock":
        return "overstock"
      default:
        return "defective"
    }
  }

  const loadFromBarcode = async () => {
    const barcodeValue = barcode.trim()
    if (!barcodeValue) {
      toast({ title: "Enter a barcode", description: "Please provide a barcode to search.", variant: "destructive" })
      return
    }

    setLoadingBarcode(true)
    try {
      let targetItem: any = null;
      let chosenPurchase: any = null;

      // First, try to find in inventory
      const { data: invItems, error: invError } = await supabase
        .from("inventory")
        .select("*")
        .eq("barcode", barcodeValue)

      if (!invError && invItems && invItems.length > 0) {
        targetItem = invItems[0];
      } else {
        // Try color_variants
        const { data: cvItems, error: cvError } = await supabase
          .from("color_variants")
          .select("*, purchases(*)")
          .eq("barcode", barcodeValue)

        if (!cvError && cvItems && cvItems.length > 0) {
          targetItem = cvItems[0];
          chosenPurchase = Array.isArray(cvItems[0].purchases) ? cvItems[0].purchases[0] : cvItems[0].purchases;
        }
      }

      if (!targetItem) {
        toast({ title: "Not found", description: "No purchase found with this barcode.", variant: "destructive" })
        return
      }

      // If we don't have the chosenPurchase yet (found in inventory), fetch it via purchase_id
      if (!chosenPurchase && targetItem.purchase_id) {
        const { data: purchases, error: purchasesError } = await supabase
          .from("purchases")
          .select("*")
          .eq("id", targetItem.purchase_id)

        if (!purchasesError && purchases && purchases.length > 0) {
          chosenPurchase = purchases[0];
        }
      }

      // Fallback: inventory row may have no purchase_id (e.g. restocked via sales return)
      // Try to look up the purchase through color_variants by barcode
      if (!chosenPurchase) {
        const { data: cvFallback, error: cvFallbackError } = await supabase
          .from("color_variants")
          .select("*, purchases(*)")
          .eq("barcode", barcodeValue)
          .maybeSingle()

        if (!cvFallbackError && cvFallback) {
          chosenPurchase = Array.isArray(cvFallback.purchases)
            ? cvFallback.purchases[0]
            : cvFallback.purchases;
          // Also update targetItem color if not already set
          if (!targetItem.color && cvFallback.color) {
            targetItem = { ...targetItem, color: cvFallback.color }
          }
        }
      }

      if (!chosenPurchase) {
        toast({ title: "Not found", description: "Could not locate original purchase details.", variant: "destructive" })
        return
      }

      setPurchaseItems([targetItem])

      // Autofill the form
      setSupplier(chosenPurchase.supplier || targetItem.supplier || "")
      setProductName(targetItem.product_name || chosenPurchase.product_name || "")
      setModelNumber(targetItem.model_number || chosenPurchase.model_number || "")
      setColor(targetItem.color || "")
      setUnitCost(targetItem.cost_price || chosenPurchase.cost_price || 0)

      toast({ title: "Loaded", description: `Purchase ${chosenPurchase.invoice_number || `#${chosenPurchase.id}`} loaded.` })
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to load purchase.", variant: "destructive" })
    } finally {
      setLoadingBarcode(false)
    }
  }

  function isFiniteNum(v: unknown): v is number {
    return typeof v === "number" && Number.isFinite(v)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (submitting) return

    // 1) Validate required fields + types
    const _supplier = (supplier || "").trim()
    const _productName = (productName || "").trim()
    const _returnReason = (returnReason || "").trim()
    const _creditMethod = (creditMethod || "").trim()
    const _qty = quantity
    const _unit = unitCost
    const _barcode = (barcode || "").trim()

    const missing: string[] = []
    if (!_supplier) missing.push("Supplier")
    if (!_productName) missing.push("Product Name")
    if (!_barcode) missing.push("Barcode")
    if (!isFiniteNum(_qty) || _qty <= 0) missing.push("Quantity")
    if (!isFiniteNum(_unit) || _unit < 0) missing.push("Unit Cost")
    if (!_returnReason) missing.push("Return Reason")
    if (!_creditMethod) missing.push("Credit Method")
    if (!returnDate) missing.push("Return Date")

    if (missing.length > 0) {
      toast({
        title: "Missing fields",
        description: `Please fill: ${missing.join(", ")}`,
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      // 2) Find the original purchase by barcode
      if (purchaseItems.length === 0) {
        toast({ title: "No matching purchase", description: "Could not find a purchase for this barcode.", variant: "destructive" })
        return
      }

      // Use the first purchase item found
      const targetItem = purchaseItems[0]
      
      // 3) Insert into purchase_returns table
      const { data: returnData, error: returnError } = await supabase
        .from("purchase_returns")
        .insert({
          original_purchase_id: targetItem.purchase_id,
          supplier: _supplier,
          return_reason: _returnReason.replace("-", "_"),
          credit_method: _creditMethod,
          notes: (notes || "").trim() || null,
          return_date: returnDate,
          total_credit_amount: (_qty || 0) * (_unit || 0),
          organization_id: organizationId
        })
        .select()
        .single()

      if (returnError) {
        console.error("[purchase_returns insert] error:", returnError)
        toast({ title: "Error", description: returnError.message || "Failed to create purchase return.", variant: "destructive" })
        return
      }

      // 4) Insert into purchase_return_items table
      const { error: itemsError } = await supabase
        .from("purchase_return_items")
        .insert({
          purchase_return_id: returnData.id,
          barcode: _barcode,
          product_name: _productName,
          model_number: modelNumber || null,
          color: color || null,
          return_quantity: _qty || 0,
          unit_cost: _unit || 0,
          total_credit_amount: (_qty || 0) * (_unit || 0),
          condition: mapReasonToCondition(_returnReason),
          original_color_variant_barcode: _barcode,
          organization_id: organizationId
        })

      if (itemsError) {
        console.error("[purchase_return_items insert] error:", itemsError)
        toast({ title: "Error", description: itemsError.message || "Failed to create purchase return items.", variant: "destructive" })
        return
      }

      toast({ title: "Return processed", description: `Purchase return #${returnData.id} processed.` })

      // 5) Reset form
      setBarcode("")
      setProductName(""); setModelNumber(""); setColor("")
      setQuantity(null); setUnitCost(null)
      setReturnReason(""); setReturnDate(new Date().toISOString().split('T')[0]); setNotes("")
      setCreditMethod(""); setCreditAmount(null)
      setPurchaseItems([])
    } catch (err: any) {
      console.error("[handleSubmit] unexpected error:", err)
      toast({ title: "Error", description: err?.message || "Unexpected error.", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="space-y-6 h-[calc(100vh-8rem)] overflow-y-auto pr-1" onSubmit={handleSubmit}>
      {/* Supplier Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Supplier Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="supplier">Supplier*</Label>
            <Select value={supplier} onValueChange={setSupplier}>
              <SelectTrigger>
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.length === 0 ? (
                  <SelectItem value="none" disabled>
                    No suppliers found
                  </SelectItem>
                ) : (
                  suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <Label htmlFor="barcode">Barcode*</Label>
            <div className="flex gap-2">
              <Input
                id="barcode"
                placeholder="Enter barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
              />
              <Button type="button" variant="outline" onClick={loadFromBarcode} disabled={loadingBarcode}>
                <Search className="mr-2 h-4 w-4" />
                {loadingBarcode ? "Loading..." : "Load"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Product Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Product Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="product-name">Product Name*</Label>
            <Input id="product-name" required value={productName} onChange={(e) => setProductName(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="model">Model Number</Label>
            <Input id="model" value={modelNumber} onChange={(e) => setModelNumber(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="color">Color</Label>
            <Input id="color" value={color} onChange={(e) => setColor(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="quantity">Quantity*</Label>
            <Input
              id="quantity"
              type="number"
              min={1}
              required
              value={quantity ?? ""}
              onChange={(e) => setQuantity(e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
          <div>
            <Label htmlFor="unit-cost">Unit Cost*</Label>
            <Input
              id="unit-cost"
              type="number"
              step="0.01"
              min={0}
              required
              value={unitCost ?? ""}
              onChange={(e) => setUnitCost(e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
        </div>

        <div>
          <Label htmlFor="total-amount">Total Amount</Label>
          <Input id="total-amount" type="number" readOnly placeholder="৳0.00" value={totalAmount ?? ""} />
        </div>
      </div>

      {/* Return Details */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Return Details</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="return-reason">Return Reason*</Label>
            <Select value={returnReason} onValueChange={setReturnReason}>
              <SelectTrigger><SelectValue placeholder="Select reason" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="defective-batch">Defective Batch</SelectItem>
                <SelectItem value="wrong-specifications">Wrong Specifications</SelectItem>
                <SelectItem value="quality-issues">Quality Issues</SelectItem>
                <SelectItem value="damaged-shipment">Damaged in Shipment</SelectItem>
                <SelectItem value="overstock">Overstock</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="return-date">Return Date*</Label>
            <Input 
              id="return-date" 
              type="date" 
              required 
              value={returnDate} 
              onChange={(e) => setReturnDate(e.target.value)} 
            />
          </div>
        </div>

        <div>
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" className="h-20" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      {/* Credit Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Credit Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="credit-method">Credit Method*</Label>
            <Select value={creditMethod} onValueChange={setCreditMethod}>
              <SelectTrigger><SelectValue placeholder="Select credit method" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="account_credit">Account Credit</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="replacement">Replacement Products</SelectItem>
                <SelectItem value="check">Check</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="credit-amount">Credit Amount*</Label>
            <Input
              id="credit-amount"
              type="number"
              step="0.01"
              min={0}
              required
              value={creditAmount ?? ""}
              onChange={(e) => setCreditAmount(e.target.value === "" ? null : Number(e.target.value))}
            />
          </div>
        </div>
      </div>

      {/* Actions (sticky) */}
      <div className="flex justify-end gap-2 pt-4 sticky bottom-0 bg-white/80 backdrop-blur py-3">
        <Button type="button" variant="outline" disabled={submitting}><X className="mr-2 h-4 w-4" />Cancel</Button>
        <Button type="submit" className="bg-green-600 hover:bg-green-700" disabled={submitting}>
          <Save className="mr-2 h-4 w-4" />
          {submitting ? "Processing..." : "Process Return"}
        </Button>
      </div>
    </form>
  )
}
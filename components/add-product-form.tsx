"use client"

import { useState, useEffect } from "react"
import { Save, X, Plus, Minus, Camera, QrCode, Barcode } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/utils/supabase/component"
import { useRole } from "@/components/role-provider"

const supabase = createClient();

type ColorVariant = {
  id: string
  color: string
  quantity: number
  barcodes: string[]  // Changed from single barcode to array of barcodes
}

type Supplier = {
  id: string
  name: string
}

export function AddProductForm() {
  const [showAddSupplier, setShowAddSupplier] = useState(false)
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState("") // will hold supplier id from DB
  const [selectedSupplierName, setSelectedSupplierName] = useState("") // New state to track the display name
  const [productName, setProductName] = useState("")
  const [modelNumber, setModelNumber] = useState("")
  const [currentVariantId, setCurrentVariantId] = useState("")
  const [currentBarcodeIndex, setCurrentBarcodeIndex] = useState(0)
  const [category, setCategory] = useState("")
  const [brand, setBrand] = useState("")
  const [costPrice, setCostPrice] = useState("")
  const [sellPrice, setSellPrice] = useState("")
  const [description, setDescription] = useState("")
  const [colorVariants, setColorVariants] = useState<ColorVariant[]>([
    { id: "1", color: "", quantity: 0, barcodes: [] },
  ])
  const { toast } = useToast()

  // --- New supplier / suppliers state ---
  const { organization, user: roleUser } = useRole()
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const organizationId = organization?.id || null
  const [supplierName, setSupplierName] = useState("")
  const [supplierContact, setSupplierContact] = useState("")
  const [supplierPhone, setSupplierPhone] = useState("")
  const [supplierEmail, setSupplierEmail] = useState("")
  const [supplierAddress, setSupplierAddress] = useState("")

  // --- Custom Category State ---
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [customCategoryName, setCustomCategoryName] = useState("")

  const [categories, setCategories] = useState<string[]>([])
  const [brands, setBrands] = useState<string[]>([])

  // Update supplier name when selected supplier changes
  useEffect(() => {
    if (selectedSupplier && suppliers.length > 0) {
      const supplier = suppliers.find(s => s.id === selectedSupplier);
      if (supplier) {
        setSelectedSupplierName(supplier.name);
      }
    } else {
      setSelectedSupplierName("");
    }
  }, [selectedSupplier, suppliers]);

  // --- Load suppliers, categories, and brands from DB ---
  const loadInitialData = async () => {
    if (!organizationId) return;

    try {
      const { data: suppliersData, error: suppliersError } = await supabase
        .from("suppliers")
        .select("id, name")
        .eq('organization_id', organizationId)
        .order("name", { ascending: true })

      if (suppliersError) throw suppliersError
      setSuppliers((suppliersData as any) || [])

      const { data: categoriesData, error: categoriesError } = await supabase
        .from('purchases')
        .select('category')
        .eq('organization_id', organizationId)

      if (categoriesError) throw categoriesError
      const uniqueCategories = [...new Set(categoriesData.map((item: any) => item.category))]
        .filter((cat) => typeof cat === 'string' && cat.trim() !== "")
      setCategories(uniqueCategories as string[])

      // No longer fetching brands for a dropdown since brand is now a free-text input
    } catch (err: any) {
      console.error("Failed to load initial data:", err)
    }
  }

  useEffect(() => {
    if (organizationId) {
      loadInitialData()
    }
  }, [organizationId])

  const addColorVariant = () => {
    const newId = (Date.now()).toString()
    setColorVariants([...colorVariants, { id: newId, color: "", quantity: 0, barcodes: [] }])
  }

  const removeColorVariant = (id: string) => {
    if (colorVariants.length > 1) {
      setColorVariants(colorVariants.filter((variant) => variant.id !== id))
    }
  }

  const updateColorVariant = (id: string, field: keyof Omit<ColorVariant, 'barcodes'>, value: string | number) => {
    setColorVariants(colorVariants.map((variant) => 
      variant.id === id ? { ...variant, [field]: value } : variant
    ))
  }

  const updateColorVariantBarcodes = (id: string, barcodes: string[]) => {
    setColorVariants(colorVariants.map((variant) => 
      variant.id === id ? { ...variant, barcodes } : variant
    ))
  }

  const updateIndividualBarcode = (variantId: string, index: number, value: string) => {
    setColorVariants(colorVariants.map(variant => {
      if (variant.id === variantId) {
        const newBarcodes = [...variant.barcodes]
        newBarcodes[index] = value
        return { ...variant, barcodes: newBarcodes }
      }
      return variant
    }))
  }

  const generateBarcodesForVariant = (variantId: string, quantity: number) => {
    setColorVariants(colorVariants.map(variant => {
      if (variant.id === variantId) {
        // If we're increasing quantity, add empty barcode slots
        if (quantity > variant.barcodes.length) {
          const newBarcodes = [...variant.barcodes]
          while (newBarcodes.length < quantity) {
            newBarcodes.push("")
          }
          return { ...variant, quantity, barcodes: newBarcodes }
        } 
        // If decreasing quantity, remove extra barcodes
        else if (quantity < variant.barcodes.length) {
          return { 
            ...variant, 
            quantity, 
            barcodes: variant.barcodes.slice(0, quantity) 
          }
        } else {
          return { ...variant, quantity }
        }
      }
      return variant
    }))
  }

  const openBarcodeScanner = (variantId: string, barcodeIndex: number) => {
    setCurrentVariantId(variantId)
    setCurrentBarcodeIndex(barcodeIndex)
    setShowBarcodeScanner(true)
  }

  const handleBarcodeScanned = (scannedBarcode: string) => {
    if (currentVariantId) {
      updateIndividualBarcode(currentVariantId, currentBarcodeIndex, scannedBarcode)
      setShowBarcodeScanner(false)
      setCurrentVariantId("")
      setCurrentBarcodeIndex(0)
      toast({
        title: "Barcode Captured",
        description: `Barcode ${scannedBarcode} has been saved`,
      })
    }
  }

  // --- Add supplier to DB (now includes owner = auth.uid()) ---
const handleAddSupplier = async () => {
  if (!supplierName.trim()) {
    toast({ title: "Error", description: "Supplier name is required", variant: "destructive" })
    return
  }

  try {
    if (!roleUser?.id) {
      console.error("No authenticated user found. Insert will be blocked by RLS.")
      toast({
        title: "Not authenticated",
        description: "Please sign in before adding a supplier.",
        variant: "destructive",
      })
      return
    }

    if (!organizationId) {
      toast({
        title: "Configuration Error",
        description: "Your shop identification is missing. Please select a shop first.",
        variant: "destructive",
      })
      return
    }

    const { data, error } = await supabase
      .from("suppliers")
      .insert([{
        organization_id: organizationId,
        owner: roleUser.id,
        name: supplierName.trim(),
        contact_person: supplierContact || null,
        phone: supplierPhone || null,
        email: supplierEmail || null,
        address: supplierAddress || null,
      }])
      .select("id, name")
      .single()

    if (error) {
      // If it's an RLS error, show details and log full error object
      console.error("Insert error:", error)
      if (error.message?.includes("violates row-level security")) {
        toast({
          title: "Row-level security prevented insert",
          description: "The DB refused the insert. Check that 'owner' equals the logged-in user's id and RLS policies.",
          variant: "destructive",
        })
      } else {
        toast({ title: "Database Error", description: error.message || "Failed to add supplier", variant: "destructive" })
      }
      return
    }

    // success
    await loadInitialData()
    setSelectedSupplier(data.id)
    setShowAddSupplier(false)
    setSupplierName("")
    setSupplierContact("")
    setSupplierPhone("")
    setSupplierEmail("")
    setSupplierAddress("")
    toast({ title: "Supplier Added", description: `${data.name} added successfully!` })
  } catch (err: any) {
    console.error("Unexpected error in handleAddSupplier:", err)
    toast({ title: "Error", description: err?.message || "Unexpected error", variant: "destructive" })
  }
}

  // --- Add custom category locally ---
  const handleAddCustomCategory = () => {
    if (!customCategoryName.trim()) {
      toast({ title: "Error", description: "Category name is required", variant: "destructive" })
      return
    }

    const newCat = customCategoryName.trim()
    
    if (!categories.includes(newCat)) {
      setCategories([...categories, newCat].sort())
    }
    
    setCategory(newCat)
    setShowAddCategory(false)
    setCustomCategoryName("")
    toast({ title: "Category Added", description: `"${newCat}" added and selected. It will be saved permanently when you save this product.` })
  }

  const handleSaveProduct = async () => {
    // Validation
    if (!productName || !modelNumber) {
      toast({ title: "Error", description: "Please fill in product name and model number", variant: "destructive" })
      return
    }

    const validVariants = colorVariants.filter((v) => v.color && v.quantity > 0)
    const totalQuantity = validVariants.reduce((sum, v) => sum + v.quantity, 0)

    if (totalQuantity === 0) {
      toast({ title: "Error", description: "Please add at least one color variant with quantity", variant: "destructive" })
      return
    }

    // Check if all barcodes are filled
    const missingBarcodes = validVariants.some(variant => 
      variant.barcodes.some(barcode => !barcode.trim())
    )
    
    if (missingBarcodes) {
      toast({
        title: "Missing barcodes",
        description: "Please scan barcodes for all product units.",
        variant: "destructive",
      })
      return
    }

    if (!category || !costPrice || !sellPrice) {
      toast({
        title: "Error",
        description: "Please fill in all required fields (category, cost price, selling price)",
        variant: "destructive",
      })
      return
    }

    // Check for duplicate barcodes
    const allBarcodes = validVariants.flatMap(v => v.barcodes)
    const uniqueBarcodes = new Set(allBarcodes)
    
    if (allBarcodes.length !== uniqueBarcodes.size) {
      toast({
        title: "Duplicate barcodes",
        description: "Please ensure all barcodes are unique.",
        variant: "destructive",
      })
      return
    }

    try {
      // Check for existing barcodes in database
      const { data: existing, error: checkErr } = await supabase
        .from("color_variants")
        .select("barcode")
        .in("barcode", allBarcodes)

      if (checkErr) {
        console.error("Barcode check error:", checkErr)
        toast({ 
          title: "Database Error", 
          description: "Failed to check barcode uniqueness", 
          variant: "destructive" 
        })
        return
      }

      if (existing && existing.length > 0) {
        const found = existing.map((r: any) => r.barcode)
        toast({
          title: "Duplicate barcodes in database",
          description: `Already used: ${found.join(", ")}`,
          variant: "destructive",
        })
        return
      }

      // Create purchase
      const purchaseInsertPayload: any = {
        organization_id: organizationId,
        product_name: productName,
        model_number: modelNumber,
        category,
        brand,
        cost_price: parseFloat(costPrice),
        sale_price: parseFloat(sellPrice),
        description: description || null,
        supplier_id: selectedSupplier || null
      }

      const { data: purchaseData, error: purchaseError } = await supabase
        .from("purchases")
        .insert([purchaseInsertPayload])
        .select("id")
        .single()

      if (purchaseError) {
        console.error("Purchase insert failed:", purchaseError)
        toast({ title: "Database Error", description: `Failed to save product: ${purchaseError.message}`, variant: "destructive" })
        return
      }

      const purchaseId = purchaseData?.id
      if (!purchaseId) {
        toast({ title: "Database Error", description: "Failed to save product: No purchase ID returned", variant: "destructive" })
        return
      }

      // Insert variants - one for each barcode (each representing one physical unit)
      const variantInserts = validVariants.flatMap((v) => 
        v.barcodes.map(barcode => ({
          organization_id: organizationId,
          barcode: barcode.trim(),
          purchase_id: purchaseId,
          color: v.color,
          quantity: 1,  // Each barcode represents one unit
          imei: barcode.trim()  // IMEI same as barcode as requested
        }))
      )

      const { error: variantError } = await supabase.from("color_variants").insert(variantInserts)

      if (variantError) {
        console.error("Variant insert error:", variantError)
        toast({ title: "Database Error", description: `Failed to save variants: ${variantError.message}`, variant: "destructive" })
        return
      }

      toast({ 
        title: "Success", 
        description: `Product saved with ${variantInserts.length} individual units!` 
      })
      resetForm()
    } catch (err: any) {
      console.error("Unexpected error:", err)
      toast({ title: "Error", description: "An unexpected error occurred while saving the product", variant: "destructive" })
    }
  }

  const resetForm = () => {
    setProductName("")
    setModelNumber("")
    setCategory("")
    setBrand("")
    setCostPrice("")
    setSellPrice("")
    setDescription("")
    setSelectedSupplier("")
    setSelectedSupplierName("")
    setColorVariants([{ id: "1", color: "", quantity: 0, barcodes: [] }])
  }

  return (
    <>
      <form className="space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Basic Information</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="product-name">Product Name*</Label>
              <Input
                id="product-name"
                placeholder="Enter product name"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="model">Model Number*</Label>
              <Input
                id="model"
                placeholder="Enter model number"
                value={modelNumber}
                onChange={(e) => setModelNumber(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category*</Label>
              <div className="flex gap-2">
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger id="category" className="flex-1">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" size="icon" onClick={() => setShowAddCategory(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div>
              <Label htmlFor="brand">Brand</Label>
              <Input
                id="brand"
                placeholder="Enter brand name (optional)"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="cost-price">Cost Price*</Label>
              <Input 
                id="cost-price" 
                type="number" 
                placeholder="0.00 ৳" 
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                required />
            </div>
            <div>
              <Label htmlFor="selling-price">Selling Price*</Label>
              <Input 
                id="selling-price" 
                type="number" 
                placeholder="0.00 ৳" 
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                required />
            </div>
          </div>

          <div>
            <Label htmlFor="supplier">Supplier</Label>
            <div className="flex gap-2">
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger className="flex-1">
                  <SelectValue>
                    {selectedSupplierName || "Select supplier"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {suppliers.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No suppliers found
                    </SelectItem>
                  ) : (
                    suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <Button type="button" variant="outline" size="icon" onClick={() => setShowAddSupplier(true)}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description" 
              placeholder="Enter product description" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-20" />
          </div>
        </div>

        {/* Color Variants */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Color Variants & Stock</h3>
            <Button type="button" variant="outline" onClick={addColorVariant}>
              <Plus className="mr-2 h-4 w-4" />
              Add Color
            </Button>
          </div>

          <div className="space-y-4">
            {colorVariants.map((variant, index) => (
              <Card key={variant.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Color Variant {index + 1}</CardTitle>
                    {colorVariants.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeColorVariant(variant.id)}>
                        <Minus className="h-4 w-4 text-red-500" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Color*</Label>
                      <Input
                        placeholder="Enter color name"
                        value={variant.color}
                        onChange={(e) => updateColorVariant(variant.id, "color", e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <Label>Quantity*</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={variant.quantity || ""}
                        onChange={(e) => {
                          const newQuantity = Number.parseInt(e.target.value) || 0
                          updateColorVariant(variant.id, "quantity", newQuantity)
                          generateBarcodesForVariant(variant.id, newQuantity)
                        }}
                        required
                      />
                    </div>
                  </div>

                  {/* Barcode Section - One for each unit */}
                  {variant.quantity > 0 && (
                    <div className="space-y-3">
                      <Label>Product Barcodes* ({variant.quantity} units)</Label>
                      <div className="space-y-2">
                        {Array.from({ length: variant.quantity }).map((_, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <Label className="w-20">Unit {i + 1}:</Label>
                            <Input
                              placeholder="Scan barcode"
                              value={variant.barcodes[i] || ""}
                              onChange={(e) => updateIndividualBarcode(variant.id, i, e.target.value)}
                              className="flex-1"
                              required
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => openBarcodeScanner(variant.id, i)}
                            >
                              <Camera className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                          <QrCode className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Barcodes: </span>
                        </div>
                        <div className="mt-2 space-y-1">
                          {variant.barcodes.map((barcode, i) => (
                            barcode && (
                              <div key={i} className="flex items-center gap-2">
                                <Barcode className="h-3 w-3" />
                                <code className="bg-background px-2 py-1 rounded text-xs font-mono">
                                  {barcode}
                                </code>
                              </div>
                            )
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Each barcode represents one physical unit. Barcode and IMEI will be the same.
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total Quantity:</span>
              <span className="text-lg font-bold">
                {colorVariants.reduce((sum, variant) => sum + variant.quantity, 0)} units
              </span>
            </div>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={resetForm}>
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button type="button" onClick={handleSaveProduct} className="bg-green-600 hover:bg-green-700">
            <Save className="mr-2 h-4 w-4" />
            Save Product
          </Button>
        </div>
      </form>

      {/* Add Supplier Dialog */}
      <Dialog open={showAddSupplier} onOpenChange={setShowAddSupplier}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Supplier</DialogTitle>
            <DialogDescription>Enter supplier information to add to your supplier list.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="supplier-name">Supplier Name*</Label>
              <Input id="supplier-name" placeholder="Enter supplier name" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="supplier-contact">Contact Person</Label>
              <Input id="supplier-contact" placeholder="Enter contact person name" value={supplierContact} onChange={(e) => setSupplierContact(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="supplier-phone">Phone Number</Label>
              <Input id="supplier-phone" placeholder="Enter phone number" value={supplierPhone} onChange={(e) => setSupplierPhone(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="supplier-email">Email</Label>
              <Input id="supplier-email" type="email" placeholder="Enter email address" value={supplierEmail} onChange={(e) => setSupplierEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="supplier-address">Address</Label>
              <Textarea id="supplier-address" placeholder="Enter supplier address" className="h-20" value={supplierAddress} onChange={(e) => setSupplierAddress(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddSupplier(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSupplier}>Add Supplier</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Custom Category Dialog */}
      <Dialog open={showAddCategory} onOpenChange={setShowAddCategory}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Custom Category</DialogTitle>
            <DialogDescription>
              Enter a new category name. It will be available for this product and permanently saved when you submit this form.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="custom-category-name">Category Name*</Label>
              <Input 
                id="custom-category-name" 
                placeholder="e.g. Smartwatch, Accessories" 
                value={customCategoryName} 
                onChange={(e) => setCustomCategoryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCustomCategory();
                  }
                }}
                required 
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCategory(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCustomCategory}>Add Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Barcode Scanner Dialog */}
      <Dialog open={showBarcodeScanner} onOpenChange={setShowBarcodeScanner}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Scan Product Barcode</DialogTitle>
            <DialogDescription>
              Use your camera to scan the barcode from the product box. Make sure the barcode is clearly visible.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-8 rounded-lg text-center">
              <Camera className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">Camera scanner will appear here</p>
              <p className="text-xs text-muted-foreground">
                Position the barcode within the camera frame to scan automatically
              </p>
            </div>
            <div className="space-y-2">
              <Label>Or enter barcode manually:</Label>
              <Input
                placeholder="Enter barcode manually"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.currentTarget.value.trim()) {
                    handleBarcodeScanned(e.currentTarget.value.trim())
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBarcodeScanner(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                // Simulate barcode scan for demo
                const demoBarcode = `${Date.now()}`
                handleBarcodeScanned(demoBarcode)
              }}
            >
              Scan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
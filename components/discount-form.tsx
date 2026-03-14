"use client"

import { useState } from "react"
import { Save, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export function DiscountForm() {
  const [discountType, setDiscountType] = useState("percentage")
  const [applicationType, setApplicationType] = useState("all")

  return (
    <form className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Basic Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="discount-name">Discount Name*</Label>
            <Input id="discount-name" placeholder="Enter discount name" required />
          </div>
          <div>
            <Label htmlFor="discount-code">Discount Code</Label>
            <Input id="discount-code" placeholder="Enter discount code (optional)" />
          </div>
        </div>

        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea id="description" placeholder="Enter discount description" className="h-20" />
        </div>
      </div>

      {/* Discount Type */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Discount Type</h3>

        <RadioGroup value={discountType} onValueChange={setDiscountType}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="percentage" id="percentage" />
            <Label htmlFor="percentage">Percentage Discount</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="fixed" id="fixed" />
            <Label htmlFor="fixed">Fixed Amount Discount</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="buy-get" id="buy-get" />
            <Label htmlFor="buy-get">Buy X Get Y</Label>
          </div>
        </RadioGroup>

        {discountType === "percentage" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="percentage-value">Percentage (%)*</Label>
              <Input id="percentage-value" type="number" placeholder="0" min="0" max="100" required />
            </div>
            <div>
              <Label htmlFor="max-discount">Maximum Discount Amount</Label>
              <Input id="max-discount" type="number" placeholder="0.00" />
            </div>
          </div>
        )}

        {discountType === "fixed" && (
          <div>
            <Label htmlFor="fixed-amount">Discount Amount*</Label>
            <Input id="fixed-amount" type="number" placeholder="0.00" required />
          </div>
        )}

        {discountType === "buy-get" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="buy-quantity">Buy Quantity*</Label>
              <Input id="buy-quantity" type="number" placeholder="1" min="1" required />
            </div>
            <div>
              <Label htmlFor="get-quantity">Get Quantity*</Label>
              <Input id="get-quantity" type="number" placeholder="1" min="1" required />
            </div>
            <div>
              <Label htmlFor="get-discount">Get Discount (%)</Label>
              <Input id="get-discount" type="number" placeholder="100" min="0" max="100" />
            </div>
          </div>
        )}
      </div>

      {/* Application */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Application</h3>

        <RadioGroup value={applicationType} onValueChange={setApplicationType}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="all" id="all-products" />
            <Label htmlFor="all-products">All Products</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="category" id="category" />
            <Label htmlFor="category">Specific Category</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="product" id="product" />
            <Label htmlFor="product">Specific Products</Label>
          </div>
        </RadioGroup>

        {applicationType === "category" && (
          <div>
            <Label htmlFor="category-select">Select Category</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Choose category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="phones">Phones</SelectItem>
                <SelectItem value="accessories">Accessories</SelectItem>
                <SelectItem value="cases">Cases & Covers</SelectItem>
                <SelectItem value="chargers">Chargers & Cables</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {applicationType === "product" && (
          <div>
            <Label htmlFor="product-select">Select Products</Label>
            <Input id="product-select" placeholder="Search and select products" />
          </div>
        )}
      </div>

      {/* Conditions */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Conditions</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="min-purchase">Minimum Purchase Amount</Label>
            <Input id="min-purchase" type="number" placeholder="0.00" />
          </div>
          <div>
            <Label htmlFor="max-uses">Maximum Uses</Label>
            <Input id="max-uses" type="number" placeholder="Unlimited" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="start-date">Start Date*</Label>
            <Input id="start-date" type="date" required />
          </div>
          <div>
            <Label htmlFor="end-date">End Date</Label>
            <Input id="end-date" type="date" />
          </div>
        </div>
      </div>

      {/* Customer Eligibility */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Customer Eligibility</h3>

        <div>
          <Label htmlFor="customer-type">Customer Type</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select customer type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              <SelectItem value="new">New Customers Only</SelectItem>
              <SelectItem value="existing">Existing Customers Only</SelectItem>
              <SelectItem value="loyalty">Loyalty Members Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Switch id="first-time" />
          <Label htmlFor="first-time">First-time purchase only</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch id="combinable" />
          <Label htmlFor="combinable">Can be combined with other discounts</Label>
        </div>
      </div>

      {/* Status */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Status</h3>

        <div className="flex items-center space-x-2">
          <Switch id="active" defaultChecked />
          <Label htmlFor="active">Discount is active</Label>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline">
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button className="bg-green-600 hover:bg-green-700">
          <Save className="mr-2 h-4 w-4" />
          Save Discount
        </Button>
      </div>
    </form>
  )
}

"use client"

import { useState } from "react"
import { Edit, Trash2, Eye, Search, Filter } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type Discount = {
  id: string
  name: string
  code: string
  type: "percentage" | "fixed" | "buy-get"
  value: string
  status: "active" | "inactive" | "expired"
  startDate: string
  endDate: string
  used: number
  maxUses: number | null
  totalSavings: number
}

export function DiscountList() {
  const [discounts] = useState<Discount[]>([
    {
      id: "1",
      name: "Summer Sale",
      code: "SUMMER20",
      type: "percentage",
      value: "20%",
      status: "active",
      startDate: "2023-06-01",
      endDate: "2023-08-31",
      used: 45,
      maxUses: 100,
      totalSavings: 890.5,
    },
    {
      id: "2",
      name: "New Customer Discount",
      code: "WELCOME10",
      type: "fixed",
      value: "$10",
      status: "active",
      startDate: "2023-01-01",
      endDate: "2023-12-31",
      used: 123,
      maxUses: null,
      totalSavings: 1230.0,
    },
    {
      id: "3",
      name: "Buy 2 Get 1 Free",
      code: "BUY2GET1",
      type: "buy-get",
      value: "Buy 2 Get 1",
      status: "active",
      startDate: "2023-05-15",
      endDate: "2023-06-15",
      used: 28,
      maxUses: 50,
      totalSavings: 420.25,
    },
    {
      id: "4",
      name: "Flash Sale",
      code: "FLASH15",
      type: "percentage",
      value: "15%",
      status: "expired",
      startDate: "2023-04-01",
      endDate: "2023-04-30",
      used: 67,
      maxUses: 100,
      totalSavings: 1005.75,
    },
    {
      id: "5",
      name: "Student Discount",
      code: "STUDENT5",
      type: "fixed",
      value: "$5",
      status: "inactive",
      startDate: "2023-09-01",
      endDate: "2023-12-31",
      used: 0,
      maxUses: 200,
      totalSavings: 0,
    },
  ])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Active Discounts</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search discounts..." className="pl-8 w-[200px] lg:w-[300px]" />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Savings</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>End Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {discounts.map((discount) => (
              <TableRow key={discount.id}>
                <TableCell className="font-medium">{discount.name}</TableCell>
                <TableCell>
                  <code className="bg-muted px-2 py-1 rounded text-sm">{discount.code}</code>
                </TableCell>
                <TableCell className="capitalize">{discount.type}</TableCell>
                <TableCell>{discount.value}</TableCell>
                <TableCell>
                  {discount.used}
                  {discount.maxUses ? `/${discount.maxUses}` : ""}
                </TableCell>
                <TableCell>${discount.totalSavings.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      discount.status === "active"
                        ? "outline"
                        : discount.status === "expired"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {discount.status}
                  </Badge>
                </TableCell>
                <TableCell>{discount.endDate}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>{discount.name}</DialogTitle>
                          <DialogDescription>Discount details and usage statistics</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium">Code</p>
                              <p className="text-sm text-muted-foreground">{discount.code}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Type</p>
                              <p className="text-sm text-muted-foreground capitalize">{discount.type}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Value</p>
                              <p className="text-sm text-muted-foreground">{discount.value}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Status</p>
                              <Badge variant="outline">{discount.status}</Badge>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Times Used</p>
                              <p className="text-sm text-muted-foreground">
                                {discount.used}
                                {discount.maxUses ? ` of ${discount.maxUses}` : ""}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Total Savings</p>
                              <p className="text-sm text-muted-foreground">${discount.totalSavings.toFixed(2)}</p>
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline">Close</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Button variant="ghost" size="icon">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

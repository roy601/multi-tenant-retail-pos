"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/utils/supabase/component"
import { useRole } from "@/components/role-provider"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Store, Loader2, Plus, Trash2 } from "lucide-react"
import type { Organization } from "@/types/database"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

export default function SelectShopPage() {
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()
  const { user, role, setOrganization, isLoading: authLoading } = useRole()
  const [shops, setShops] = useState<Organization[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddShop, setShowAddShop] = useState(false)
  const [newShopForm, setNewShopForm] = useState({
    name: "",
    address: "",
    phone: ""
  })
  const [isCreating, setIsAddShopLoading] = useState(false)
  const [shopToDelete, setShopToDelete] = useState<Organization | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const loadShops = async () => {
    if (!user) return

    console.log('Fetching shops for user:', user.id);
    
    const { data, error } = await supabase
      .from('user_organizations')
      .select(`
        organization_id,
        organizations (*)
      `)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error fetching shops:', error);
      return;
    }

    if (data) {
      const loadedShops = data
        .map(item => {
          const org = item.organizations;
          return Array.isArray(org) ? org[0] : org;
        })
        .filter(Boolean) as Organization[];
      
      console.log('Loaded shops:', loadedShops);
      setShops(loadedShops);
    }
    setIsLoading(false)
  }

  useEffect(() => {
    if (!authLoading) {
      if (role === 'manager') {
        router.push("/main")
      } else {
        loadShops()
      }
    }
  }, [user, role, authLoading, router])

  const handleSelect = (shop: Organization) => {
    setOrganization(shop)
    router.push("/main")
  }

  const handleDeleteShop = async () => {
    if (!shopToDelete) return
    setIsDeleting(true)
    try {
      const { data, error } = await supabase.rpc('delete_organization', {
        p_org_id: shopToDelete.id
      })
      if (error) throw error
      if (data?.success) {
        toast({ title: "Shop deleted", description: "The shop has been removed from your account." })
        
        // If deleted shop was the selected one, clear it
        const savedOrg = localStorage.getItem("selected_organization")
        if (savedOrg) {
          const parsed = JSON.parse(savedOrg)
          if (parsed.id === shopToDelete.id) {
            localStorage.removeItem("selected_organization")
          }
        }
        
        await loadShops()
      } else {
        throw new Error(data?.message || "Failed to delete shop")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete shop",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setShopToDelete(null)
    }
  }

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newShopForm.name) return

    setIsAddShopLoading(true)
    try {
      const { data, error } = await supabase.rpc('create_new_shop', {
        p_org_name: newShopForm.name,
        p_address: newShopForm.address,
        p_phone: newShopForm.phone
      })

      if (error) throw error
      if (data?.success) {
        toast({ title: "Success", description: "New shop created successfully!" })
        setShowAddShop(false)
        setNewShopForm({ name: "", address: "", phone: "" })
        await loadShops()
      } else {
        throw new Error(data?.message || "Failed to create shop")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create shop",
        variant: "destructive",
      })
    } finally {
      setIsAddShopLoading(false)
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-2xl space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Welcome back, {user?.full_name}</h1>
          <p className="mt-2 text-gray-600">Please select a shop to manage</p>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => setShowAddShop(true)} className="bg-green-600 hover:bg-green-700">
            <Plus className="mr-2 h-4 w-4" />
            Create New Shop
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {shops.map((shop) => (
            <Card 
              key={shop.id} 
              className="relative group hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-green-500"
              onClick={() => handleSelect(shop)}
            >
              {/* Delete Button for Owners */}
              {user?.role === 'owner' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-600 hover:bg-red-50 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShopToDelete(shop);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              
              <CardHeader className="flex flex-row items-center space-x-4 pb-2">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Store className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">{shop.name}</CardTitle>
                  <CardDescription>{shop.address || "No address provided"}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full mt-2 group-hover:bg-green-600 group-hover:text-white">
                  Enter Shop
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {shops.length === 0 && (
          <div className="text-center p-8 bg-white rounded-lg shadow border border-dashed border-gray-300">
            <p className="text-gray-500">No shops found for your account.</p>
            <Button variant="link" onClick={() => router.push("/signup")} className="mt-2">
              Create a new shop
            </Button>
          </div>
        )}

        <div className="text-center">
          <Button variant="ghost" onClick={() => router.push("/login")}>
            Log in with a different account
          </Button>
        </div>
      </div>

      <Dialog open={showAddShop} onOpenChange={setShowAddShop}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Shop</DialogTitle>
            <DialogDescription>
              Add another shop to your account. You can switch between shops anytime.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateShop}>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Shop Name *</Label>
                <Input
                  id="name"
                  value={newShopForm.name}
                  onChange={(e) => setNewShopForm({ ...newShopForm, name: e.target.value })}
                  placeholder="e.g. Downtown Branch"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={newShopForm.address}
                  onChange={(e) => setNewShopForm({ ...newShopForm, address: e.target.value })}
                  placeholder="Street, City"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={newShopForm.phone}
                  onChange={(e) => setNewShopForm({ ...newShopForm, phone: e.target.value })}
                  placeholder="+1234567890"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowAddShop(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating} className="bg-green-600 hover:bg-green-700">
                {isCreating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Create Shop
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Shop Confirmation */}
      <AlertDialog open={!!shopToDelete} onOpenChange={(open) => !open && setShopToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the shop <span className="font-bold">{shopToDelete?.name}</span> and all of its associated data. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDeleteShop();
              }}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={isDeleting}
            >
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Delete Shop
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

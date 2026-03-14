"use client"

import { useEffect, useState } from "react"
import { Plus, Settings, Store, Users, Save, AlertTriangle, Trash2, Edit2, Eye, EyeOff, LogOut } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/utils/supabase/component"
import { useRole } from "@/components/role-provider"
import type { User, Organization, UserRole, BankNames } from "@/types/database"
import { 
  getCurrentUser, 
  getCurrentUserOrganization, 
  getOrganizationUsers,
  createUser,
  updateUser,
  deleteUser,
  updateOrganization,
} from "@/lib/auth-utils"

type UserWithDisplay = User & {
  display_status: string
  display_last_login: string
}

export function SettingsClient() {
  const supabase = createClient()
  const { toast } = useToast()
  
  // State
  const { user: roleUser, organization: roleOrg, setOrganization: setRoleOrg } = useRole()
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [allOwnedOrgs, setAllOwnedOrgs] = useState<Organization[]>([])
  const [users, setUsers] = useState<UserWithDisplay[]>([])
  
  // UI State
  const [showAddUser, setShowAddUser] = useState(false)
  const [showEditUser, setShowEditUser] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserWithDisplay | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showSmtpPassword, setShowSmtpPassword] = useState(false)
  
  // Form State
  const [storeSettings, setStoreSettings] = useState({
    name: "",
    phone: "",
    address: "",
  })

  const [bankNamesSettings, setBankNamesSettings] = useState<BankNames>({
    bkash: "",
    nagad: "",
    rocket: "",
    upay: "",
    card: "",
    bank_transfer: "",
  })

  const [emailSettings, setEmailSettings] = useState({
    smtp_email: "",
    smtp_password: "",
  })

  const [userForm, setUserForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    role: "manager" as UserRole,
  })

  // Load data on mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Use role context first, then fallback to utils
      const user = roleUser || await getCurrentUser(supabase)
      setCurrentUser(user)
      
      if (!user) {
        toast({
          title: "Error",
          description: "Failed to load user profile",
          variant: "destructive",
        })
        return
      }

      // Get organization from context
      let org = roleOrg
      setOrganization(org)
      
      if (org) {
        setStoreSettings({
          name: org.name || "",
          phone: org.phone || "",
          address: org.address || "",
        })
        // Load SMTP settings and bank_names from DB
        const { data: orgFull } = await supabase
          .from('organizations')
          .select('smtp_email, smtp_password, bank_names')
          .eq('id', org.id)
          .single()
        if (orgFull) {
          setEmailSettings({
            smtp_email: (orgFull as any).smtp_email || "",
            smtp_password: (orgFull as any).smtp_password || "",
          })
          const bn = (orgFull as any).bank_names || {}
          setBankNamesSettings({
            bkash: bn.bkash || "",
            nagad: bn.nagad || "",
            rocket: bn.rocket || "",
            upay: bn.upay || "",
            card: bn.card || "",
            bank_transfer: bn.bank_transfer || "",
          })
        }
      }

      // Load all owned organizations if owner
      if (user.role === 'owner') {
        const { data: ownedOrgs } = await supabase
          .from('user_organizations')
          .select('organizations(*)')
          .eq('user_id', user.id)
          .eq('role', 'owner')
        
        if (ownedOrgs) {
          setAllOwnedOrgs(ownedOrgs.map(o => Array.isArray(o.organizations) ? o.organizations[0] : o.organizations).filter(Boolean) as Organization[])
        }

        // Fetch users specifically for the active organization to ensure separation
        const orgUsers = await getOrganizationUsers(supabase, org?.id)
        const usersWithDisplay = orgUsers.map(u => ({
          ...u,
          display_status: u.is_active ? "Active" : "Inactive",
          display_last_login: u.last_login 
            ? new Date(u.last_login).toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })
            : "Never",
        }))
        setUsers(usersWithDisplay)
      }
      
    } catch (error) {
      console.error('Error loading data:', error)
      toast({
        title: "Error",
        description: "Failed to load settings data",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSwitchShop = (orgId: string) => {
    const selected = allOwnedOrgs.find(o => o.id === orgId)
    if (selected) {
      setRoleOrg(selected)
      setOrganization(selected)
      setStoreSettings({
        name: selected.name || "",
        phone: selected.phone || "",
        address: selected.address || "",
      })
      toast({
        title: "Shop Switched",
        description: `Now managing ${selected.name}`,
      })
      setTimeout(() => {
        window.location.reload()
      }, 500)
    }
  }

  // Handle store settings save
  const handleSaveStoreSettings = async () => {
    if (!currentUser || (currentUser.role !== 'owner' && currentUser.role !== 'manager')) {
      toast({
        title: "Access Denied",
        description: "You do not have permission to modify store settings.",
        variant: "destructive",
      })
      return
    }

    try {
      const result = await updateOrganization(supabase, {
        name: storeSettings.name,
        phone: storeSettings.phone,
        address: storeSettings.address,
      })

      if (result.success) {
        toast({
          title: "Settings Saved",
          description: "Store settings have been updated successfully.",
        })
        await loadData()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save settings",
        variant: "destructive",
      })
    }
  }

  // Handle save bank names settings
  const handleSaveBankNames = async () => {
    if (!currentUser || currentUser.role !== 'owner') {
      toast({
        title: "Access Denied",
        description: "Only owners can configure bank names.",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          bank_names: bankNamesSettings,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', organization!.id)

      if (error) throw error

      toast({
        title: "Bank Names Saved",
        description: "Payment method bank names updated successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save bank names",
        variant: "destructive",
      })
    }
  }

  // Handle save email settings
  const handleSaveEmailSettings = async () => {
    if (!currentUser || currentUser.role !== 'owner') {
      toast({
        title: "Access Denied",
        description: "Only owners can configure email settings.",
        variant: "destructive",
      })
      return
    }

    if (!emailSettings.smtp_email || !emailSettings.smtp_password) {
      toast({
        title: "Error",
        description: "Please enter both Gmail address and App Password.",
        variant: "destructive",
      })
      return
    }

    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          smtp_email: emailSettings.smtp_email,
          smtp_password: emailSettings.smtp_password,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', organization!.id)

      if (error) throw error

      toast({
        title: "Email Settings Saved",
        description: "Gmail credentials updated successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save email settings",
        variant: "destructive",
      })
    }
  }

  // Handle add user
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentUser || currentUser.role !== 'owner') {
      toast({
        title: "Access Denied",
        description: "Only owners can add users.",
        variant: "destructive",
      })
      return
    }

    try {
      const result = await createUser(supabase, {
        ...userForm,
        organization_id: organization?.id
      })

      if (result.success) {
        toast({
          title: "User Added",
          description: `${userForm.full_name} has been added successfully.`,
        })
        setShowAddUser(false)
        resetUserForm()
        await loadData()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add user",
        variant: "destructive",
      })
    }
  }

  // Handle edit user
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!currentUser || currentUser.role !== 'owner' || !selectedUser) {
      return
    }

    try {
      const result = await updateUser(supabase, selectedUser.id, {
        full_name: userForm.full_name,
        phone: userForm.phone || null,
        role: userForm.role,
      }, organization?.id)

      if (result.success) {
        toast({
          title: "User Updated",
          description: "User has been updated successfully.",
        })
        setShowEditUser(false)
        setSelectedUser(null)
        resetUserForm()
        await loadData()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update user",
        variant: "destructive",
      })
    }
  }

  // Handle delete user
  const handleDeleteUser = async () => {
    if (!selectedUser) return

    try {
      const result = await deleteUser(supabase, selectedUser.id, organization?.id)

      if (result.success) {
        toast({
          title: "User Deleted",
          description: "User has been removed successfully.",
        })
        setShowDeleteConfirm(false)
        setSelectedUser(null)
        await loadData()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete user",
        variant: "destructive",
      })
    }
  }

  // Handle toggle user status
  const handleToggleUserStatus = async (user: UserWithDisplay) => {
    if (!currentUser || currentUser.role !== 'owner') {
      return
    }

    try {
      const result = await updateUser(supabase, user.id, {
        is_active: !user.is_active,
      }, organization?.id)

      if (result.success) {
        toast({
          title: "Status Updated",
          description: `User has been ${!user.is_active ? 'activated' : 'deactivated'}.`,
        })
        await loadData()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update status",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (user: UserWithDisplay) => {
    setSelectedUser(user)
    setUserForm({
      full_name: user.full_name,
      email: user.email,
      phone: user.phone || "",
      password: "",
      role: user.role,
    })
    setShowEditUser(true)
  }

  const openDeleteDialog = (user: UserWithDisplay) => {
    setSelectedUser(user)
    setShowDeleteConfirm(true)
  }

  const resetUserForm = () => {
    setUserForm({
      full_name: "",
      email: "",
      phone: "",
      password: "",
      role: "manager",
    })
    setShowPassword(false)
  }

  // Handle password update
  const handleUpdatePassword = async (userId: string) => {
    const newPassword = prompt("Enter new password for this user:");
    if (!newPassword || newPassword.length < 6) {
      toast({
        title: "Invalid Password",
        description: "Password must be at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.rpc('admin_update_user_password', {
        p_user_id: userId,
        p_new_password: newPassword
      });

      if (error) throw error;
      if (data?.success) {
        toast({ title: "Success", description: "Password updated successfully." });
      } else {
        throw new Error(data?.message || "Failed to update password");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update password",
        variant: "destructive",
      });
    }
  }

  // Handle email update
  const handleUpdateEmail = async (userId: string) => {
    const newEmail = prompt("Enter new email for this user:");
    if (!newEmail || !newEmail.includes("@")) {
      toast({
        title: "Invalid Email",
        description: "Please enter a valid email address.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.rpc('admin_update_user_email', {
        p_user_id: userId,
        p_new_email: newEmail
      });

      if (error) throw error;
      if (data?.success) {
        toast({ title: "Success", description: "Email updated successfully." });
        await loadData();
      } else {
        throw new Error(data?.message || "Failed to update email");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update email",
        variant: "destructive",
      });
    }
  }

  const getAvailableTabs = () => {
    const tabs = []

    if (currentUser?.role === 'owner') {
      tabs.push({ value: "users", label: "Users" })
    }
    
    // Store settings available to both owners and managers
    if (currentUser?.role === 'owner' || currentUser?.role === 'manager') {
      tabs.push({ value: "store", label: "Store Settings" })
    }

    // Bank names settings only for owners
    if (currentUser?.role === 'owner') {
      tabs.push({ value: "bank_names", label: "Bank Names" })
    }

    // Email settings only for owners
    if (currentUser?.role === 'owner') {
      tabs.push({ value: "email", label: "Email Settings" })
    }

    return tabs
  }

  const availableTabs = getAvailableTabs()
  const defaultTab = availableTabs.length > 0 ? availableTabs[0].value : "store"

  if (loading) {
    return (
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading settings...</p>
        </div>
      </div>
    )
  }

  if (availableTabs.length === 0) {
    return (
      <div className="flex-1 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Settings</h1>
        </div>
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access any settings. Contact your administrator.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your store settings and users
          </p>
        </div>
        <div className="flex items-center gap-4">
          {currentUser?.role === 'owner' && allOwnedOrgs.length > 1 && (
            <div className="flex flex-col items-end gap-1">
              <Label className="text-xs text-muted-foreground">Active Shop</Label>
              <Select value={organization?.id} onValueChange={handleSwitchShop}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select Shop" />
                </SelectTrigger>
                <SelectContent>
                  {allOwnedOrgs.map(org => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {organization && (
            <Badge variant="outline" className="text-lg px-4 py-2">
              {organization.name}
            </Badge>
          )}
          <Button 
            variant="outline" 
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={async () => {
              await supabase.auth.signOut()
              window.location.href = '/login'
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* User Info Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Logged in as</p>
              <p className="text-lg font-semibold">{currentUser?.full_name}</p>
              <p className="text-sm text-muted-foreground">{currentUser?.email}</p>
            </div>
            <Badge variant={currentUser?.role === 'owner' ? 'default' : 'secondary'}>
              {currentUser?.role === 'owner' ? 'Shop Owner' : 'Manager'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList>
          {availableTabs.map(tab => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Users Tab - Owner Only */}
        {currentUser?.role === 'owner' && (
          <TabsContent value="users" className="space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle className="flex items-center">
                    <Users className="mr-2 h-5 w-5" />
                    User Management
                  </CardTitle>
                  <CardDescription>Manage shop users and their roles</CardDescription>
                </div>
                <Button onClick={() => {
                  resetUserForm()
                  setShowAddUser(true)
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No users found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.full_name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{user.phone || "-"}</TableCell>
                          <TableCell>
                            <Badge variant={user.role === 'owner' ? 'default' : 'secondary'} className="capitalize">
                              {user.role}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.is_active ? 'default' : 'destructive'} className={user.is_active ? 'bg-green-100 text-green-800 hover:bg-green-100' : ''}>
                              {user.display_status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {user.display_last_login}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 justify-end">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => openEditDialog(user)}
                                disabled={user.id === currentUser?.id}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                title="Update Email"
                                onClick={() => handleUpdateEmail(user.id)}
                                disabled={user.id === currentUser?.id}
                              >
                                <Users className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                title="Reset Password"
                                onClick={() => handleUpdatePassword(user.id)}
                                disabled={user.id === currentUser?.id}
                              >
                                <Settings className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleToggleUserStatus(user)}
                                disabled={user.id === currentUser?.id}
                              >
                                {user.is_active ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="text-destructive hover:text-destructive"
                                onClick={() => openDeleteDialog(user)}
                                disabled={user.id === currentUser?.id}
                              >
                                <Trash2 className="h-4 w-4" />
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
          </TabsContent>
        )}

        {/* Store Settings Tab - Owner and Manager */}
        {(currentUser?.role === 'owner' || currentUser?.role === 'manager') && (
          <TabsContent value="store" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Store className="mr-2 h-5 w-5" />
                  Store Information
                </CardTitle>
                <CardDescription>Update your store details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="store-name">Store Name</Label>
                  <Input
                    id="store-name"
                    value={storeSettings.name}
                    onChange={(e) => setStoreSettings({ ...storeSettings, name: e.target.value })}
                    placeholder="Enter store name"
                  />
                </div>
                <div>
                  <Label htmlFor="store-phone">Phone Number</Label>
                  <Input
                    id="store-phone"
                    value={storeSettings.phone}
                    onChange={(e) => setStoreSettings({ ...storeSettings, phone: e.target.value })}
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="store-address">Address</Label>
                  <Input
                    id="store-address"
                    value={storeSettings.address}
                    onChange={(e) => setStoreSettings({ ...storeSettings, address: e.target.value })}
                    placeholder="Enter store address"
                  />
                </div>
                <Button onClick={handleSaveStoreSettings}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Store Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Email Settings Tab - Owner Only */}
        {currentUser?.role === 'owner' && (
          <TabsContent value="email" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="mr-2 h-5 w-5" />
                  Email Settings
                </CardTitle>
                <CardDescription>
                  Configure Gmail to auto-send invoices to customers after each sale.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-md bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800 space-y-1">
                  <p className="font-semibold">How to set up Gmail:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Go to your Google Account → Security</li>
                    <li>Enable 2-Step Verification</li>
                    <li>Search for &quot;App Passwords&quot; and create one for "Mobile POS"</li>
                    <li>Paste the 16-character App Password below</li>
                  </ol>
                </div>
                <div>
                  <Label htmlFor="smtp-email">Gmail Address</Label>
                  <Input
                    id="smtp-email"
                    type="email"
                    value={emailSettings.smtp_email}
                    onChange={(e) => setEmailSettings({ ...emailSettings, smtp_email: e.target.value })}
                    placeholder="yourname@gmail.com"
                  />
                </div>
                <div>
                  <Label htmlFor="smtp-password">Gmail App Password</Label>
                  <div className="relative">
                    <Input
                      id="smtp-password"
                      type={showSmtpPassword ? "text" : "password"}
                      value={emailSettings.smtp_password}
                      onChange={(e) => setEmailSettings({ ...emailSettings, smtp_password: e.target.value })}
                      placeholder="xxxx xxxx xxxx xxxx"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                    >
                      {showSmtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    This is your Gmail App Password, not your regular Gmail password.
                  </p>
                </div>
                <Button onClick={handleSaveEmailSettings}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Email Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Bank Names Tab - Owner Only */}
        {currentUser?.role === 'owner' && (
          <TabsContent value="bank_names" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Settings className="mr-2 h-5 w-5" />
                  Bank Names for Payment Methods
                </CardTitle>
                <CardDescription>
                  Set which bank name appears in Bank Info for each payment method. Leave blank to use the default name.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="bank-bkash">bKash</Label>
                    <Input
                      id="bank-bkash"
                      value={bankNamesSettings.bkash || ""}
                      onChange={(e) => setBankNamesSettings({ ...bankNamesSettings, bkash: e.target.value })}
                      placeholder="e.g. BRAC Bank Limited"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bank-nagad">Nagad</Label>
                    <Input
                      id="bank-nagad"
                      value={bankNamesSettings.nagad || ""}
                      onChange={(e) => setBankNamesSettings({ ...bankNamesSettings, nagad: e.target.value })}
                      placeholder="e.g. Dutch-Bangla Bank"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bank-rocket">Rocket</Label>
                    <Input
                      id="bank-rocket"
                      value={bankNamesSettings.rocket || ""}
                      onChange={(e) => setBankNamesSettings({ ...bankNamesSettings, rocket: e.target.value })}
                      placeholder="e.g. Dutch-Bangla Bank Limited"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bank-upay">Upay</Label>
                    <Input
                      id="bank-upay"
                      value={bankNamesSettings.upay || ""}
                      onChange={(e) => setBankNamesSettings({ ...bankNamesSettings, upay: e.target.value })}
                      placeholder="e.g. UCB Bank"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bank-card">Card Payment</Label>
                    <Input
                      id="bank-card"
                      value={bankNamesSettings.card || ""}
                      onChange={(e) => setBankNamesSettings({ ...bankNamesSettings, card: e.target.value })}
                      placeholder="e.g. City Bank (default from sale)"
                    />
                    <p className="text-xs text-muted-foreground mt-1">If set, overrides the bank entered at POS during card payment.</p>
                  </div>
                  <div>
                    <Label htmlFor="bank-transfer">Bank Transfer</Label>
                    <Input
                      id="bank-transfer"
                      value={bankNamesSettings.bank_transfer || ""}
                      onChange={(e) => setBankNamesSettings({ ...bankNamesSettings, bank_transfer: e.target.value })}
                      placeholder="e.g. Southeast Bank (default from sale)"
                    />
                    <p className="text-xs text-muted-foreground mt-1">If set, overrides the bank entered at POS during bank transfer.</p>
                  </div>
                </div>
                <Button onClick={handleSaveBankNames}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Bank Names
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Add User Dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create a new manager account for your shop.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUser}>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="add-name">Full Name *</Label>
                <Input
                  id="add-name"
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="add-email">Email *</Label>
                <Input
                  id="add-email"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="Enter email address"
                  required
                />
              </div>
              <div>
                <Label htmlFor="add-phone">Phone</Label>
                <Input
                  id="add-phone"
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <Label htmlFor="add-password">Password *</Label>
                <div className="relative">
                  <Input
                    id="add-password"
                    type={showPassword ? "text" : "password"}
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    placeholder="Enter password"
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum 6 characters
                </p>
              </div>
              <div>
                <Label htmlFor="add-role">Role *</Label>
                <Select
                  value={userForm.role}
                  onValueChange={(value: UserRole) => setUserForm({ ...userForm, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setShowAddUser(false)
                resetUserForm()
              }}>
                Cancel
              </Button>
              <Button type="submit">Create User</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditUser} onOpenChange={setShowEditUser}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditUser}>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="edit-name">Full Name *</Label>
                <Input
                  id="edit-name"
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email (Cannot be changed)</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={userForm.email}
                  disabled
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">Phone</Label>
                <Input
                  id="edit-phone"
                  value={userForm.phone}
                  onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <Label htmlFor="edit-role">Role *</Label>
                <Select
                  value={userForm.role}
                  onValueChange={(value: UserRole) => setUserForm({ ...userForm, role: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="owner">Owner</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => {
                setShowEditUser(false)
                setSelectedUser(null)
                resetUserForm()
              }}>
                Cancel
              </Button>
              <Button type="submit">Update User</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the user <strong>{selectedUser?.full_name}</strong> and remove their access to the system.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteConfirm(false)
              setSelectedUser(null)
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
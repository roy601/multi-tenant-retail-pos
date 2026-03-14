"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { createClient } from "@/utils/supabase/component"
import type { User, UserRole, Permission, Organization } from "@/types/database"
import { hasPermission as checkPermission } from "@/types/database"
import { useRouter, usePathname } from "next/navigation"

interface RoleContextType {
  user: User | null
  role: UserRole | null
  organization: Organization | null
  isLoading: boolean
  setOrganization: (org: Organization) => void
  logout: () => Promise<void>
  isAdmin: () => boolean
  isManager: () => boolean
  hasPermission: (permission: Permission) => boolean
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

export function RoleProvider({ children }: { children: ReactNode }) {
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [organization, setOrgState] = useState<Organization | null>(() => {
    // Synchronous initialization from localStorage to prevent "flicker" or default shop issues
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("selected_organization")
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.error("Failed to parse saved organization", e)
          return null
        }
      }
    }
    return null
  })
  const [isLoading, setIsLoading] = useState(true)

  const setOrganization = async (org: Organization) => {
    setOrgState(org)
    if (typeof window !== "undefined") {
      localStorage.setItem("selected_organization", JSON.stringify(org))
    }
  }

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()
        
        if (authUser) {
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .single()
          
          if (profile) {
            setUser(profile as User)
            setRole(profile.role as UserRole)

            // For managers, we still want to auto-load their one and only org
            if (profile.role === 'manager' && !organization) {
              const { data: userOrg } = await supabase
                .from('user_organizations')
                .select('organizations(*)')
                .eq('user_id', authUser.id)
                .single()
              
              if (userOrg?.organizations) {
                const org = Array.isArray(userOrg.organizations) 
                  ? userOrg.organizations[0] 
                  : userOrg.organizations;
                if (org) {
                  setOrganization(org as Organization)
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Error loading user in RoleProvider:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadUser()
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setRole(null)
        setOrgState(null)
        localStorage.removeItem("selected_organization")
        setIsLoading(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Protected route check
  useEffect(() => {
    if (!isLoading) {
      const publicPaths = ["/login", "/signup", "/error"]
      if (!user && !publicPaths.includes(pathname)) {
        router.push("/login")
      } else if (user && role === 'owner' && !organization && pathname !== "/select-shop" && !publicPaths.includes(pathname)) {
        router.push("/select-shop")
      }
    }
  }, [user, role, organization, isLoading, pathname, router])

  const contextValue: RoleContextType = {
    user,
    role,
    organization,
    isLoading,
    setOrganization,
    logout: async () => {
      await supabase.auth.signOut()
      localStorage.removeItem("selected_organization")
      router.push("/login")
    },
    isAdmin: () => role === 'owner',
    isManager: () => role === 'manager',
    hasPermission: (permission: Permission) => {
      if (!role) return false
      return checkPermission(role, permission)
    },
  }

  return <RoleContext.Provider value={contextValue}>{children}</RoleContext.Provider>
}

export function useRole(): RoleContextType {
  const context = useContext(RoleContext)
  if (context === undefined) {
    throw new Error("useRole must be used within a RoleProvider")
  }
  return context
}

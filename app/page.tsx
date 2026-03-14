"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useRole } from "@/components/role-provider"

export default function Home() {
  const { user, isLoading } = useRole()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.push("/main")
      } else {
        router.push("/login")
      }
    }
  }, [user, isLoading, router])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Loading...</p>
    </div>
  )
}
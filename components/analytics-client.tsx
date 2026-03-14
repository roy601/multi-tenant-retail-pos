"use client"

import { useState } from "react"
import { Calendar, CalendarDays } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DayCashbook } from "@/components/day-cashbook"

export function AnalyticsClient() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0])

  const handleDateChange = (date: string) => {
    setSelectedDate(date)
  }

  return (
    <div className="flex-1 p-6 space-y-6">
      {/* Day Cashbook */}
      <Card>
        <CardHeader>
          <CardTitle>
            Day Cashbook -{" "}
            {new Date(selectedDate).toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </CardTitle>
          <CardDescription>Complete financial summary for the selected date</CardDescription>
        </CardHeader>
        <CardContent>
          <DayCashbook />
        </CardContent>
      </Card>
    </div>
  )
}

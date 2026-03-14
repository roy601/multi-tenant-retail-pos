"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface POSCalculatorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function POSCalculator({ open, onOpenChange }: POSCalculatorProps) {
  const [display, setDisplay] = useState("0")
  const [previousValue, setPreviousValue] = useState<number | null>(null)
  const [operation, setOperation] = useState<string | null>(null)
  const [waitingForOperand, setWaitingForOperand] = useState(false)

  const inputNumber = (num: string) => {
    if (waitingForOperand) {
      setDisplay(num)
      setWaitingForOperand(false)
    } else {
      setDisplay(display === "0" ? num : display + num)
    }
  }

  const inputOperation = (nextOperation: string) => {
    const inputValue = Number.parseFloat(display)

    if (previousValue === null) {
      setPreviousValue(inputValue)
    } else if (operation) {
      const currentValue = previousValue || 0
      const newValue = calculate(currentValue, inputValue, operation)

      setDisplay(String(newValue))
      setPreviousValue(newValue)
    }

    setWaitingForOperand(true)
    setOperation(nextOperation)
  }

  const calculate = (firstValue: number, secondValue: number, operation: string) => {
    switch (operation) {
      case "+":
        return firstValue + secondValue
      case "-":
        return firstValue - secondValue
      case "×":
        return firstValue * secondValue
      case "÷":
        return firstValue / secondValue
      case "=":
        return secondValue
      default:
        return secondValue
    }
  }

  const performCalculation = () => {
    const inputValue = Number.parseFloat(display)

    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation)
      setDisplay(String(newValue))
      setPreviousValue(null)
      setOperation(null)
      setWaitingForOperand(true)
    }
  }

  const clear = () => {
    setDisplay("0")
    setPreviousValue(null)
    setOperation(null)
    setWaitingForOperand(false)
  }

  const clearEntry = () => {
    setDisplay("0")
  }

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay("0.")
      setWaitingForOperand(false)
    } else if (display.indexOf(".") === -1) {
      setDisplay(display + ".")
    }
  }

  const percentage = () => {
    const value = Number.parseFloat(display)
    setDisplay(String(value / 100))
  }

  const toggleSign = () => {
    if (display !== "0") {
      setDisplay(display.charAt(0) === "-" ? display.slice(1) : "-" + display)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[350px]">
        <DialogHeader>
          <DialogTitle>Calculator</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Display */}
          <div className="bg-gray-100 p-4 rounded-lg text-right">
            <div className="text-2xl font-mono font-bold overflow-hidden">{display}</div>
          </div>

          {/* Buttons */}
          <div className="grid grid-cols-4 gap-2">
            {/* Row 1 */}
            <Button variant="outline" onClick={clear} className="bg-red-100 hover:bg-red-200">
              C
            </Button>
            <Button variant="outline" onClick={clearEntry} className="bg-orange-100 hover:bg-orange-200">
              CE
            </Button>
            <Button variant="outline" onClick={percentage} className="bg-orange-100 hover:bg-orange-200">
              %
            </Button>
            <Button variant="outline" onClick={() => inputOperation("÷")} className="bg-blue-100 hover:bg-blue-200">
              ÷
            </Button>

            {/* Row 2 */}
            <Button variant="outline" onClick={() => inputNumber("7")}>
              7
            </Button>
            <Button variant="outline" onClick={() => inputNumber("8")}>
              8
            </Button>
            <Button variant="outline" onClick={() => inputNumber("9")}>
              9
            </Button>
            <Button variant="outline" onClick={() => inputOperation("×")} className="bg-blue-100 hover:bg-blue-200">
              ×
            </Button>

            {/* Row 3 */}
            <Button variant="outline" onClick={() => inputNumber("4")}>
              4
            </Button>
            <Button variant="outline" onClick={() => inputNumber("5")}>
              5
            </Button>
            <Button variant="outline" onClick={() => inputNumber("6")}>
              6
            </Button>
            <Button variant="outline" onClick={() => inputOperation("-")} className="bg-blue-100 hover:bg-blue-200">
              -
            </Button>

            {/* Row 4 */}
            <Button variant="outline" onClick={() => inputNumber("1")}>
              1
            </Button>
            <Button variant="outline" onClick={() => inputNumber("2")}>
              2
            </Button>
            <Button variant="outline" onClick={() => inputNumber("3")}>
              3
            </Button>
            <Button variant="outline" onClick={() => inputOperation("+")} className="bg-blue-100 hover:bg-blue-200">
              +
            </Button>

            {/* Row 5 */}
            <Button variant="outline" onClick={toggleSign}>
              ±
            </Button>
            <Button variant="outline" onClick={() => inputNumber("0")}>
              0
            </Button>
            <Button variant="outline" onClick={inputDecimal}>
              .
            </Button>
            <Button variant="outline" onClick={performCalculation} className="bg-green-100 hover:bg-green-200">
              =
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

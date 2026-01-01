import { useRef, useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface SaveLayoutDialogProps {
  isOpen: boolean
  onClose: () => void
  onSave: (name: string) => void
  initialName?: string
  isEditing?: boolean
}

export function SaveLayoutDialog({
  isOpen,
  onClose,
  onSave,
  initialName = "",
  isEditing = false,
}: SaveLayoutDialogProps) {
  const [name, setName] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setName(initialName || `Layout ${new Date().toLocaleDateString()}`)
      // Focus input after dialog opens
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 100)
    }
  }, [isOpen, initialName])

  const handleSave = () => {
    const trimmedName = name.trim()
    if (trimmedName) {
      onSave(trimmedName)
      onClose()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave()
    }
    if (e.key === "Escape") {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl -mt-3">{isEditing ? "Update Layout" : "Save Layout"}</DialogTitle>
        </DialogHeader>
        <div>
          <div className="space-y-2">
            <Label htmlFor="layout-name">Layout Name</Label>
            <Input
              ref={inputRef}
              id="layout-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter layout name..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>
            {isEditing ? "Update" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

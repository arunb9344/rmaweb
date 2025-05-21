"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Loader2, Plus, X } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

interface CustomFieldDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFieldSaved: (field: CustomField) => void
  editField?: CustomField | null
}

export interface CustomField {
  id?: string
  name: string
  label?: string
  type: string
  required: boolean
  defaultValue?: string
  options?: string[]
  description?: string
}

export function CustomFieldDialog({ open, onOpenChange, onFieldSaved, editField }: CustomFieldDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<CustomField>({
    id: "",
    name: "",
    label: "",
    type: "text",
    required: false,
    defaultValue: "",
    options: [],
    description: "",
  })
  const [newOption, setNewOption] = useState("")

  useEffect(() => {
    if (editField) {
      setFormData({
        id: editField.id || "",
        name: editField.name || "",
        label: editField.label || "",
        type: editField.type || "text",
        required: editField.required || false,
        defaultValue: editField.defaultValue || "",
        options: editField.options || [],
        description: editField.description || "",
      })
    } else {
      setFormData({
        id: "",
        name: "",
        label: "",
        type: "text",
        required: false,
        defaultValue: "",
        options: [],
        description: "",
      })
    }
  }, [editField, open])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSwitchChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }))
  }

  const handleAddOption = () => {
    if (!newOption.trim()) return

    setFormData((prev) => ({
      ...prev,
      options: [...(prev.options || []), newOption.trim()],
    }))
    setNewOption("")
  }

  const handleRemoveOption = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      options: prev.options?.filter((_, i) => i !== index) || [],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Field name is required",
        variant: "destructive",
      })
      return
    }

    // Generate a label if not provided
    if (!formData.label) {
      formData.label = formData.name
        .split(/(?=[A-Z])/)
        .join(" ")
        .replace(/^\w/, (c) => c.toUpperCase())
    }

    setIsLoading(true)

    try {
      await onFieldSaved(formData)

      // Reset form
      setFormData({
        id: "",
        name: "",
        label: "",
        type: "text",
        required: false,
        defaultValue: "",
        options: [],
        description: "",
      })

      onOpenChange(false)
    } catch (error) {
      console.error("Error saving custom field:", error)
      toast({
        title: "Error",
        description: "Failed to save custom field. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{editField ? "Edit Custom Field" : "Add Custom Field"}</DialogTitle>
            <DialogDescription>
              {editField ? "Update the custom field details" : "Create a new custom field for your RMA forms"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Field Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="e.g. warrantyPeriod (camelCase, no spaces)"
              />
              <p className="text-xs text-muted-foreground">Use camelCase without spaces (e.g. warrantyPeriod)</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="label">Field Label</Label>
              <Input
                id="label"
                name="label"
                value={formData.label}
                onChange={handleInputChange}
                placeholder="e.g. Warranty Period"
              />
              <p className="text-xs text-muted-foreground">
                Human-readable label shown to users (if empty, will be generated from name)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Field Type</Label>
              <Select name="type" value={formData.type} onValueChange={(value) => handleSelectChange("type", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select field type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="textarea">Text Area</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="tel">Phone</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="select">Dropdown</SelectItem>
                  <SelectItem value="checkbox">Checkbox</SelectItem>
                  <SelectItem value="switch">Switch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.type === "select" && (
              <div className="space-y-2">
                <Label>Options</Label>
                <div className="flex gap-2">
                  <Input value={newOption} onChange={(e) => setNewOption(e.target.value)} placeholder="Add an option" />
                  <Button type="button" onClick={handleAddOption} className="shrink-0">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {formData.options && formData.options.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {formData.options.map((option, index) => (
                      <div key={index} className="flex items-center justify-between bg-muted p-2 rounded-md">
                        <span>{option}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveOption(index)}
                          className="h-6 w-6 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-2">No options added yet</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="defaultValue">Default Value</Label>
              {formData.type === "textarea" ? (
                <Textarea
                  id="defaultValue"
                  name="defaultValue"
                  value={formData.defaultValue || ""}
                  onChange={handleInputChange}
                  placeholder="Default value (optional)"
                />
              ) : formData.type === "checkbox" || formData.type === "switch" ? (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="defaultChecked"
                    checked={formData.defaultValue === "true"}
                    onCheckedChange={(checked) => handleSelectChange("defaultValue", checked ? "true" : "false")}
                  />
                  <Label htmlFor="defaultChecked">Default to checked</Label>
                </div>
              ) : formData.type === "select" ? (
                <Select
                  value={formData.defaultValue || ""}
                  onValueChange={(value) => handleSelectChange("defaultValue", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select default value" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">No default</SelectItem>
                    {formData.options?.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="defaultValue"
                  name="defaultValue"
                  type={formData.type === "number" ? "number" : "text"}
                  value={formData.defaultValue || ""}
                  onChange={handleInputChange}
                  placeholder="Default value (optional)"
                />
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                value={formData.description || ""}
                onChange={handleInputChange}
                placeholder="Help text for this field (optional)"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <Label htmlFor="required" className="cursor-pointer">
                Required Field
              </Label>
              <Switch
                id="required"
                checked={formData.required}
                onCheckedChange={(checked) => handleSwitchChange("required", checked)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-blue-600 hover:bg-blue-700">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> {editField ? "Updating" : "Adding"}
                </>
              ) : editField ? (
                "Update Field"
              ) : (
                "Add Field"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

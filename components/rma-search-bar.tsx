"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, X } from "lucide-react"

interface RMASearchBarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  placeholder?: string
}

export function RMASearchBar({ searchQuery, onSearchChange, placeholder = "Search RMAs..." }: RMASearchBarProps) {
  const clearSearch = () => {
    onSearchChange("")
  }

  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="relative flex-1">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={placeholder}
          className="pl-8 pr-10"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <Button
        variant="outline"
        onClick={clearSearch}
        className={`transition-opacity ${searchQuery ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        tabIndex={searchQuery ? 0 : -1}
      >
        Clear
      </Button>
    </div>
  )
}

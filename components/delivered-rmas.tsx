"use client"
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Make sure to export the component as default
export default function DeliveredRMAs() {
  // Component implementation...
  return (
    <div>
      {/* Component content */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead>Brand</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Serial Number</TableHead>
              <TableHead>Problem</TableHead>
              <TableHead>Service Centre</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>{/* Table content */}</TableBody>
        </Table>
      </div>
    </div>
  )
}

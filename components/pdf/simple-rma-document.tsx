"use client"

import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer"

// Create styles with simpler properties
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    borderBottomStyle: "solid",
  },
  logo: {
    width: 120,
    height: 50,
  },
  companyInfo: {
    fontSize: 10,
    textAlign: "right",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  section: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 5,
    paddingBottom: 2,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    borderBottomStyle: "solid",
  },
  row: {
    flexDirection: "row",
    marginBottom: 5,
  },
  label: {
    width: "30%",
    fontSize: 10,
    fontWeight: "bold",
  },
  value: {
    width: "70%",
    fontSize: 10,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: "center",
    fontSize: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    borderTopStyle: "solid",
  },
  rmaBox: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderStyle: "solid",
    padding: 10,
    marginBottom: 10,
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: "bold",
    backgroundColor: "#1e40af",
    color: "#ffffff",
    padding: "4 8",
    alignSelf: "flex-start",
  },
  productTable: {
    marginTop: 10,
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    borderBottomStyle: "solid",
    backgroundColor: "#f9fafb",
    paddingVertical: 5,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    borderBottomStyle: "solid",
    paddingVertical: 5,
  },
  tableCell: {
    fontSize: 9,
    paddingHorizontal: 5,
  },
  col1: { width: "25%" },
  col2: { width: "20%" },
  col3: { width: "20%" },
  col4: { width: "35%" },
  productStatus: {
    fontSize: 8,
    fontWeight: "bold",
    backgroundColor: "#e5e7eb",
    color: "#374151",
    padding: "2 4",
    borderRadius: 2,
    marginLeft: 5,
  },
})

export interface CompanyInfo {
  name: string
  email: string
  phone: string
  address: string
  website?: string
  logo?: string
}

export interface RmaDocumentProps {
  rma: any
  companyInfo?: CompanyInfo
}

export function SimpleRmaDocument({ rma, companyInfo }: RmaDocumentProps) {
  // Format date for display
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A"

    // Handle Firestore timestamps
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString()
    }

    // Handle string dates
    if (typeof timestamp === "string") {
      return new Date(timestamp).toLocaleDateString()
    }

    return "N/A"
  }

  // Format status for display
  const formatStatus = (status: string) => {
    if (!status) return "N/A"

    // Convert status to display format
    const statusMap: Record<string, string> = {
      processing: "MATERIAL RECEIVED",
      in_service_centre: "IN SERVICE CENTRE",
      ready: "READY TO DISPATCH",
      delivered: "DELIVERED",
    }

    return statusMap[status] || status.toUpperCase()
  }

  // Default company info
  const company = {
    name: "Your Company",
    email: "info@yourcompany.com",
    phone: "(555) 123-4567",
    address: "123 Business Street, City, Country",
    ...companyInfo,
  }

  // Default RMA data if not provided
  const rmaData = {
    id: "N/A",
    createdAt: new Date(),
    status: "processing",
    contactCompany: "N/A",
    contactName: "N/A",
    contactEmail: "N/A",
    contactPhone: "N/A",
    comments: "",
    products: [],
    ...rma,
  }

  // Check if this is a multi-product RMA
  const isMultiProduct = Array.isArray(rmaData.products) && rmaData.products.length > 0

  // For backwards compatibility with single-product RMAs
  const singleProductData = isMultiProduct
    ? null
    : {
        brand: rmaData.brand || "N/A",
        modelNumber: rmaData.modelNumber || "N/A",
        serialNumber: rmaData.serialNumber || "N/A",
        problemsReported: rmaData.problemsReported || "N/A",
        status: rmaData.status || "processing",
      }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={{ fontSize: 16, fontWeight: "bold" }}>{company.name}</Text>
          </View>
          <View style={styles.companyInfo}>
            <Text>{company.address}</Text>
            <Text>
              {company.email} | {company.phone}
            </Text>
            {company.website && <Text>{company.website}</Text>}
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Return Merchandise Authorization</Text>

        {/* RMA Info Box */}
        <View style={styles.rmaBox}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={{ fontSize: 12, fontWeight: "bold" }}>RMA ID: {rmaData.id}</Text>
              <Text style={{ fontSize: 10 }}>Created: {formatDate(rmaData.createdAt)}</Text>
            </View>
            <Text style={styles.statusBadge}>{formatStatus(rmaData.status)}</Text>
          </View>
        </View>

        {/* Customer Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer Information</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Company:</Text>
            <Text style={styles.value}>{rmaData.contactCompany}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Contact Name:</Text>
            <Text style={styles.value}>{rmaData.contactName || "N/A"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{rmaData.contactEmail}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Phone:</Text>
            <Text style={styles.value}>{rmaData.contactPhone}</Text>
          </View>
        </View>

        {/* Product Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Product Details</Text>

          {isMultiProduct ? (
            <View style={styles.productTable}>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableCell, styles.col1, { fontWeight: "bold" }]}>Brand & Model</Text>
                <Text style={[styles.tableCell, styles.col2, { fontWeight: "bold" }]}>Serial Number</Text>
                <Text style={[styles.tableCell, styles.col3, { fontWeight: "bold" }]}>Status</Text>
                <Text style={[styles.tableCell, styles.col4, { fontWeight: "bold" }]}>Problem</Text>
              </View>

              {rmaData.products.map((product: any, index: number) => (
                <View key={index} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.col1]}>
                    {product.brand} {product.modelNumber}
                  </Text>
                  <Text style={[styles.tableCell, styles.col2]}>{product.serialNumber}</Text>
                  <Text style={[styles.tableCell, styles.col3]}>{formatStatus(product.status)}</Text>
                  <Text style={[styles.tableCell, styles.col4]}>{product.problemsReported}</Text>
                </View>
              ))}
            </View>
          ) : (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Brand:</Text>
                <Text style={styles.value}>{singleProductData?.brand}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Model Number:</Text>
                <Text style={styles.value}>{singleProductData?.modelNumber}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Serial Number:</Text>
                <Text style={styles.value}>{singleProductData?.serialNumber}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Problems Reported:</Text>
                <Text style={styles.value}>{singleProductData?.problemsReported}</Text>
              </View>
            </>
          )}
        </View>

        {/* Comments */}
        {rmaData.comments && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Additional Comments</Text>
            <Text style={styles.value}>{rmaData.comments}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>This is an automatically generated document.</Text>
          <Text>For any queries, please contact {company.email}</Text>
        </View>
      </Page>
    </Document>
  )
}

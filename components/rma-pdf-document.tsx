"use client"

import { Document, Page, Text, View, StyleSheet, Image, Font } from "@react-pdf/renderer"

// Register fonts
Font.register({
  family: "Inter",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ.ttf",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ.ttf",
      fontWeight: 600,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiJ.ttf",
      fontWeight: 700,
    },
  ],
})

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 30,
    fontFamily: "Inter",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    borderBottom: "1px solid #e5e7eb",
    paddingBottom: 20,
  },
  logo: {
    width: 120,
    height: 50,
    objectFit: "contain",
  },
  companyInfo: {
    fontSize: 10,
    textAlign: "right",
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    marginBottom: 20,
    color: "#1e40af",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 10,
    marginTop: 15,
    color: "#1e40af",
    borderBottom: "1px solid #e5e7eb",
    paddingBottom: 5,
  },
  section: {
    marginBottom: 15,
  },
  row: {
    flexDirection: "row",
    marginBottom: 8,
  },
  label: {
    width: "30%",
    fontSize: 10,
    fontWeight: 600,
    color: "#4b5563",
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
    color: "#6b7280",
    borderTop: "1px solid #e5e7eb",
    paddingTop: 10,
  },
  rmaBox: {
    border: "1px solid #e5e7eb",
    padding: 10,
    borderRadius: 4,
    marginBottom: 15,
  },
  rmaId: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 5,
  },
  rmaDate: {
    fontSize: 10,
    color: "#6b7280",
  },
  statusBadge: {
    fontSize: 10,
    fontWeight: 600,
    color: "#ffffff",
    backgroundColor: "#1e40af",
    padding: "4px 8px",
    borderRadius: 4,
    alignSelf: "flex-start",
  },
  barcode: {
    marginTop: 10,
    height: 40,
    width: "100%",
  },
  termsSection: {
    marginTop: 20,
    fontSize: 9,
    color: "#6b7280",
  },
  termTitle: {
    fontSize: 10,
    fontWeight: 600,
    marginBottom: 5,
    color: "#4b5563",
  },
  termItem: {
    marginBottom: 3,
  },
  signatureSection: {
    marginTop: 30,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  signatureBox: {
    width: "45%",
  },
  signatureLine: {
    borderTop: "1px solid #000000",
    marginTop: 40,
    marginBottom: 5,
  },
  signatureLabel: {
    fontSize: 9,
    textAlign: "center",
  },
  qrCode: {
    width: 80,
    height: 80,
    alignSelf: "center",
    marginTop: 10,
  },
})

interface CompanyInfo {
  name: string
  email: string
  phone: string
  address: string
  website: string
  logo: string
}

interface RmaPdfDocumentProps {
  rmaData: any
  companyInfo?: CompanyInfo
}

export function RmaPdfDocument({
  rmaData,
  companyInfo = {
    name: "AK Infotech",
    email: "support@akinfotech.com",
    phone: "+91 98765 43210",
    address: "123 Tech Street, Business Park, Mumbai, Maharashtra 400001",
    website: "https://akinfotech.com",
    logo: "/generic-company-logo.png",
  },
}: RmaPdfDocumentProps) {
  // Format date
  const formatDate = (timestamp: any) => {
    if (!timestamp) return "N/A"

    // Handle Firestore timestamps
    if (timestamp.toDate) {
      const date = timestamp.toDate()
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      }).format(date)
    }

    // Handle string dates
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // Format custom fields for display
  const formatCustomFieldValue = (value: any, type?: string) => {
    if (value === undefined || value === null) return "N/A"

    if (type === "checkbox" || type === "switch") {
      return value === true ? "Yes" : "No"
    }

    if (type === "date" && value) {
      try {
        return new Date(value).toLocaleDateString()
      } catch (e) {
        return value
      }
    }

    return String(value)
  }

  // Ensure rmaData is not null or undefined
  if (!rmaData) {
    rmaData = {
      id: "N/A",
      createdAt: new Date(),
      status: "PROCESSING",
      contactCompany: "N/A",
      contactName: "N/A",
      contactEmail: "N/A",
      contactPhone: "N/A",
      brand: "N/A",
      modelNumber: "N/A",
      serialNumber: "N/A",
      problemsReported: "N/A",
      comments: "",
      customFields: {},
    }
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with Logo and Company Info */}
        <View style={styles.header}>
          <View>
            <Image src={companyInfo.logo || "/generic-company-logo.png"} style={styles.logo} />
          </View>
          <View style={styles.companyInfo}>
            <Text>{companyInfo.name}</Text>
            <Text>{companyInfo.address}</Text>
            <Text>
              {companyInfo.email} | {companyInfo.phone}
            </Text>
            {companyInfo.website && <Text>{companyInfo.website}</Text>}
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>Return Merchandise Authorization</Text>

        {/* RMA Info Box */}
        <View style={styles.rmaBox}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View>
              <Text style={styles.rmaId}>RMA ID: {rmaData.id || "N/A"}</Text>
              <Text style={styles.rmaDate}>Created: {formatDate(rmaData.createdAt)}</Text>
            </View>
            <Text style={styles.statusBadge}>{rmaData.status?.toUpperCase() || "PROCESSING"}</Text>
          </View>

          {/* Barcode placeholder - in a real app, generate actual barcode */}
          <Image src="/generic-barcode.png" style={styles.barcode} />
        </View>

        {/* Customer Information */}
        <Text style={styles.subtitle}>Customer Information</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Company:</Text>
            <Text style={styles.value}>{rmaData.contactCompany || "N/A"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Contact Name:</Text>
            <Text style={styles.value}>{rmaData.contactName || "N/A"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Email:</Text>
            <Text style={styles.value}>{rmaData.contactEmail || "N/A"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Phone:</Text>
            <Text style={styles.value}>{rmaData.contactPhone || "N/A"}</Text>
          </View>
        </View>

        {/* Product Details */}
        <Text style={styles.subtitle}>Product Details</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Brand:</Text>
            <Text style={styles.value}>{rmaData.brand || "N/A"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Model Number:</Text>
            <Text style={styles.value}>{rmaData.modelNumber || "N/A"}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Serial Number:</Text>
            <Text style={styles.value}>{rmaData.serialNumber || "N/A"}</Text>
          </View>
        </View>

        {/* Issue Details */}
        <Text style={styles.subtitle}>Issue Details</Text>
        <View style={styles.section}>
          <View style={styles.row}>
            <Text style={styles.label}>Problems Reported:</Text>
            <Text style={styles.value}>{rmaData.problemsReported || "N/A"}</Text>
          </View>
          {rmaData.comments && (
            <View style={styles.row}>
              <Text style={styles.label}>Additional Comments:</Text>
              <Text style={styles.value}>{rmaData.comments}</Text>
            </View>
          )}
        </View>

        {/* Custom Fields */}
        {rmaData.customFields && Object.keys(rmaData.customFields).length > 0 && (
          <>
            <Text style={styles.subtitle}>Additional Information</Text>
            <View style={styles.section}>
              {Object.entries(rmaData.customFields).map(([key, value]: [string, any], index) => (
                <View style={styles.row} key={index}>
                  <Text style={styles.label}>
                    {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1")}:
                  </Text>
                  <Text style={styles.value}>{formatCustomFieldValue(value)}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Terms and Conditions */}
        <View style={styles.termsSection}>
          <Text style={styles.termTitle}>Terms and Conditions:</Text>
          <Text style={styles.termItem}>1. All returns must be in original packaging with all accessories.</Text>
          <Text style={styles.termItem}>
            2. Damaged items due to customer mishandling may not be eligible for replacement.
          </Text>
          <Text style={styles.termItem}>3. Processing time is typically 7-10 business days from receipt.</Text>
          <Text style={styles.termItem}>
            4. Customer is responsible for return shipping costs unless otherwise specified.
          </Text>
          <Text style={styles.termItem}>5. This RMA form must be included with your return shipment.</Text>
        </View>

        {/* Signature Section */}
        <View style={styles.signatureSection}>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Customer Signature</Text>
          </View>
          <View style={styles.signatureBox}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureLabel}>Authorized by</Text>
          </View>
        </View>

        {/* QR Code placeholder - in a real app, generate actual QR code */}
        <Image src="/qr-code.png" style={styles.qrCode} />

        {/* Footer */}
        <View style={styles.footer}>
          <Text>This is an automatically generated document. Thank you for your business.</Text>
          <Text>
            For any queries, please contact {companyInfo.email} or call {companyInfo.phone}
          </Text>
        </View>
      </Page>
    </Document>
  )
}

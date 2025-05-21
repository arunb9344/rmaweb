// This file handles email sending using Brevo

interface EmailParams {
  to: string
  name: string
  rmaId: string
  productDetails: string
  allFields?: any
}

interface ReadyEmailParams extends EmailParams {
  otp: string
}

// Helper function to create HTML product boxes
function createProductsHTML(products: any[], status?: string) {
  if (!products || !Array.isArray(products) || products.length === 0) {
    return ""
  }

  // Filter products by status if provided
  const filteredProducts = status ? products.filter((p) => p.status === status) : products

  if (filteredProducts.length === 0) {
    return ""
  }

  let productsHTML = ""

  filteredProducts.forEach((product, index) => {
    // Alternate colors for better visual distinction
    const bgColor = index % 2 === 0 ? "#f0f7ff" : "#f5f5ff"
    const borderColor = index % 2 === 0 ? "#cce5ff" : "#d8d8ff"

    productsHTML += `
      <div style="margin-bottom: 15px; padding: 15px; border-radius: 8px; background-color: ${bgColor}; border: 1px solid ${borderColor};">
        <h3 style="margin-top: 0; margin-bottom: 10px; color: #333;">Product ${index + 1}</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 5px 10px 5px 0; font-weight: bold; width: 150px;">Brand:</td>
            <td style="padding: 5px 0;">${product.brand || "N/A"}</td>
          </tr>
          <tr>
            <td style="padding: 5px 10px 5px 0; font-weight: bold;">Model Number:</td>
            <td style="padding: 5px 0;">${product.modelNumber || "N/A"}</td>
          </tr>
          <tr>
            <td style="padding: 5px 10px 5px 0; font-weight: bold;">Serial Number:</td>
            <td style="padding: 5px 0;">${product.serialNumber || "N/A"}</td>
          </tr>
          ${
            product.problemsReported
              ? `
          <tr>
            <td style="padding: 5px 10px 5px 0; font-weight: bold;">Problems Reported:</td>
            <td style="padding: 5px 0;">${product.problemsReported}</td>
          </tr>`
              : ""
          }
          ${
            product.status === "ready" && product.otp
              ? `
          <tr>
            <td style="padding: 5px 10px 5px 0; font-weight: bold;">OTP:</td>
            <td style="padding: 5px 0; font-weight: bold; color: #0066cc; font-size: 16px;">${product.otp}</td>
          </tr>`
              : ""
          }
          ${
            product.remark
              ? `
          <tr>
            <td style="padding: 5px 10px 5px 0; font-weight: bold;">Service Remarks:</td>
            <td style="padding: 5px 0;">${product.remark}</td>
          </tr>`
              : ""
          }
        </table>
      </div>
    `
  })

  return `
    <div style="margin-top: 20px; margin-bottom: 20px;">
      ${productsHTML}
    </div>
  `
}

// Function to create HTML email template
function createEmailTemplate(name: string, rmaId: string, productsHTML: string, message: string, globalOtp?: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>RMA Update</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="border-radius: 8px; border: 1px solid #e0e0e0; overflow: hidden;">
        <div style="background-color: #f8f9fa; padding: 20px; border-bottom: 1px solid #e0e0e0;">
          <h2 style="margin: 0; color: #333;">RMA Update</h2>
        </div>
        
        <div style="padding: 20px;">
          <p>Dear ${name},</p>
          
          <p>${message}</p>
          
          <div style="background-color: #f0f0f0; padding: 10px; border-radius: 5px; margin: 15px 0;">
            <strong>RMA ID:</strong> ${rmaId}
          </div>
          
          ${
            globalOtp
              ? `
          <div style="background-color: #e6f7ff; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #1890ff;">
            <h3 style="margin-top: 0; margin-bottom: 10px; color: #333;">Delivery OTP</h3>
            <p style="margin: 0; font-size: 18px; font-weight: bold; color: #1890ff;">${globalOtp}</p>
            <p style="margin-top: 5px; font-size: 14px;">Please provide this OTP when receiving your items.</p>
          </div>
          `
              : ""
          }
          
          ${productsHTML}
          
          <p>Thank you for your patience.</p>
          
          <p>Best regards,<br>Support Team</p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #666; text-align: center;">
          This is an automated message. Please do not reply to this email.
        </div>
      </div>
    </body>
    </html>
  `
}

// Function to send RMA confirmation email
export async function sendRMAConfirmationEmail({ to, name, rmaId, productDetails, allFields }: EmailParams) {
  console.log("Sending confirmation email to:", to)

  try {
    // Create HTML for products
    const productsHTML = createProductsHTML(allFields?.products || [])

    // Create message
    const message = "We have received your return request. We will process your request and update you soon."

    // Create HTML email
    const htmlEmail = createEmailTemplate(name, rmaId, productsHTML, message)

    // Create plain text message for fallback
    const plainTextMessage = `Dear ${name},

We have received your return request.

Your RMA ID is: ${rmaId}

We will process your request and update you soon.

Thank you for your patience.

Best regards,
Support Team`

    // Create the email content
    const emailContent = {
      to_email: to,
      to_name: name,
      subject: "RMA Material Received",
      message: plainTextMessage,
      html_message: htmlEmail,
      rma_id: rmaId,
      product_details: productDetails,
      all_fields: allFields,
    }

    // Send the email using our API route
    const response = await fetch("/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailContent),
    })

    const data = await response.json()
    console.log("Email API response:", data)

    if (response.ok) {
      console.log("Email sent successfully to:", to)
      return data
    } else {
      console.error("Email API error:", data)
      throw new Error(`Email sending failed: ${data.message || "Unknown error"}`)
    }
  } catch (error) {
    console.error("Error sending email:", error)
    throw error
  }
}

// Function to send RMA service centre email
export async function sendRMAServiceCentreEmail({ to, name, rmaId, productDetails, allFields }: EmailParams) {
  console.log("Sending service centre email to:", to)

  try {
    // Create HTML for products that are in service center
    const productsHTML = createProductsHTML(allFields?.products || [], "in_service_centre")

    // Create message
    const message =
      "Your return products have been sent to our service centre for processing. We will notify you once your items are ready for dispatch."

    // Create HTML email
    const htmlEmail = createEmailTemplate(name, rmaId, productsHTML, message)

    // Create plain text message for fallback
    const plainTextMessage = `Dear ${name},

Your return products have been sent to our service centre for processing.

Your RMA ID is: ${rmaId}

We will notify you once your items are ready for dispatch.

Thank you for your patience.

Best regards,
Support Team`

    // Create the email content
    const emailContent = {
      to_email: to,
      to_name: name,
      subject: "RMA Products Sent to Service Centre",
      message: plainTextMessage,
      html_message: htmlEmail,
      rma_id: rmaId,
      product_details: productDetails,
      all_fields: allFields,
    }

    // Send the email using our API route
    const response = await fetch("/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailContent),
    })

    const data = await response.json()
    console.log("Email API response:", data)

    if (response.ok) {
      console.log("Email sent successfully to:", to)
      return data
    } else {
      console.error("Email API error:", data)
      throw new Error(`Email sending failed: ${data.message || "Unknown error"}`)
    }
  } catch (error) {
    console.error("Error sending email:", error)
    throw error
  }
}

// Function to send RMA ready email with OTP
export async function sendRMAReadyEmail({ to, name, rmaId, productDetails, otp, allFields }: ReadyEmailParams) {
  console.log("Sending ready email to:", to)

  try {
    // Log the products to debug
    console.log("Products in ready email:", allFields?.products)

    // Create HTML for products that are ready
    // Note: We're passing the full products array to ensure all ready products are included
    const productsHTML = createProductsHTML(allFields?.products || [], "ready")

    // Create message
    const message = "Your return products are now ready for dispatch. Please provide the OTP when receiving your items."

    // Create HTML email with the global OTP
    const htmlEmail = createEmailTemplate(name, rmaId, productsHTML, message, otp)

    // Create plain text message for fallback
    const plainTextMessage = `Dear ${name},

Your return products are now ready for dispatch.

Your RMA ID is: ${rmaId}

Your OTP for delivery confirmation is: ${otp}

Please provide this OTP when receiving your items.

Best regards,
Support Team`

    // Create the email content
    const emailContent = {
      to_email: to,
      to_name: name,
      subject: "RMA Products Ready for Dispatch",
      message: plainTextMessage,
      html_message: htmlEmail,
      rma_id: rmaId,
      product_details: productDetails,
      otp: otp,
      all_fields: allFields,
    }

    // Send the email using our API route
    const response = await fetch("/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailContent),
    })

    const data = await response.json()
    console.log("Email API response:", data)

    if (response.ok) {
      console.log("Email sent successfully to:", to)
      return data
    } else {
      console.error("Email API error:", data)
      throw new Error(`Email sending failed: ${data.message || "Unknown error"}`)
    }
  } catch (error) {
    console.error("Error sending email:", error)
    throw error
  }
}

// Function to send RMA delivered email
export async function sendRMADeliveredEmail({ to, name, rmaId, productDetails, allFields }: EmailParams) {
  console.log("Sending delivered email to:", to)

  try {
    // Create HTML for products that are delivered
    const productsHTML = createProductsHTML(allFields?.products || [], "delivered")

    // Create message
    const message = "Your return products have been successfully delivered. Thank you for your business."

    // Create HTML email - NO OTP for delivered emails
    const htmlEmail = createEmailTemplate(name, rmaId, productsHTML, message)

    // Create plain text message for fallback
    const plainTextMessage = `Dear ${name},

Your return products have been successfully delivered.

Your RMA ID is: ${rmaId}

Thank you for your business.

Best regards,
Support Team`

    // Create the email content
    const emailContent = {
      to_email: to,
      to_name: name,
      subject: "RMA Products Delivered",
      message: plainTextMessage,
      html_message: htmlEmail,
      rma_id: rmaId,
      product_details: productDetails,
      all_fields: allFields,
    }

    // Send the email using our API route
    const response = await fetch("/api/send-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailContent),
    })

    const data = await response.json()
    console.log("Email API response:", data)

    if (response.ok) {
      console.log("Email sent successfully to:", to)
      return data
    } else {
      console.error("Email API error:", data)
      throw new Error(`Email sending failed: ${data.message || "Unknown error"}`)
    }
  } catch (error) {
    console.error("Error sending email:", error)
    throw error
  }
}

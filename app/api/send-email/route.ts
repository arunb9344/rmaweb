import { NextResponse } from "next/server"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { to_email, to_name, subject, message, html_message, rma_id, product_details, otp, all_fields } = body

    // Validate required fields
    if (!to_email || !subject) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log("Sending email to:", to_email)

    // Format all RMA fields for the email if using the old format
    let rmaFieldsHtml = ""
    if (all_fields && !html_message) {
      rmaFieldsHtml = `
        <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px; border: 1px solid #e9ecef;">
          <h3 style="margin-top: 0; color: #495057;">RMA Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #dee2e6; width: 40%;"><strong>Customer Name:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${all_fields.contactName || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>Company:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${all_fields.contactCompany || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>Email:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${all_fields.contactEmail || "N/A"}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>Phone:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${all_fields.contactPhone || "N/A"}</td>
            </tr>
            ${
              all_fields.products && all_fields.products.length > 0
                ? all_fields.products
                    .map(
                      (product: any, index: number) => `
              <tr>
                <td colspan="2" style="padding: 12px 8px 8px; border-bottom: 1px solid #dee2e6;"><strong>Product ${
                  index + 1
                }</strong></td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>Brand:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${product.brand || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>Model Number:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${product.modelNumber || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>Serial Number:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${product.serialNumber || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>Problems Reported:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${product.problemsReported || "N/A"}</td>
              </tr>
            `,
                    )
                    .join("")
                : `
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>Brand:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${all_fields.brand || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>Model Number:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${all_fields.modelNumber || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>Serial Number:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${all_fields.serialNumber || "N/A"}</td>
              </tr>
              <tr>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>Problems Reported:</strong></td>
                <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${all_fields.problemsReported || "N/A"}</td>
              </tr>
            `
            }
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>Comments:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${all_fields.comments || "N/A"}</td>
            </tr>
            ${
              all_fields.remark
                ? `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #dee2e6;"><strong>Service Remarks:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #dee2e6;">${all_fields.remark}</td>
            </tr>
            `
                : ""
            }
          </table>
        </div>
      `
    }

    // Create HTML version of the message
    const htmlContent =
      html_message ||
      `
      <html>
        <body>
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
            <div style="text-align: center; margin-bottom: 20px;">
              <h1 style="color: #4a5568; margin-bottom: 10px;">${subject}</h1>
              <div style="height: 3px; background-color: #3182ce; margin: 0 auto;"></div>
            </div>
            
            <div style="color: #4a5568; line-height: 1.6;">
              ${message
                .split("\n\n")
                .map((paragraph) => `<p>${paragraph}</p>`)
                .join("")}
            </div>
            
            ${rmaFieldsHtml}
            
            ${
              otp
                ? `<div style="margin: 20px 0; padding: 15px; background-color: #ebf8ff; border-left: 4px solid #3182ce; border-radius: 3px;">
              <p style="margin: 5px 0 0 0; font-weight: bold; font-size: 18px;">Your OTP: ${otp}</p>
              <p style="margin: 5px 0 0 0;">Please provide this OTP when receiving your item.</p>
            </div>`
                : ""
            }
            
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #718096; font-size: 14px;">
              <p>This is an automated message. Please do not reply to this email.</p>
            </div>
          </div>
        </body>
      </html>
    `

    // Send email using Brevo API
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": process.env.BREVO_API_KEY || "",
      },
      body: JSON.stringify({
        sender: {
          email: "akinfotechtn@gmail.com",
          name: "AK Infotech",
        },
        to: [
          {
            email: to_email,
            name: to_name || to_email.split("@")[0],
          },
        ],
        subject: subject,
        htmlContent: htmlContent,
        textContent: message,
      }),
    })

    // Handle API response
    if (!response.ok) {
      const errorData = await response.json()
      console.error("Brevo API error:", errorData)

      // Try fallback to Web3Forms if Brevo fails
      return await sendWithWeb3Forms(to_email, to_name, subject, message, htmlContent)
    }

    const data = await response.json()
    console.log("Email sent successfully via Brevo:", data)

    return NextResponse.json({ success: true, provider: "brevo", messageId: data.messageId })
  } catch (error) {
    console.error("Error sending email:", error)
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

// Fallback function to send with Web3Forms
async function sendWithWeb3Forms(
  to_email: string,
  to_name: string,
  subject: string,
  message: string,
  htmlContent: string,
) {
  try {
    console.log("Trying fallback with Web3Forms to:", to_email)

    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        access_key: "77ed3f0f-28c4-4093-8063-04dddc47b163",
        subject: subject,
        from_name: "RMA System",
        to_email: to_email,
        reply_to: "noreply@yourdomain.com",
        message: message,
        html: htmlContent,
      }),
    })

    const data = await response.json()
    console.log("Web3Forms API response:", data)

    if (data.success) {
      return NextResponse.json({ success: true, provider: "web3forms", data })
    } else {
      return NextResponse.json({ error: "Email sending failed with both providers", details: data }, { status: 400 })
    }
  } catch (error) {
    console.error("Error in Web3Forms fallback:", error)
    return NextResponse.json(
      {
        error: "Email sending failed with both providers",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}

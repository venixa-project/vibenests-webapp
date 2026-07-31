import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Asynchronous helper to load VibeNests brand logo with safety timeout fallback
const getLogoImage = (): Promise<HTMLImageElement | null> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = '/image.png';
    img.crossOrigin = 'anonymous';
    const timeout = setTimeout(() => {
      resolve(null);
    }, 1200); // 1.2 seconds timeout
    img.onload = () => {
      clearTimeout(timeout);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timeout);
      resolve(null);
    };
  });
};

// Draw premium brand header
function drawBrandHeader(doc: jsPDF, logoImg: HTMLImageElement | null, titleText: string, docIdText: string, dateText: string, statusText: string) {
  // Brand Header Layout
  if (logoImg) {
    doc.addImage(logoImg, 'PNG', 14, 14, 18, 18);
  } else {
    // Elegant fallback shape logo if network or loading fails
    doc.setFillColor(184, 151, 42); // Gold color
    doc.circle(23, 23, 9, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('V', 21.2, 26.5);
  }

  // Brand Name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(184, 151, 42); // Gold brand color
  doc.text('VIBENESTS', 36, 21);

  // Brand Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100);
  doc.text('PRIVATE LUXURY SUITES', 36, 26);

  // Invoice / Receipt Title (Right aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(31, 41, 55); // Dark Charcoal
  doc.text(titleText, 196, 21, { align: 'right' });

  // Document Metadata (Right aligned)
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128); // Muted grey
  doc.text(docIdText, 196, 26, { align: 'right' });
  doc.text(`Issued: ${dateText}`, 196, 31, { align: 'right' });
  doc.text(`Status: ${statusText}`, 196, 36, { align: 'right' });

  // Gold Horizontal divider line
  doc.setDrawColor(184, 151, 42);
  doc.setLineWidth(0.5);
  doc.line(14, 39, 196, 39);
}

// Draw professional thank you message and copyright in footer
function drawFooter(doc: jsPDF, pageNumber: number = 1) {
  const pageHeight = doc.internal.pageSize.height;

  // Thin footer divider
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.2);
  doc.line(14, pageHeight - 24, 196, pageHeight - 24);

  // Thank you note
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8.5);
  doc.setTextColor(107, 114, 128);
  doc.text('Thank you for choosing VibeNests! Your luxury private experience awaits.', 14, pageHeight - 18);

  // Copyright and support info
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(156, 163, 175);
  doc.text('© 2026 VibeNests Private Luxury Suites. All rights reserved. | Support: support@vibenests.com', 14, pageHeight - 12);
  doc.text(`Page ${pageNumber}`, 196, pageHeight - 12, { align: 'right' });
}

export async function generateBookingInvoicePDF(booking: any, user: any, addonsList: any[] = []) {
  const doc = new jsPDF();
  const logoImg = await getLogoImage();

  // Load formatting parameters
  const invoiceId = `INV-${booking.id || 'VN'}`;
  const invoiceDate = booking.createdAt
    ? new Date(booking.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    : new Date().toLocaleDateString();
  const statusStr = (booking.status || 'COMPLETED').toUpperCase();

  // Draw header
  drawBrandHeader(doc, logoImg, 'BOOKING INVOICE', `Invoice #: ${invoiceId}`, invoiceDate, statusStr);

  // 1. Customer Details Card (Left Column)
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.25);
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(14, 44, 88, 38, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(184, 151, 42);
  doc.text('BILLED TO', 18, 50);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(31, 41, 55);
  const guestName = user?.fullName || booking.userName || booking.guestName || 'Guest Member';
  doc.text(guestName, 18, 56);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  doc.text(`Email: ${user?.email || booking.userEmail || booking.guestEmail || '—'}`, 18, 62);
  doc.text(`Phone: ${user?.phone || booking.userPhone || booking.guestPhone || '—'}`, 18, 68);
  doc.text(`Booked On: ${invoiceDate}`, 18, 74);

  // 2. Reservation / Suite Details Card (Right Column)
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.25);
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(108, 44, 88, 38, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(184, 151, 42);
  doc.text('RESERVATION DETAILS', 112, 50);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(31, 41, 55);
  const suiteName = booking.suiteName ||
    (typeof booking.suite === 'string' ? booking.suite : booking.suite?.name) ||
    `Suite #${booking.suiteId || ''}`;
  doc.text(suiteName, 112, 56);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  doc.text(`Location: ${booking.location || booking.suite?.location || 'VibeNests Luxury, India'}`, 112, 62);

  const stayDate = booking.checkIn
    ? new Date(booking.checkIn).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    : (booking.date ? new Date(booking.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '—');
  doc.text(`Stay Date: ${stayDate}`, 112, 68);

  const slotStr = booking.checkInTime || booking.timeSlot || '—';
  const guestCount = booking.guests || booking.guestCount || 2;
  doc.text(`Slot: ${slotStr}  |  Guests: ${guestCount}`, 112, 74);

  // 3. Items Table
  const tableData: any[][] = [];
  const basePrice = parseFloat(booking.basePrice || booking.suitePrice || booking.amount || 0);
  tableData.push([`Suite Booking - ${suiteName}`, '1', `Rs. ${basePrice.toFixed(2)}`, `Rs. ${basePrice.toFixed(2)}`]);

  let addonsTotal = 0;
  if (addonsList && Array.isArray(addonsList) && addonsList.length > 0) {
    addonsList.forEach((addon: any) => {
      const name = addon.name || 'Extra Item';
      const qty = addon.quantity || 1;
      const price = parseFloat(addon.price || 0);
      const total = qty * price;
      addonsTotal += total;
      tableData.push([`Addon: ${name}`, qty.toString(), `Rs. ${price.toFixed(2)}`, `Rs. ${total.toFixed(2)}`]);
    });
  }

  autoTable(doc, {
    startY: 88,
    head: [['Description', 'Qty', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [184, 151, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { textColor: [31, 41, 55], fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 15, halign: 'center' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' }
    },
    margin: { left: 14, right: 14 }
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 115;

  // 4. Totals and Payment Summary Box
  const discount = parseFloat(booking.savings || booking.discountAmount || 0);
  const tax = parseFloat(booking.taxes || booking.taxAmount || 0);
  const totalAmount = parseFloat(booking.totalAmount || booking.totalPrice || booking.amount || 0);
  const subtotal = basePrice + addonsTotal;

  const paymentMode = booking.paymentMode || 'pay_now';
  const isAdvancePay = paymentMode === 'pay_at_venue' && !booking.fullPaymentReceived;
  const advancePaid = parseFloat(booking.advanceAmount || 0);
  const balanceDue = totalAmount - advancePaid;

  // Draw Summary Cards
  let currentY = finalY + 8;
  const boxHeight = isAdvancePay ? 50 : 38;

  // Draw payment info on the left side
  let leftY = finalY + 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(184, 151, 42);
  doc.text('PAYMENT DETAILS', 14, leftY);
  leftY += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);

  const paymentModeText = paymentMode === 'pay_at_venue'
    ? 'Pay at Venue (20% Advance Online)'
    : paymentMode === 'package_credit'
      ? 'Package Credit'
      : 'Online Card/UPI';
  doc.text(`Method: ${paymentModeText}`, 14, leftY);
  leftY += 5;

  const paymentStatusText = isAdvancePay ? 'Advance Paid / Balance Pending' : 'Fully Paid';
  doc.text(`Status: ${paymentStatusText}`, 14, leftY);
  leftY += 5;
  doc.text(`Booking Reference ID: #VN${booking.id}`, 14, leftY);

  leftY += 6;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(120);
  doc.text('Notes: Standard ID proofs are required during check-in.', 14, leftY);

  // Draw financial totals on the right side
  doc.setDrawColor(229, 231, 235);
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(118, currentY, 78, boxHeight, 3, 3, 'FD');

  currentY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);

  // Subtotal
  doc.text('Subtotal:', 122, currentY);
  doc.text(`Rs. ${subtotal.toFixed(2)}`, 192, currentY, { align: 'right' });
  currentY += 6;

  // Discount
  if (discount > 0) {
    doc.setTextColor(16, 124, 65); // Green for discount
    doc.text('Discount:', 122, currentY);
    doc.text(`- Rs. ${discount.toFixed(2)}`, 192, currentY, { align: 'right' });
    doc.setTextColor(75, 85, 99);
    currentY += 6;
  }

  // Tax
  if (tax > 0) {
    doc.text('Tax & Services:', 122, currentY);
    doc.text(`Rs. ${tax.toFixed(2)}`, 192, currentY, { align: 'right' });
    currentY += 6;
  }

  // Divider
  doc.setDrawColor(229, 231, 235);
  doc.line(122, currentY, 192, currentY);
  currentY += 5;

  // Grand Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(31, 41, 55);
  doc.text('Grand Total:', 122, currentY);
  doc.text(`Rs. ${totalAmount.toFixed(2)}`, 192, currentY, { align: 'right' });

  if (isAdvancePay) {
    currentY += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(75, 85, 99);
    doc.text('Advance Paid:', 122, currentY);
    doc.setTextColor(16, 124, 65);
    doc.text(`Rs. ${advancePaid.toFixed(2)}`, 192, currentY, { align: 'right' });

    currentY += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(185, 28, 28); // Red for pending balance
    doc.text('Remaining Balance:', 122, currentY);
    doc.text(`Rs. ${balanceDue.toFixed(2)}`, 192, currentY, { align: 'right' });
  } else {
    currentY += 6;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(75, 85, 99);
    doc.text('Total Amount Paid:', 122, currentY);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(16, 124, 65); // Green for full amount
    doc.text(`Rs. ${totalAmount.toFixed(2)}`, 192, currentY, { align: 'right' });
  }

  // Footer
  drawFooter(doc, 1);

  // Save the generated document
  doc.save(`VibeNests_Invoice_${booking.id || 'Booking'}.pdf`);
}

export async function generateTransactionInvoicePDF(transaction: any, user: any) {
  const doc = new jsPDF();
  const logoImg = await getLogoImage();

  // Load parameters
  const receiptId = transaction.id || transaction.invoice || 'TXN-VN';
  const receiptDate = transaction.date
    ? new Date(transaction.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
    : new Date().toLocaleDateString();
  const statusStr = (transaction.status || 'COMPLETED').toUpperCase();

  // Draw Header
  drawBrandHeader(doc, logoImg, 'PAYMENT RECEIPT', `Receipt #: ${receiptId}`, receiptDate, statusStr);

  const booking = transaction.booking;

  // 1. Customer Details Card (Left Column)
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.25);
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(14, 44, 88, 38, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(184, 151, 42);
  doc.text('CUSTOMER DETAILS', 18, 50);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(31, 41, 55);
  const guestName = user?.fullName || transaction.userName || booking?.guestName || booking?.userName || 'Guest Member';
  doc.text(guestName, 18, 56);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  doc.text(`Email: ${user?.email || transaction.userEmail || booking?.guestEmail || '—'}`, 18, 62);
  doc.text(`Phone: ${user?.phone || transaction.userPhone || booking?.guestPhone || '—'}`, 18, 68);
  doc.text(`Transaction On: ${receiptDate}`, 18, 74);

  // 2. Transaction / Booking Card (Right Column)
  doc.setDrawColor(229, 231, 235);
  doc.setLineWidth(0.25);
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(108, 44, 88, 38, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(184, 151, 42);
  doc.text('TRANSACTION SUMMARY', 112, 50);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(31, 41, 55);
  doc.text(`Category: ${transaction.category ? transaction.category.toUpperCase() : 'BOOKING'}`, 112, 56);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  doc.text(`Payment Method: ${transaction.method || 'Online Payment'}`, 112, 62);

  if (booking) {
    const suiteName = booking.suiteName ||
      (typeof booking.suite === 'string' ? booking.suite : booking.suite?.name) ||
      `Suite #${booking.suiteId || ''}`;
    doc.text(`Suite: ${suiteName}`, 112, 68);
    const stayDate = booking.checkIn
      ? new Date(booking.checkIn).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })
      : (booking.date ? new Date(booking.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }) : '—');
    doc.text(`Stay Date: ${stayDate}`, 112, 74);
  } else {
    doc.text('Ref Description:', 112, 68);
    // Wrap description text to fit card width
    const descLines = doc.splitTextToSize(transaction.desc || 'General transaction payment', 80);
    doc.text(descLines[0] || '', 112, 74);
  }

  // 3. Items Table
  const tableData: any[][] = [];
  const transAmount = Math.abs(parseFloat(transaction.amount || 0));

  let descText = `Payment for ${transaction.category || 'Service'}`;
  if (booking) {
    const suiteName = booking.suiteName || booking.suite?.name || 'Suite';
    descText = `Payment towards Booking - ${suiteName} (#VN${booking.id})`;
  } else if (transaction.desc) {
    descText = transaction.desc;
  }

  tableData.push([descText, '1', `Rs. ${transAmount.toFixed(2)}`, `Rs. ${transAmount.toFixed(2)}`]);

  autoTable(doc, {
    startY: 88,
    head: [['Description', 'Qty', 'Paid Amount', 'Total']],
    body: tableData,
    theme: 'striped',
    headStyles: { fillColor: [184, 151, 42], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
    bodyStyles: { textColor: [31, 41, 55], fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 'auto' },
      1: { cellWidth: 15, halign: 'center' },
      2: { cellWidth: 30, halign: 'right' },
      3: { cellWidth: 30, halign: 'right' }
    },
    margin: { left: 14, right: 14 }
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 115;

  // 4. Totals and Payment Summary Box
  const bookingTotal = booking ? parseFloat(booking.totalAmount || booking.totalPrice || booking.amount || 0) : transAmount;
  const paymentMode = booking?.paymentMode || 'pay_now';
  const isAdvancePay = booking && paymentMode === 'pay_at_venue' && !booking.fullPaymentReceived;
  const advancePaid = booking ? parseFloat(booking.advanceAmount || 0) : transAmount;
  const balanceDue = bookingTotal - advancePaid;

  let currentY = finalY + 8;
  const boxHeight = (booking && isAdvancePay) ? 44 : 26;

  // Left Details
  let leftY = finalY + 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(184, 151, 42);
  doc.text('TRANSACTION DETAILS', 14, leftY);
  leftY += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);
  doc.text(`Reference ID: ${receiptId}`, 14, leftY);
  leftY += 5;
  doc.text(`Payment Channel: ${transaction.method || 'Online'}`, 14, leftY);
  leftY += 5;
  doc.text(`Status: ${statusStr}`, 14, leftY);

  // Right Totals card
  doc.setDrawColor(229, 231, 235);
  doc.setFillColor(249, 250, 251);
  doc.roundedRect(118, currentY, 78, boxHeight, 3, 3, 'FD');

  currentY += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(75, 85, 99);

  if (booking) {
    doc.text('Booking Grand Total:', 122, currentY);
    doc.text(`Rs. ${bookingTotal.toFixed(2)}`, 192, currentY, { align: 'right' });
    currentY += 6;

    if (isAdvancePay) {
      doc.text('Advance Amount Paid:', 122, currentY);
      doc.setTextColor(16, 124, 65);
      doc.text(`Rs. ${advancePaid.toFixed(2)}`, 192, currentY, { align: 'right' });
      doc.setTextColor(75, 85, 99);
      currentY += 6;

      // Divider
      doc.setDrawColor(229, 231, 235);
      doc.line(122, currentY, 192, currentY);
      currentY += 5;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(185, 28, 28);
      doc.text('Remaining Balance:', 122, currentY);
      doc.text(`Rs. ${balanceDue.toFixed(2)}`, 192, currentY, { align: 'right' });
    } else {
      // Divider
      doc.setDrawColor(229, 231, 235);
      doc.line(122, currentY, 192, currentY);
      currentY += 5;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(16, 124, 65);
      doc.text('Total Paid (Full):', 122, currentY);
      doc.text(`Rs. ${bookingTotal.toFixed(2)}`, 192, currentY, { align: 'right' });
    }
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(16, 124, 65);
    doc.text('Amount Processed:', 122, currentY);
    doc.text(`Rs. ${transAmount.toFixed(2)}`, 192, currentY, { align: 'right' });
  }

  // Footer
  drawFooter(doc, 1);

  // Save the receipt
  doc.save(`VibeNests_Receipt_${receiptId}.pdf`);
}

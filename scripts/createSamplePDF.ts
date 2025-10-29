import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs-extra';
import path from 'path';

async function createSamplePDF() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const { width, height } = page.getSize();
  
  page.drawText('SAMPLE QUOTATION FORM', {
    x: 50,
    y: height - 50,
    size: 20,
    font: boldFont,
    color: rgb(0, 0.2, 0.6),
  });
  
  page.drawText('Product Details:', {
    x: 50,
    y: height - 100,
    size: 14,
    font: boldFont,
    color: rgb(0, 0, 0),
  });
  
  page.drawText('Flute Diameter:', {
    x: 50,
    y: height - 140,
    size: 12,
    font: font,
    color: rgb(0.3, 0.3, 0.3),
  });
  
  page.drawText('Price:', {
    x: 50,
    y: height - 180,
    size: 12,
    font: font,
    color: rgb(0.3, 0.3, 0.3),
  });
  
  page.drawText('Coating:', {
    x: 50,
    y: height - 220,
    size: 12,
    font: font,
    color: rgb(0.3, 0.3, 0.3),
  });
  
  page.drawText('Customer Name:', {
    x: 50,
    y: height - 260,
    size: 12,
    font: font,
    color: rgb(0.3, 0.3, 0.3),
  });
  
  page.drawText('Date:', {
    x: 50,
    y: height - 300,
    size: 12,
    font: font,
    color: rgb(0.3, 0.3, 0.3),
  });
  
  page.drawRectangle({
    x: 40,
    y: height - 330,
    width: 515,
    height: 290,
    borderColor: rgb(0.7, 0.7, 0.7),
    borderWidth: 1,
  });
  
  const pdfBytes = await pdfDoc.save();
  
  const templatesDir = path.join(process.cwd(), 'templates');
  await fs.ensureDir(templatesDir);
  await fs.writeFile(path.join(templatesDir, 'Sample_Quote.pdf'), pdfBytes);
  
  console.log('Sample PDF template created: templates/Sample_Quote.pdf');
}

createSamplePDF().catch(console.error);

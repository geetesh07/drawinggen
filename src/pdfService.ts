import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { TemplateMapping, FieldMapping, DrawingInsertion } from './types';
import fs from 'fs-extra';
import path from 'path';

export class PDFService {
  private templatesDir = path.join(process.cwd(), 'templates');
  private mappingsDir = path.join(process.cwd(), 'mappings');
  private drawingsDir = path.join(process.cwd(), 'drawings');
  private drawingsMappingsDir = path.join(process.cwd(), 'drawings_mappings');
  private outputDir = path.join(process.cwd(), 'output');

  constructor() {
    fs.ensureDirSync(this.templatesDir);
    fs.ensureDirSync(this.mappingsDir);
    fs.ensureDirSync(this.drawingsDir);
    fs.ensureDirSync(this.drawingsMappingsDir);
    fs.ensureDirSync(this.outputDir);
  }

  private sanitizeFilename(filename: string): string {
    const decoded = decodeURIComponent(filename);
    const basename = path.basename(decoded);
    
    if (basename !== decoded || basename.includes('..') || basename.includes('/') || basename.includes('\\')) {
      throw new Error('Invalid filename: path traversal detected');
    }
    
    if (!/^[a-zA-Z0-9_\-\. ]+$/.test(basename)) {
      throw new Error('Invalid filename: only alphanumeric, dash, underscore, dot, and space allowed');
    }
    
    return basename;
  }

  private validatePDFFilename(filename: string): string {
    const sanitized = this.sanitizeFilename(filename);
    
    if (!sanitized.toLowerCase().endsWith('.pdf')) {
      throw new Error('Invalid filename: must be a PDF file');
    }
    
    return sanitized;
  }

  private validateJSONFilename(filename: string): string {
    const sanitized = this.sanitizeFilename(filename);
    
    if (!sanitized.toLowerCase().endsWith('.json')) {
      throw new Error('Invalid filename: must be a JSON file');
    }
    
    return sanitized;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16) / 255,
          g: parseInt(result[2], 16) / 255,
          b: parseInt(result[3], 16) / 255,
        }
      : { r: 0, g: 0, b: 0 };
  }

  private wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);

      if (width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  async generatePDF(templateName: string, data: { [key: string]: string }): Promise<Buffer> {
    const sanitizedName = this.validatePDFFilename(templateName);
    const templatePath = path.join(this.templatesDir, sanitizedName);
    const mappingPath = path.join(
      this.mappingsDir,
      sanitizedName.replace('.pdf', '.json')
    );

    if (!await fs.pathExists(templatePath)) {
      throw new Error(`Template not found: ${templateName}`);
    }

    if (!await fs.pathExists(mappingPath)) {
      throw new Error(`Mapping not found for template: ${templateName}`);
    }

    const templateBytes = await fs.readFile(templatePath);
    const mapping: TemplateMapping = await fs.readJSON(mappingPath);

    const pdfDoc = await PDFDocument.load(templateBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    const { height } = firstPage.getSize();

    for (const [fieldName, fieldMapping] of Object.entries(mapping)) {
      const value = data[fieldName];
      if (value === undefined || value === null) {
        continue;
      }

      const textValue = String(value);
      let fontSize = fieldMapping.size || 12;
      const align = fieldMapping.align || 'left';
      const maxWidth = fieldMapping.maxWidth || 200;
      const colorHex = fieldMapping.color || '#000000';
      const colorRgb = this.hexToRgb(colorHex);

      const rawFamily = fieldMapping.fontFamily || 'Helvetica';
      
      let baseFamily = 'Helvetica';
      let isBold = fieldMapping.bold || false;
      let isItalic = fieldMapping.italic || false;
      
      if (rawFamily.includes('Times')) {
        baseFamily = 'Times-Roman';
        if (rawFamily.includes('Bold')) isBold = true;
        if (rawFamily.includes('Italic')) isItalic = true;
      } else if (rawFamily.includes('Courier')) {
        baseFamily = 'Courier';
        if (rawFamily.includes('Bold')) isBold = true;
        if (rawFamily.includes('Oblique')) isItalic = true;
      } else {
        baseFamily = 'Helvetica';
        if (rawFamily.includes('Bold')) isBold = true;
        if (rawFamily.includes('Oblique')) isItalic = true;
      }
      
      let finalFont: any;
      
      if (baseFamily === 'Helvetica') {
        if (isBold && isItalic) finalFont = StandardFonts.HelveticaBoldOblique;
        else if (isBold) finalFont = StandardFonts.HelveticaBold;
        else if (isItalic) finalFont = StandardFonts.HelveticaOblique;
        else finalFont = StandardFonts.Helvetica;
      } else if (baseFamily === 'Times-Roman') {
        if (isBold && isItalic) finalFont = StandardFonts.TimesRomanBoldItalic;
        else if (isBold) finalFont = StandardFonts.TimesRomanBold;
        else if (isItalic) finalFont = StandardFonts.TimesRomanItalic;
        else finalFont = StandardFonts.TimesRoman;
      } else if (baseFamily === 'Courier') {
        if (isBold && isItalic) finalFont = StandardFonts.CourierBoldOblique;
        else if (isBold) finalFont = StandardFonts.CourierBold;
        else if (isItalic) finalFont = StandardFonts.CourierOblique;
        else finalFont = StandardFonts.Courier;
      } else {
        finalFont = StandardFonts.Helvetica;
      }

      const font = await pdfDoc.embedFont(finalFont);

      const maxHeight = fieldMapping.maxHeight || 1000;
      const lineHeight = fontSize + 2;
      const textWidth = font.widthOfTextAtSize(textValue, fontSize);
      const baselineY = fieldMapping.y + fontSize;
      
      if (textWidth > maxWidth) {
        const lines = this.wrapText(textValue, font, fontSize, maxWidth);
        
        let currentY = baselineY;
        for (const line of lines) {
          const lineOffset = currentY - baselineY;
          
          if (lineOffset + lineHeight > maxHeight) {
            break;
          }
          
          let x = fieldMapping.x;
          const y = height - currentY;

          const lineWidth = font.widthOfTextAtSize(line, fontSize);
          
          if (align === 'center') {
            x = x + (maxWidth - lineWidth) / 2;
          } else if (align === 'right') {
            x = x + maxWidth - lineWidth;
          }

          firstPage.drawText(line, {
            x,
            y,
            size: fontSize,
            font: font,
            color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
          });

          currentY += lineHeight;
        }
      } else {
        let x = fieldMapping.x;
        const y = height - baselineY;

        if (align === 'center') {
          x = x + (maxWidth - textWidth) / 2;
        } else if (align === 'right') {
          x = x + maxWidth - textWidth;
        }

        firstPage.drawText(textValue, {
          x,
          y,
          size: fontSize,
          font: font,
          color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
        });
      }
    }

    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  async listTemplates(): Promise<{ name: string; hasMapping: boolean }[]> {
    const files = await fs.readdir(this.templatesDir);
    const pdfFiles = files.filter(f => f.endsWith('.pdf'));

    const templates = await Promise.all(
      pdfFiles.map(async (name) => {
        const mappingPath = path.join(
          this.mappingsDir,
          name.replace('.pdf', '.json')
        );
        const hasMapping = await fs.pathExists(mappingPath);
        return { name, hasMapping };
      })
    );

    return templates;
  }

  async getMapping(templateName: string): Promise<TemplateMapping | null> {
    const sanitizedName = this.validatePDFFilename(templateName);
    const mappingPath = path.join(
      this.mappingsDir,
      sanitizedName.replace('.pdf', '.json')
    );

    if (!await fs.pathExists(mappingPath)) {
      return null;
    }

    return await fs.readJSON(mappingPath);
  }

  async saveMapping(templateName: string, mapping: TemplateMapping): Promise<void> {
    const sanitizedName = this.validatePDFFilename(templateName);
    const mappingPath = path.join(
      this.mappingsDir,
      sanitizedName.replace('.pdf', '.json')
    );

    await fs.writeJSON(mappingPath, mapping, { spaces: 2 });
  }

  async getTemplate(templateName: string): Promise<Buffer> {
    const sanitizedName = this.validatePDFFilename(templateName);
    const templatePath = path.join(this.templatesDir, sanitizedName);

    if (!await fs.pathExists(templatePath)) {
      throw new Error(`Template not found: ${templateName}`);
    }

    return await fs.readFile(templatePath);
  }

  async saveTemplate(templateName: string, buffer: Buffer): Promise<void> {
    const sanitizedName = this.validatePDFFilename(templateName);
    const templatePath = path.join(this.templatesDir, sanitizedName);
    await fs.writeFile(templatePath, buffer);
  }
}

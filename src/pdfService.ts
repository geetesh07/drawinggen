import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { TemplateMapping, FieldMapping } from './types';
import fs from 'fs-extra';
import path from 'path';

export class PDFService {
  private templatesDir = path.join(process.cwd(), 'templates');
  private mappingsDir = path.join(process.cwd(), 'mappings');
  private outputDir = path.join(process.cwd(), 'output');

  constructor() {
    fs.ensureDirSync(this.templatesDir);
    fs.ensureDirSync(this.mappingsDir);
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

  private async getFont(pdfDoc: PDFDocument, fontFamily?: string): Promise<any> {
    const fontMap: { [key: string]: any } = {
      'Helvetica': StandardFonts.Helvetica,
      'Helvetica-Bold': StandardFonts.HelveticaBold,
      'Helvetica-Oblique': StandardFonts.HelveticaOblique,
      'Times-Roman': StandardFonts.TimesRoman,
      'Times-Bold': StandardFonts.TimesRomanBold,
      'Times-Italic': StandardFonts.TimesRomanItalic,
      'Courier': StandardFonts.Courier,
      'Courier-Bold': StandardFonts.CourierBold,
    };

    const fontName = fontFamily || 'Helvetica';
    const standardFont = fontMap[fontName] || StandardFonts.Helvetica;
    return await pdfDoc.embedFont(standardFont);
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

      let fontFamily = fieldMapping.fontFamily || 'Helvetica';
      
      if (fieldMapping.bold && !fontFamily.includes('Bold')) {
        if (fontFamily === 'Helvetica') fontFamily = 'Helvetica-Bold';
        else if (fontFamily === 'Times-Roman') fontFamily = 'Times-Bold';
        else if (fontFamily === 'Courier') fontFamily = 'Courier-Bold';
      }
      
      if (fieldMapping.italic && !fontFamily.includes('Oblique') && !fontFamily.includes('Italic')) {
        if (fontFamily === 'Helvetica' || fontFamily === 'Helvetica-Bold') {
          fontFamily = 'Helvetica-Oblique';
        } else if (fontFamily.includes('Times')) {
          fontFamily = 'Times-Italic';
        }
      }

      const font = await this.getFont(pdfDoc, fontFamily);

      const textWidth = font.widthOfTextAtSize(textValue, fontSize);
      
      if (textWidth > maxWidth) {
        const lines = this.wrapText(textValue, font, fontSize, maxWidth);
        
        let currentY = fieldMapping.y;
        for (const line of lines) {
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

          currentY += fontSize + 2;
        }
      } else {
        let x = fieldMapping.x;
        const y = height - fieldMapping.y;

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

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

  async generatePDF(templateName: string, data: { [key: string]: string }): Promise<Buffer> {
    const templatePath = path.join(this.templatesDir, templateName);
    const mappingPath = path.join(
      this.mappingsDir,
      templateName.replace('.pdf', '.json')
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
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const { height } = firstPage.getSize();

    for (const [fieldName, fieldMapping] of Object.entries(mapping)) {
      const value = data[fieldName];
      if (value === undefined || value === null) {
        continue;
      }

      const textValue = String(value);
      let fontSize = fieldMapping.size || 10;
      const align = fieldMapping.align || 'left';

      const textWidth = font.widthOfTextAtSize(textValue, fontSize);
      const maxWidth = 200;

      if (textWidth > maxWidth) {
        fontSize = (maxWidth / textWidth) * fontSize;
      }

      let x = fieldMapping.x;
      const y = height - fieldMapping.y;

      if (align === 'center') {
        const adjustedWidth = font.widthOfTextAtSize(textValue, fontSize);
        x = x - adjustedWidth / 2;
      } else if (align === 'right') {
        const adjustedWidth = font.widthOfTextAtSize(textValue, fontSize);
        x = x - adjustedWidth;
      }

      firstPage.drawText(textValue, {
        x,
        y,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });
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
    const mappingPath = path.join(
      this.mappingsDir,
      templateName.replace('.pdf', '.json')
    );

    if (!await fs.pathExists(mappingPath)) {
      return null;
    }

    return await fs.readJSON(mappingPath);
  }

  async saveMapping(templateName: string, mapping: TemplateMapping): Promise<void> {
    const mappingPath = path.join(
      this.mappingsDir,
      templateName.replace('.pdf', '.json')
    );

    await fs.writeJSON(mappingPath, mapping, { spaces: 2 });
  }

  async getTemplate(templateName: string): Promise<Buffer> {
    const templatePath = path.join(this.templatesDir, templateName);

    if (!await fs.pathExists(templatePath)) {
      throw new Error(`Template not found: ${templateName}`);
    }

    return await fs.readFile(templatePath);
  }

  async saveTemplate(templateName: string, buffer: Buffer): Promise<void> {
    const templatePath = path.join(this.templatesDir, templateName);
    await fs.writeFile(templatePath, buffer);
  }
}

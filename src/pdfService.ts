import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import { TemplateMapping, FieldMapping, DrawingInsertion, Combination, CombinationInfo } from './types';
import fs from 'fs-extra';
import path from 'path';

export class PDFService {
  private templatesDir = path.join(process.cwd(), 'templates');
  private mappingsDir = path.join(process.cwd(), 'mappings');
  private drawingsDir = path.join(process.cwd(), 'drawings');
  private drawingsMappingsDir = path.join(process.cwd(), 'drawings_mappings');
  private combinationsDir = path.join(process.cwd(), 'combinations');
  private outputDir = path.join(process.cwd(), 'output');

  constructor() {
    fs.ensureDirSync(this.templatesDir);
    fs.ensureDirSync(this.mappingsDir);
    fs.ensureDirSync(this.drawingsDir);
    fs.ensureDirSync(this.drawingsMappingsDir);
    fs.ensureDirSync(this.combinationsDir);
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

  async deleteTemplate(templateName: string): Promise<void> {
    const sanitizedName = this.validatePDFFilename(templateName);
    const templatePath = path.join(this.templatesDir, sanitizedName);
    const mappingPath = path.join(
      this.mappingsDir,
      sanitizedName.replace('.pdf', '.json')
    );

    if (await fs.pathExists(templatePath)) {
      await fs.remove(templatePath);
    }

    if (await fs.pathExists(mappingPath)) {
      await fs.remove(mappingPath);
    }
  }

  async listDrawings(): Promise<{ name: string; type: 'pdf' | 'image' | 'svg'; hasMapping: boolean }[]> {
    const files = await fs.readdir(this.drawingsDir);
    const drawings: { name: string; type: 'pdf' | 'image' | 'svg'; hasMapping: boolean }[] = [];

    for (const file of files) {
      const lowerFile = file.toLowerCase();
      let type: 'pdf' | 'image' | 'svg' = 'image';
      
      if (lowerFile.endsWith('.pdf')) {
        type = 'pdf';
      } else if (lowerFile.endsWith('.svg')) {
        type = 'svg';
      }

      const mappingPath = path.join(
        this.drawingsMappingsDir,
        file.replace(/\.(pdf|png|jpg|jpeg|gif|bmp|svg)$/i, '.json')
      );
      const hasMapping = await fs.pathExists(mappingPath);

      drawings.push({ name: file, type, hasMapping });
    }

    return drawings;
  }

  async getDrawing(drawingName: string): Promise<{ buffer: Buffer; contentType: string }> {
    const sanitizedName = this.sanitizeFilename(drawingName);
    const drawingPath = path.join(this.drawingsDir, sanitizedName);

    if (!await fs.pathExists(drawingPath)) {
      throw new Error(`Drawing not found: ${drawingName}`);
    }

    const buffer = await fs.readFile(drawingPath);
    const lowerName = sanitizedName.toLowerCase();
    
    let contentType = 'application/octet-stream';
    if (lowerName.endsWith('.pdf')) {
      contentType = 'application/pdf';
    } else if (lowerName.endsWith('.svg')) {
      contentType = 'image/svg+xml';
    } else if (lowerName.endsWith('.png')) {
      contentType = 'image/png';
    } else if (lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg')) {
      contentType = 'image/jpeg';
    } else if (lowerName.endsWith('.gif')) {
      contentType = 'image/gif';
    }

    return { buffer, contentType };
  }

  async saveDrawing(drawingName: string, buffer: Buffer): Promise<void> {
    const sanitizedName = this.sanitizeFilename(drawingName);
    const drawingPath = path.join(this.drawingsDir, sanitizedName);
    await fs.writeFile(drawingPath, buffer);
  }

  async deleteDrawing(drawingName: string): Promise<void> {
    const sanitizedName = this.sanitizeFilename(drawingName);
    const drawingPath = path.join(this.drawingsDir, sanitizedName);
    const mappingPath = path.join(
      this.drawingsMappingsDir,
      sanitizedName.replace(/\.(pdf|png|jpg|jpeg|gif|bmp|svg)$/i, '.json')
    );

    if (await fs.pathExists(drawingPath)) {
      await fs.remove(drawingPath);
    }

    if (await fs.pathExists(mappingPath)) {
      await fs.remove(mappingPath);
    }
  }

  async getDrawingMapping(drawingName: string): Promise<TemplateMapping | null> {
    const sanitizedName = this.sanitizeFilename(drawingName);
    const mappingPath = path.join(
      this.drawingsMappingsDir,
      sanitizedName.replace(/\.(pdf|png|jpg|jpeg|gif|bmp|svg)$/i, '.json')
    );

    if (!await fs.pathExists(mappingPath)) {
      return null;
    }

    return await fs.readJSON(mappingPath);
  }

  async saveDrawingMapping(drawingName: string, mapping: TemplateMapping): Promise<void> {
    const sanitizedName = this.sanitizeFilename(drawingName);
    const mappingPath = path.join(
      this.drawingsMappingsDir,
      sanitizedName.replace(/\.(pdf|png|jpg|jpeg|gif|bmp|svg)$/i, '.json')
    );

    await fs.writeJSON(mappingPath, mapping, { spaces: 2 });
  }

  async renameDrawing(oldName: string, newName: string): Promise<void> {
    const sanitizedOldName = this.sanitizeFilename(oldName);
    const sanitizedNewName = this.sanitizeFilename(newName);

    const oldExtension = path.extname(sanitizedOldName);
    const newExtension = path.extname(sanitizedNewName);

    if (oldExtension.toLowerCase() !== newExtension.toLowerCase()) {
      throw new Error('Cannot change file extension when renaming');
    }

    const oldDrawingPath = path.join(this.drawingsDir, sanitizedOldName);
    const newDrawingPath = path.join(this.drawingsDir, sanitizedNewName);

    if (!await fs.pathExists(oldDrawingPath)) {
      throw new Error(`Drawing not found: ${oldName}`);
    }

    if (await fs.pathExists(newDrawingPath)) {
      throw new Error(`Drawing already exists with name: ${newName}`);
    }

    await fs.rename(oldDrawingPath, newDrawingPath);

    const oldMappingPath = path.join(
      this.drawingsMappingsDir,
      sanitizedOldName.replace(/\.(pdf|png|jpg|jpeg|gif|bmp|svg)$/i, '.json')
    );
    const newMappingPath = path.join(
      this.drawingsMappingsDir,
      sanitizedNewName.replace(/\.(pdf|png|jpg|jpeg|gif|bmp|svg)$/i, '.json')
    );

    if (await fs.pathExists(oldMappingPath)) {
      await fs.rename(oldMappingPath, newMappingPath);
    }
  }

  async listCombinations(): Promise<CombinationInfo[]> {
    const files = await fs.readdir(this.combinationsDir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    return jsonFiles.map(name => ({ name: name.replace('.json', '') }));
  }

  async getCombination(combinationName: string): Promise<Combination | null> {
    const sanitizedName = this.sanitizeFilename(combinationName + '.json');
    const combinationPath = path.join(this.combinationsDir, sanitizedName);

    if (!await fs.pathExists(combinationPath)) {
      return null;
    }

    return await fs.readJSON(combinationPath);
  }

  async saveCombination(combinationName: string, combination: Combination): Promise<void> {
    const sanitizedName = this.sanitizeFilename(combinationName + '.json');
    const combinationPath = path.join(this.combinationsDir, sanitizedName);
    await fs.writeJSON(combinationPath, combination, { spaces: 2 });
  }

  async deleteCombination(combinationName: string): Promise<void> {
    const sanitizedName = this.sanitizeFilename(combinationName + '.json');
    const combinationPath = path.join(this.combinationsDir, sanitizedName);

    if (await fs.pathExists(combinationPath)) {
      await fs.remove(combinationPath);
    }
  }

  async generateWithCombination(
    combinationName: string,
    templateData: { [key: string]: string },
    drawingsData: { [drawingName: string]: { [key: string]: string } }
  ): Promise<Buffer> {
    const combination = await this.getCombination(combinationName);
    
    if (!combination) {
      throw new Error(`Combination not found: ${combinationName}`);
    }

    const templateBuffer = await this.getTemplate(combination.templateName);
    const templatePdfDoc = await PDFDocument.load(templateBuffer);
    const templateMapping = await this.getMapping(combination.templateName);
    const firstPage = templatePdfDoc.getPages()[0];
    const { height } = firstPage.getSize();

    if (templateMapping) {
      for (const [fieldName, fieldMapping] of Object.entries(templateMapping)) {
        const textValue = templateData[fieldName];
        if (!textValue) continue;

        const fontSize = fieldMapping.size || 12;
        const maxWidth = fieldMapping.maxWidth || 200;
        const align = fieldMapping.align || 'left';
        const colorHex = fieldMapping.color || '#000000';
        const colorRgb = this.hexToRgb(colorHex);
        const fontFamily = fieldMapping.fontFamily || 'Helvetica';
        const isBold = fieldMapping.bold || false;
        const isItalic = fieldMapping.italic || false;

        const baseFamily = fontFamily.replace(/-Bold|-Oblique|-BoldOblique|-Italic|-BoldItalic/gi, '');

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

        const font = await templatePdfDoc.embedFont(finalFont);
        const maxHeight = fieldMapping.maxHeight || 1000;
        const lineHeight = fontSize + 2;
        const textWidth = font.widthOfTextAtSize(textValue, fontSize);
        const baselineY = fieldMapping.y + fontSize;

        if (textWidth > maxWidth) {
          const lines = this.wrapText(textValue, font, fontSize, maxWidth);
          let currentY = baselineY;
          for (const line of lines) {
            const lineOffset = currentY - baselineY;
            if (lineOffset + lineHeight > maxHeight) break;

            let x = fieldMapping.x;
            const y = height - currentY;
            const lineWidth = font.widthOfTextAtSize(line, fontSize);

            if (align === 'center') x = x + (maxWidth - lineWidth) / 2;
            else if (align === 'right') x = x + maxWidth - lineWidth;

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

          if (align === 'center') x = x + (maxWidth - textWidth) / 2;
          else if (align === 'right') x = x + maxWidth - textWidth;

          firstPage.drawText(textValue, {
            x,
            y,
            size: fontSize,
            font: font,
            color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
          });
        }
      }
    }

    for (const placement of combination.drawingPlacements) {
      if (placement.conditionField && placement.conditionValue) {
        const conditionFieldValue = templateData[placement.conditionField];
        if (conditionFieldValue !== placement.conditionValue) {
          continue;
        }
      }

      const drawingName = placement.drawingName;
      const drawingBuffer = await this.getDrawing(drawingName);
      const drawingMapping = await this.getDrawingMapping(drawingName);
      const drawingData = drawingsData[drawingName] || {};
      const drawingExt = path.extname(drawingName).toLowerCase();

      if (drawingExt === '.pdf') {
        const drawingPdfDoc = await PDFDocument.load(drawingBuffer.buffer);

        if (drawingMapping) {
          const drawingPages = drawingPdfDoc.getPages();
          const drawingFirstPage = drawingPages[0];
          const { height: drawingHeight } = drawingFirstPage.getSize();

          for (const [fieldName, fieldMapping] of Object.entries(drawingMapping)) {
            const textValue = drawingData[fieldName];
            if (!textValue) continue;

            const fontSize = fieldMapping.size || 12;
            const maxWidth = fieldMapping.maxWidth || 200;
            const align = fieldMapping.align || 'left';
            const colorHex = fieldMapping.color || '#000000';
            const colorRgb = this.hexToRgb(colorHex);
            const fontFamily = fieldMapping.fontFamily || 'Helvetica';
            const isBold = fieldMapping.bold || false;
            const isItalic = fieldMapping.italic || false;

            const baseFamily = fontFamily.replace(/-Bold|-Oblique|-BoldOblique|-Italic|-BoldItalic/gi, '');

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

            const font = await drawingPdfDoc.embedFont(finalFont);
            const maxHeight = fieldMapping.maxHeight || 1000;
            const lineHeight = fontSize + 2;
            const textWidth = font.widthOfTextAtSize(textValue, fontSize);
            const baselineY = fieldMapping.y + fontSize;

            if (textWidth > maxWidth) {
              const lines = this.wrapText(textValue, font, fontSize, maxWidth);
              let currentY = baselineY;
              for (const line of lines) {
                const lineOffset = currentY - baselineY;
                if (lineOffset + lineHeight > maxHeight) break;

                let x = fieldMapping.x;
                const y = drawingHeight - currentY;
                const lineWidth = font.widthOfTextAtSize(line, fontSize);

                if (align === 'center') x = x + (maxWidth - lineWidth) / 2;
                else if (align === 'right') x = x + maxWidth - lineWidth;

                drawingFirstPage.drawText(line, {
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
              const y = drawingHeight - baselineY;

              if (align === 'center') x = x + (maxWidth - textWidth) / 2;
              else if (align === 'right') x = x + maxWidth - textWidth;

              drawingFirstPage.drawText(textValue, {
                x,
                y,
                size: fontSize,
                font: font,
                color: rgb(colorRgb.r, colorRgb.g, colorRgb.b),
              });
            }
          }
        }

        const [embeddedPage] = await templatePdfDoc.embedPdf(drawingPdfDoc, [0]);
        
        const drawingWidth = embeddedPage.width;
        const drawingHeight = embeddedPage.height;
        const drawingAspectRatio = drawingWidth / drawingHeight;
        
        const placementAspectRatio = placement.width / placement.height;
        let finalWidth = placement.width;
        let finalHeight = placement.height;
        let offsetX = 0;
        let offsetY = 0;
        
        if (drawingAspectRatio > placementAspectRatio) {
          finalHeight = placement.width / drawingAspectRatio;
          offsetY = (placement.height - finalHeight) / 2;
        } else {
          finalWidth = placement.height * drawingAspectRatio;
          offsetX = (placement.width - finalWidth) / 2;
        }
        
        const rotation = placement.rotation || 0;
        firstPage.drawPage(embeddedPage, {
          x: placement.x + offsetX,
          y: height - placement.y - placement.height + offsetY,
          width: finalWidth,
          height: finalHeight,
          rotate: degrees(rotation),
        });
      } else if (['.png', '.jpg', '.jpeg'].includes(drawingExt)) {
        let image;
        if (drawingExt === '.png') {
          image = await templatePdfDoc.embedPng(drawingBuffer.buffer);
        } else {
          image = await templatePdfDoc.embedJpg(drawingBuffer.buffer);
        }

        const imageWidth = image.width;
        const imageHeight = image.height;
        const imageAspectRatio = imageWidth / imageHeight;
        
        const placementAspectRatio = placement.width / placement.height;
        let finalWidth = placement.width;
        let finalHeight = placement.height;
        let offsetX = 0;
        let offsetY = 0;
        
        if (imageAspectRatio > placementAspectRatio) {
          finalHeight = placement.width / imageAspectRatio;
          offsetY = (placement.height - finalHeight) / 2;
        } else {
          finalWidth = placement.height * imageAspectRatio;
          offsetX = (placement.width - finalWidth) / 2;
        }

        const rotation = placement.rotation || 0;
        firstPage.drawImage(image, {
          x: placement.x + offsetX,
          y: height - placement.y - placement.height + offsetY,
          width: finalWidth,
          height: finalHeight,
          rotate: degrees(rotation),
        });
      }
    }

    const pdfBytes = await templatePdfDoc.save();
    return Buffer.from(pdfBytes);
  }
}

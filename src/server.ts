import express, { Request, Response } from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { PDFService } from './pdfService';
import { GenerateRequest, TemplateMapping } from './types';

const app = express();
const port = 5000;
const pdfService = new PDFService();

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, '../client/build')));

app.post('/api/generate', async (req: Request, res: Response) => {
  try {
    const { template, data }: GenerateRequest = req.body;

    if (!template || !data) {
      return res.status(400).json({ error: 'Missing template or data' });
    }

    const pdfBuffer = await pdfService.generatePDF(template, data);

    const filename = template.replace('.pdf', '_filled.pdf');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('PDF generation error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate PDF' });
  }
});

app.get('/api/templates', async (req: Request, res: Response) => {
  try {
    const templates = await pdfService.listTemplates();
    res.json(templates);
  } catch (error: any) {
    console.error('List templates error:', error);
    res.status(500).json({ error: error.message || 'Failed to list templates' });
  }
});

app.get('/api/templates/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const pdfBuffer = await pdfService.getTemplate(name);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Get template error:', error);
    res.status(404).json({ error: error.message || 'Template not found' });
  }
});

app.post('/api/templates/upload', upload.single('template'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filename = req.file.originalname;
    
    if (!filename.endsWith('.pdf')) {
      return res.status(400).json({ error: 'Only PDF files are allowed' });
    }

    await pdfService.saveTemplate(filename, req.file.buffer);

    res.json({ message: 'Template uploaded successfully', filename });
  } catch (error: any) {
    console.error('Upload template error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload template' });
  }
});

app.delete('/api/templates/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    await pdfService.deleteTemplate(name);
    res.json({ message: 'Template deleted successfully' });
  } catch (error: any) {
    console.error('Delete template error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete template' });
  }
});

app.post('/api/templates/:name/rotate', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const { rotation } = req.body;

    if (![90, 180, 270].includes(rotation)) {
      return res.status(400).json({ error: 'Rotation must be 90, 180, or 270 degrees' });
    }

    await pdfService.rotatePDF(name, rotation, 'template');
    res.json({ message: 'Template rotated successfully' });
  } catch (error: any) {
    console.error('Rotate template error:', error);
    res.status(500).json({ error: error.message || 'Failed to rotate template' });
  }
});

app.get('/api/drawings', async (req: Request, res: Response) => {
  try {
    const drawings = await pdfService.listDrawings();
    res.json(drawings);
  } catch (error: any) {
    console.error('List drawings error:', error);
    res.status(500).json({ error: error.message || 'Failed to list drawings' });
  }
});

app.get('/api/drawings/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const { buffer, contentType } = await pdfService.getDrawing(name);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(buffer);
  } catch (error: any) {
    console.error('Get drawing error:', error);
    res.status(404).json({ error: error.message || 'Drawing not found' });
  }
});

app.post('/api/drawings/upload', upload.single('drawing'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filename = req.file.originalname;
    
    await pdfService.saveDrawing(filename, req.file.buffer);

    res.json({ message: 'Drawing uploaded successfully', filename });
  } catch (error: any) {
    console.error('Upload drawing error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload drawing' });
  }
});

app.delete('/api/drawings/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    await pdfService.deleteDrawing(name);
    res.json({ message: 'Drawing deleted successfully' });
  } catch (error: any) {
    console.error('Delete drawing error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete drawing' });
  }
});

app.put('/api/drawings/:name/rename', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const { newName } = req.body;

    if (!newName) {
      return res.status(400).json({ error: 'New name is required' });
    }

    await pdfService.renameDrawing(name, newName);
    res.json({ message: 'Drawing renamed successfully', newName });
  } catch (error: any) {
    console.error('Rename drawing error:', error);
    res.status(500).json({ error: error.message || 'Failed to rename drawing' });
  }
});

app.post('/api/drawings/:name/rotate', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const { rotation } = req.body;

    if (![90, 180, 270].includes(rotation)) {
      return res.status(400).json({ error: 'Rotation must be 90, 180, or 270 degrees' });
    }

    await pdfService.rotatePDF(name, rotation, 'drawing');
    res.json({ message: 'Drawing rotated successfully' });
  } catch (error: any) {
    console.error('Rotate drawing error:', error);
    res.status(500).json({ error: error.message || 'Failed to rotate drawing' });
  }
});

app.get('/api/drawing-mappings/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const mapping = await pdfService.getDrawingMapping(name);

    if (!mapping) {
      return res.status(404).json({ error: 'Drawing mapping not found' });
    }

    res.json(mapping);
  } catch (error: any) {
    console.error('Get drawing mapping error:', error);
    res.status(500).json({ error: error.message || 'Failed to get drawing mapping' });
  }
});

app.post('/api/drawing-mappings/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const mapping = req.body;

    await pdfService.saveDrawingMapping(name, mapping);

    res.json({ message: 'Drawing mapping saved successfully' });
  } catch (error: any) {
    console.error('Save drawing mapping error:', error);
    res.status(500).json({ error: error.message || 'Failed to save drawing mapping' });
  }
});

app.get('/api/mappings/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const mapping = await pdfService.getMapping(name);

    if (!mapping) {
      return res.status(404).json({ error: 'Mapping not found' });
    }

    res.json(mapping);
  } catch (error: any) {
    console.error('Get mapping error:', error);
    res.status(500).json({ error: error.message || 'Failed to get mapping' });
  }
});

app.post('/api/mappings/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const mapping: TemplateMapping = req.body;

    await pdfService.saveMapping(name, mapping);

    res.json({ message: 'Mapping saved successfully' });
  } catch (error: any) {
    console.error('Save mapping error:', error);
    res.status(500).json({ error: error.message || 'Failed to save mapping' });
  }
});

app.get('/api/combinations', async (req: Request, res: Response) => {
  try {
    const combinations = await pdfService.listCombinations();
    res.json(combinations);
  } catch (error: any) {
    console.error('List combinations error:', error);
    res.status(500).json({ error: error.message || 'Failed to list combinations' });
  }
});

app.get('/api/combinations/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const combination = await pdfService.getCombination(name);

    if (!combination) {
      return res.status(404).json({ error: 'Combination not found' });
    }

    res.json(combination);
  } catch (error: any) {
    console.error('Get combination error:', error);
    res.status(500).json({ error: error.message || 'Failed to get combination' });
  }
});

app.post('/api/combinations/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const combination = req.body;

    await pdfService.saveCombination(name, combination);

    res.json({ message: 'Combination saved successfully' });
  } catch (error: any) {
    console.error('Save combination error:', error);
    res.status(500).json({ error: error.message || 'Failed to save combination' });
  }
});

app.delete('/api/combinations/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    await pdfService.deleteCombination(name);
    res.json({ message: 'Combination deleted successfully' });
  } catch (error: any) {
    console.error('Delete combination error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete combination' });
  }
});

app.post('/api/combinations/bulk-create', async (req: Request, res: Response) => {
  try {
    const { combinations } = req.body;

    if (!Array.isArray(combinations) || combinations.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty combinations array' });
    }

    let created = 0;
    const errors: string[] = [];

    for (const combo of combinations) {
      try {
        const { name, templateName, drawing, placement } = combo;

        if (!name || !templateName || !drawing || !placement) {
          errors.push(`Missing required fields for combination: ${name || 'unknown'}`);
          continue;
        }

        const combination = {
          name,
          templateName,
          drawingPlacements: [
            {
              drawingName: drawing,
              x: placement.x,
              y: placement.y,
              width: placement.width,
              height: placement.height,
              rotation: placement.rotation || 0
            }
          ]
        };

        await pdfService.saveCombination(name, combination);
        created++;
      } catch (error: any) {
        errors.push(`Failed to create ${combo.name}: ${error.message}`);
      }
    }

    if (created === 0) {
      return res.status(500).json({ 
        error: 'Failed to create any combinations', 
        details: errors 
      });
    }

    res.json({ 
      message: `Successfully created ${created} combination(s)`,
      created,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error: any) {
    console.error('Bulk create combinations error:', error);
    res.status(500).json({ error: error.message || 'Failed to bulk create combinations' });
  }
});

app.post('/api/generate-combination', async (req: Request, res: Response) => {
  try {
    const { combination, templateData, drawingsData } = req.body;

    console.log('=== Generate Combination Request ===');
    console.log('Combination:', combination);
    console.log('Template Data:', JSON.stringify(templateData, null, 2));
    console.log('Drawings Data:', JSON.stringify(drawingsData, null, 2));
    console.log('===================================');

    if (!combination) {
      return res.status(400).json({ error: 'Combination name is required' });
    }

    if (!templateData) {
      return res.status(400).json({ error: 'Template data is required' });
    }

    const pdfBuffer = await pdfService.generateWithCombination(
      combination,
      templateData,
      drawingsData || {}
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Content-Disposition', `attachment; filename="${combination}_generated.pdf"`);
    res.send(pdfBuffer);
  } catch (error: any) {
    console.error('Generate with combination error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate PDF' });
  }
});

app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`PDF Generator Server running on http://0.0.0.0:${port}`);
  console.log(`API endpoint: http://0.0.0.0:${port}/api/generate`);
  console.log(`Admin interface: http://0.0.0.0:${port}`);
});

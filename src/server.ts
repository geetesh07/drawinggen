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

app.get('*', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../client/build/index.html'));
});

app.listen(port, '0.0.0.0', () => {
  console.log(`PDF Generator Server running on http://0.0.0.0:${port}`);
  console.log(`API endpoint: http://0.0.0.0:${port}/api/generate`);
  console.log(`Admin interface: http://0.0.0.0:${port}`);
});

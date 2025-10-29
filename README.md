# PDF Generator Microservice

A TypeScript-based PDF Generator microservice designed for ERPNext/Frappe integration. Generate filled PDFs from templates via REST API with visual field mapping.

## ✨ Features

- 📄 **Visual Area Selection** - Drag on PDFs to visually define field boundaries (width × height)
- ✏️ **Rich Text Styling** - Font families, colors, bold, italic, alignment options
- 🎯 **Edit Mode** - Modify existing field mappings and redraw boundaries
- 📏 **Smart Text Handling** - Automatic word wrapping and overflow clipping
- 🔍 **Zoom Controls** - 50%-400% zoom for precise field placement
- 🚀 **REST API** - Simple `/api/generate` endpoint for PDF generation
- 🎨 **Admin Interface** - React-based UI for template and mapping management
- 📦 **File-Based** - No database required, everything stored in folders
- 🔒 **Secure** - Input validation and path traversal protection
- ⚡ **Fast** - Pure JavaScript PDF manipulation with pdf-lib

## 🚀 Quick Start

### Installation

```bash
npm install
cd client && npm install && cd ..
```

### Development

```bash
npm run dev
```

The server will start on http://localhost:5000

### Production Build

```bash
npm run build:all
npm start
```

## 📖 Usage

### 1. Upload a Template

1. Open http://localhost:5000 in your browser
2. Click "+ Upload PDF" button
3. Select your PDF template file

### 2. Map Fields

1. Select the template from the sidebar
2. Go to "Field Mapper" tab
3. Enter a field name (e.g., "customer_name") in the right panel
4. Configure text styling (font size, family, color, bold, italic, alignment)
5. **Drag on the PDF** to visually select the field area (width × height)
   - Use zoom controls to adjust view (50%-400%)
   - Green overlay shows selection area while dragging
   - Text will automatically wrap within the defined area
6. Click "💾 Save Mapping" to save all fields

**Edit Existing Fields:**
1. Click the ✏️ edit button on any mapped field
2. Adjust styling options in the right panel
3. Drag on PDF to redefine the field area
4. Save mapping when done

### 3. Generate PDFs

#### Via Admin Interface (Testing)

1. Go to "Test Generator" tab
2. Fill in sample values
3. Click "Generate & Download PDF"

#### Via API (Production)

```javascript
fetch('http://your-domain.com/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    template: 'Sample_Quote.pdf',
    data: {
      customer_name: 'Acme Corp',
      price: '₹1,250',
      date: '2025-10-29'
    }
  })
})
.then(res => res.blob())
.then(blob => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'output.pdf';
  link.click();
});
```

## 🔌 ERPNext/Frappe Integration

Add this to your custom script:

```javascript
frappe.ui.form.on('Your DocType', {
  download_pdf: function(frm) {
    fetch('https://your-pdf-service.com/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template: 'Quote_Template.pdf',
        data: {
          customer_name: frm.doc.customer_name,
          price: frm.doc.price,
          date: frm.doc.date
        }
      })
    })
    .then(res => res.blob())
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = frm.doc.name + '.pdf';
      link.click();
    })
    .catch(err => frappe.msgprint('Failed to generate PDF'));
  }
});
```

## 📡 API Reference

### POST /api/generate

Generate a filled PDF from template and JSON data.

**Request:**
```json
{
  "template": "Template_Name.pdf",
  "data": {
    "field1": "value1",
    "field2": "value2"
  }
}
```

**Response:** PDF file (application/pdf)

### GET /api/templates

List all available templates.

**Response:**
```json
[
  { "name": "Template1.pdf", "hasMapping": true },
  { "name": "Template2.pdf", "hasMapping": false }
]
```

### POST /api/templates/upload

Upload a new PDF template (multipart/form-data).

### GET /api/templates/:name

Download a specific template.

### GET /api/mappings/:name

Get field mapping for a template.

### POST /api/mappings/:name

Save field mapping for a template.

## 📁 Project Structure

```
├── src/
│   ├── server.ts          # Express API server
│   ├── pdfService.ts      # PDF manipulation service
│   └── types.ts           # TypeScript definitions
├── client/                # React admin interface
│   ├── src/
│   │   ├── App.tsx
│   │   └── components/
│   │       ├── TemplateList.tsx
│   │       ├── PDFMapper.tsx
│   │       └── TestGenerator.tsx
│   └── build/             # Built frontend (served by Express)
├── templates/             # PDF template files
├── mappings/              # JSON mapping files
└── output/                # Temporary generated PDFs
```

## 🛠 Technology Stack

- **Backend**: Node.js 20+, Express, TypeScript
- **PDF Library**: pdf-lib (pure JavaScript)
- **Frontend**: React 18, Vite, PDF.js
- **File Management**: fs-extra
- **Upload Handling**: Multer

## 🔐 Security

- Path traversal protection with filename sanitization
- Input validation on all endpoints
- CORS enabled for cross-origin requests
- Secure file upload handling

## 📝 Mapping JSON Format

Mapping files define field positions and styling in PDF coordinates:

```json
{
  "customer_name": {
    "x": 100,
    "y": 152,
    "size": 12,
    "align": "left",
    "fontFamily": "Helvetica",
    "color": "#000000",
    "maxWidth": 250,
    "maxHeight": 40,
    "bold": false,
    "italic": false
  },
  "description": {
    "x": 100,
    "y": 250,
    "size": 10,
    "align": "left",
    "fontFamily": "Times-Roman",
    "color": "#333333",
    "maxWidth": 400,
    "maxHeight": 100,
    "bold": false,
    "italic": false
  }
}
```

**Field Properties:**
- **x, y**: Position in points (y is baseline coordinate, 72 points = 1 inch)
- **size**: Font size in points
- **align**: "left", "center", or "right"
- **fontFamily**: "Helvetica", "Times-Roman", or "Courier"
- **color**: Hex color code (e.g., "#000000" for black)
- **maxWidth**: Maximum width in points (text wraps automatically)
- **maxHeight**: Maximum height in points (text clips if exceeded)
- **bold**: Apply bold weight
- **italic**: Apply italic/oblique style

## 🚢 Deployment

### Replit

The application is ready to deploy on Replit. Just click "Deploy" in the Replit interface.

### Other Platforms

1. Build the application: `npm run build:all`
2. Set NODE_ENV=production
3. Run: `npm start`
4. Ensure port 5000 is accessible

## 📄 License

MIT

## 🤝 Support

For issues or questions, please open an issue in the repository.

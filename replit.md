# PDF Generator Microservice

## Overview
A TypeScript-based PDF Generator microservice for ERPNext/Frappe integration. This application allows you to:
- Upload PDF templates
- Visually map fields by clicking on the PDF
- Generate filled PDFs via REST API by sending JSON data
- No database required - everything is file-based

**Status**: Fully functional and ready for use
**Last Updated**: October 29, 2025

## Project Architecture

### Backend (TypeScript + Express)
- **src/server.ts** - Express API server with CORS enabled
- **src/pdfService.ts** - PDF manipulation service using pdf-lib
- **src/types.ts** - TypeScript type definitions

### Frontend (React + Vite)
- **client/** - Admin interface for template management
- Visual PDF field mapper with click-to-place functionality
- Test generator to preview PDFs before integration

### File Structure
```
/templates/     - PDF template files
/mappings/      - JSON mapping files (field positions)
/output/        - Temporary generated PDFs (optional)
/dist/          - Compiled backend code
/client/build/  - Built React frontend
```

## API Endpoints

### POST /api/generate
Generate a filled PDF from template and JSON data

**Request:**
```json
{
  "template": "Sample_Quote.pdf",
  "data": {
    "flute_dia": "12.5 mm",
    "price": "₹1,250",
    "coating": "TiAlN",
    "customer_name": "Acme Corp",
    "date": "2025-10-29"
  }
}
```

**Response:** PDF file download (application/pdf)

### GET /api/templates
List all available templates

**Response:**
```json
[
  {
    "name": "Sample_Quote.pdf",
    "hasMapping": true
  }
]
```

### POST /api/templates/upload
Upload a new PDF template (multipart/form-data)

### GET /api/templates/:name
Download a specific template

### GET /api/mappings/:name
Get field mapping for a template

### POST /api/mappings/:name
Save field mapping for a template

## Mapping JSON Format

Each mapping file defines field positions:
```json
{
  "flute_dia": { "x": 200, "y": 140, "size": 12, "align": "left" },
  "price": { "x": 200, "y": 180, "size": 12, "align": "left" },
  "coating": { "x": 200, "y": 220, "size": 12, "align": "left" }
}
```

- **x, y**: Position in points (72 points = 1 inch)
- **size**: Font size in points
- **align**: "left", "center", or "right"

## ERPNext/Frappe Integration Example

```javascript
// In your ERPNext custom script
frappe.ui.form.on('Your DocType', {
  generate_pdf: function(frm) {
    fetch('https://your-domain.com/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        template: 'Sample_Quote.pdf',
        data: {
          flute_dia: frm.doc.flute_diameter,
          price: frm.doc.price,
          coating: frm.doc.coating,
          customer_name: frm.doc.customer_name,
          date: frm.doc.date
        }
      })
    })
    .then(res => res.blob())
    .then(blob => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'Quote.pdf';
      link.click();
    });
  }
});
```

## How to Use

### 1. Access Admin Interface
Open the application in your browser at port 5000

### 2. Upload Template
- Click "Upload PDF" button
- Select your PDF template file

### 3. Map Fields
- Select the template from the sidebar
- Go to "Field Mapper" tab
- Enter field name (e.g., "customer_name")
- Set font size and alignment
- Click on the PDF where the value should appear
- Repeat for all fields
- Click "Save Mapping"

### 4. Test Generation
- Go to "Test Generator" tab
- Fill in sample values
- Click "Generate & Download PDF"
- Verify the output

### 5. Use in ERP
- Use the API example provided in the Test Generator tab
- Integrate with your ERPNext/Frappe forms

## Development

### Install Dependencies
```bash
npm install
cd client && npm install
```

### Build
```bash
npm run build        # Build backend
npm run build:client # Build frontend
npm run build:all    # Build both
```

### Run Development Server
```bash
npm run dev
```

Server runs on http://0.0.0.0:5000
- Admin interface: http://0.0.0.0:5000
- API: http://0.0.0.0:5000/api/generate

## Features

✅ Visual field mapping by clicking on PDF
✅ Support for font size and text alignment
✅ Auto-shrink text if too long
✅ File-based storage (no database needed)
✅ CORS enabled for cross-origin requests
✅ React admin interface with PDF.js viewer
✅ Test generator with API examples
✅ Clean TypeScript implementation
✅ Production-ready build system

## Technical Details

- **Backend**: Node.js 20+, Express, TypeScript
- **PDF Library**: pdf-lib (pure JS, no dependencies)
- **Frontend**: React 18, Vite, PDF.js
- **File Management**: fs-extra
- **Upload Handling**: Multer

## Notes

- Coordinates are in PDF points (72 points = 1 inch)
- Y-axis is flipped in PDFs (0 is bottom)
- The mapper handles coordinate conversion automatically
- All files are cached with no-cache headers for instant updates

# Quick Start Guide

## 🎯 Your PDF Generator is Ready!

The application is running at: **http://localhost:5000**

## 📋 Step-by-Step Usage

### Step 1: Access the Admin Interface

Open your browser and navigate to the application. You'll see:
- A sidebar with templates
- A main area for mapping and testing

### Step 2: Select a Template

Click on **"Sample_Quote.pdf"** from the sidebar (a sample template is already included).

### Step 3: Map Fields

1. Click the **"Field Mapper"** tab
2. Enter a field name: `customer_name`
3. Set font size: `12`
4. Set alignment: `left`
5. **Click on the PDF** where you want the customer name to appear
6. Repeat for other fields:
   - `flute_dia` - for product diameter
   - `price` - for pricing
   - `coating` - for coating type
   - `date` - for date
7. Click **"💾 Save Mapping"**

### Step 4: Test Generation

1. Click the **"Test Generator"** tab
2. Fill in sample values:
   - customer_name: "Acme Corporation"
   - flute_dia: "12.5 mm"
   - price: "₹1,250"
   - coating: "TiAlN"
   - date: "2025-10-29"
3. Click **"📥 Generate & Download PDF"**
4. Your filled PDF will download!

### Step 5: Use in ERPNext

Copy the API example from the Test Generator tab and paste it into your ERPNext custom script.

## 🔌 API Quick Reference

### Generate PDF

```bash
curl -X POST http://localhost:5000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "template": "Sample_Quote.pdf",
    "data": {
      "customer_name": "Acme Corp",
      "price": "₹1,250"
    }
  }' \
  --output filled.pdf
```

## 💡 Tips

- **Click Accuracy**: Click precisely where you want text to start
- **Font Size**: Larger fonts (14-16) for headers, smaller (10-12) for details
- **Alignment**: 
  - Use `left` for most fields
  - Use `right` for prices/numbers
  - Use `center` for titles
- **Coordinates**: Y starts from top (0 is at the top edge)

## 🆘 Need Help?

- Templates not showing? Upload a PDF using the "+ Upload PDF" button
- Mapping not saving? Make sure you clicked "Save Mapping"
- PDF generation failing? Check that mapping exists for the template
- Text overlapping? Adjust X and Y coordinates in the mapper

## 📤 Upload Your Own Template

1. Click **"+ Upload PDF"**
2. Select your PDF file
3. Click the template in the sidebar
4. Map all your fields
5. Save and test!

Enjoy your PDF Generator! 🎉

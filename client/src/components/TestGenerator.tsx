import { useState, useEffect } from 'react';
import './TestGenerator.css';

interface FieldMapping {
  x: number;
  y: number;
  size: number;
  align?: 'left' | 'center' | 'right';
}

interface TemplateMapping {
  [fieldName: string]: FieldMapping;
}

interface Props {
  templateName: string;
}

function TestGenerator({ templateName }: Props) {
  const [mapping, setMapping] = useState<TemplateMapping>({});
  const [testData, setTestData] = useState<{ [key: string]: string }>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    loadMapping();
    return () => {
      if (pdfPreviewUrl) {
        URL.revokeObjectURL(pdfPreviewUrl);
      }
    };
  }, [templateName]);

  const loadMapping = async () => {
    try {
      const response = await fetch(`/api/mappings/${templateName}`);
      if (response.ok) {
        const data = await response.json();
        setMapping(data);
        
        const initialData: { [key: string]: string } = {};
        Object.keys(data).forEach((field) => {
          initialData[field] = '';
        });
        setTestData(initialData);
      }
    } catch (error) {
      console.error('Failed to load mapping:', error);
    }
  };

  const handleFieldChange = (fieldName: string, value: string) => {
    setTestData({
      ...testData,
      [fieldName]: value,
    });
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: templateName,
          data: testData,
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        
        if (pdfPreviewUrl) {
          URL.revokeObjectURL(pdfPreviewUrl);
        }
        
        const url = URL.createObjectURL(blob);
        setPdfPreviewUrl(url);
      } else {
        const error = await response.json();
        alert(`Failed to generate PDF: ${error.error}`);
      }
    } catch (error) {
      console.error('Generation error:', error);
      alert('Failed to generate PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (pdfPreviewUrl) {
      const link = document.createElement('a');
      link.href = pdfPreviewUrl;
      link.download = templateName.replace('.pdf', '_filled.pdf');
      link.click();
    }
  };

  const fieldCount = Object.keys(mapping).length;

  if (fieldCount === 0) {
    return (
      <div className="test-generator">
        <div className="no-mapping">
          <h3>No mapping defined</h3>
          <p>Please create a field mapping first using the Field Mapper tab</p>
        </div>
      </div>
    );
  }

  return (
    <div className="test-generator">
      <div className="test-layout">
        <div className="test-sidebar">
          <div className="test-header">
            <h3>Test PDF Generation</h3>
            <p>Fill in test data and generate a preview</p>
          </div>

          <div className="test-form">
            {Object.keys(mapping).map((fieldName) => (
              <div key={fieldName} className="form-group">
                <label>{fieldName}</label>
                <input
                  type="text"
                  value={testData[fieldName] || ''}
                  onChange={(e) => handleFieldChange(fieldName, e.target.value)}
                  placeholder={`Enter ${fieldName}`}
                />
              </div>
            ))}
          </div>

          <div className="test-actions">
            <button
              className="generate-btn"
              onClick={handleGenerate}
              disabled={isGenerating}
            >
              {isGenerating ? '⏳ Generating...' : '🎨 Generate Preview'}
            </button>
            {pdfPreviewUrl && (
              <button
                className="download-btn"
                onClick={handleDownload}
              >
                📥 Download PDF
              </button>
            )}
          </div>
        </div>

        <div className="test-preview">
          {pdfPreviewUrl ? (
            <div className="pdf-preview-container">
              <div className="preview-header">
                <h4>📄 PDF Preview</h4>
              </div>
              <iframe
                src={pdfPreviewUrl}
                className="pdf-preview-frame"
                title="PDF Preview"
              />
            </div>
          ) : (
            <div className="no-preview">
              <div className="no-preview-content">
                <span className="preview-icon">📄</span>
                <h3>No Preview Yet</h3>
                <p>Fill in the fields and click "Generate Preview" to see your PDF</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TestGenerator;

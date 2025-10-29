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

  useEffect(() => {
    loadMapping();
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
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = templateName.replace('.pdf', '_filled.pdf');
        link.click();
        URL.revokeObjectURL(url);
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
      <div className="test-header">
        <h3>Test PDF Generation</h3>
        <p>Fill in test data and generate a preview PDF</p>
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
          {isGenerating ? '⏳ Generating...' : '📥 Generate & Download PDF'}
        </button>
      </div>

      <div className="api-example">
        <h4>API Usage Example (for ERPNext/Frappe):</h4>
        <pre>{`fetch('${window.location.origin}/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    template: "${templateName}",
    data: ${JSON.stringify(testData, null, 2)}
  })
})
.then(res => res.blob())
.then(blob => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'output.pdf';
  link.click();
});`}</pre>
      </div>
    </div>
  );
}

export default TestGenerator;

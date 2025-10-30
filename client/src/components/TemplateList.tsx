import { useRef } from 'react';
import './TemplateList.css';

interface Template {
  name: string;
  hasMapping: boolean;
}

interface Props {
  templates: Template[];
  selectedTemplate: string | null;
  onSelect: (name: string) => void;
  onUpload: (file: File) => void;
  onDelete: (name: string) => void;
}

function TemplateList({ templates, selectedTemplate, onSelect, onUpload, onDelete }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      onUpload(file);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } else {
      alert('Please select a PDF file');
    }
  };

  const handleDelete = (e: React.MouseEvent, templateName: string) => {
    e.stopPropagation();
    onDelete(templateName);
  };

  return (
    <div className="template-list">
      <div className="template-list-header">
        <h2>Templates</h2>
        <button
          className="upload-btn"
          onClick={() => fileInputRef.current?.click()}
        >
          + Upload PDF
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>

      <div className="template-items">
        {templates.length === 0 ? (
          <div className="no-templates">
            <p>No templates yet</p>
            <p className="hint">Upload a PDF to get started</p>
          </div>
        ) : (
          templates.map((template) => (
            <div
              key={template.name}
              className={`template-item ${
                selectedTemplate === template.name ? 'selected' : ''
              }`}
              onClick={() => onSelect(template.name)}
            >
              <div className="template-icon">📄</div>
              <div className="template-info">
                <div className="template-name">{template.name}</div>
                <div className="template-status">
                  {template.hasMapping ? (
                    <span className="status-badge mapped">Mapped</span>
                  ) : (
                    <span className="status-badge unmapped">No Mapping</span>
                  )}
                </div>
              </div>
              <button
                className="delete-template-btn"
                onClick={(e) => handleDelete(e, template.name)}
                title="Delete template"
              >
                🗑️
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default TemplateList;

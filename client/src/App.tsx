import { useState, useEffect } from 'react';
import TemplateList from './components/TemplateList';
import PDFMapper from './components/PDFMapper';
import TestGenerator from './components/TestGenerator';
import './App.css';

interface Template {
  name: string;
  hasMapping: boolean;
}

function App() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'mapper' | 'test'>('mapper');

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append('template', file);

    try {
      await fetch('/api/templates/upload', {
        method: 'POST',
        body: formData,
      });
      await loadTemplates();
      alert('Template uploaded successfully!');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload template');
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>📄 PDF Generator Admin</h1>
        <p>Create and manage PDF template mappings for ERPNext/Frappe</p>
      </header>

      <div className="container">
        <div className="sidebar">
          <TemplateList
            templates={templates}
            selectedTemplate={selectedTemplate}
            onSelect={setSelectedTemplate}
            onUpload={handleUpload}
          />
        </div>

        <div className="main-content">
          {selectedTemplate ? (
            <>
              <div className="tabs">
                <button
                  className={`tab ${activeTab === 'mapper' ? 'active' : ''}`}
                  onClick={() => setActiveTab('mapper')}
                >
                  Field Mapper
                </button>
                <button
                  className={`tab ${activeTab === 'test' ? 'active' : ''}`}
                  onClick={() => setActiveTab('test')}
                >
                  Test Generator
                </button>
              </div>

              {activeTab === 'mapper' ? (
                <PDFMapper
                  templateName={selectedTemplate}
                  onMappingSaved={() => loadTemplates()}
                />
              ) : (
                <TestGenerator templateName={selectedTemplate} />
              )}
            </>
          ) : (
            <div className="empty-state">
              <h2>👈 Select a template to get started</h2>
              <p>Upload a PDF template or select an existing one from the sidebar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

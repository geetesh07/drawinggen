import { useState, useEffect } from 'react';
import TemplateList from './components/TemplateList';
import PDFMapper from './components/PDFMapper';
import TestGenerator from './components/TestGenerator';
import DrawingManager from './components/DrawingManager';
import './App.css';

interface Template {
  name: string;
  hasMapping: boolean;
}

function App() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'mapper' | 'drawings' | 'test'>('mapper');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mainView, setMainView] = useState<'templates' | 'drawings'>('templates');

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

  const handleDelete = async (templateName: string) => {
    if (!confirm(`Delete template "${templateName}"? This cannot be undone.`)) {
      return;
    }

    try {
      await fetch(`/api/templates/${templateName}`, {
        method: 'DELETE',
      });
      
      if (selectedTemplate === templateName) {
        setSelectedTemplate(null);
      }
      
      await loadTemplates();
      alert('Template deleted successfully!');
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete template');
    }
  };

  return (
    <div className="app">
      <header className="header">
        <div className="header-left">
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? '☰ Show' : '✕ Hide'} {mainView === 'templates' ? 'Templates' : 'Sidebar'}
          </button>
          <div>
            <h1>📄 PDF Generator Admin</h1>
          </div>
        </div>
        <div className="main-view-tabs">
          <button
            className={`main-view-tab ${mainView === 'templates' ? 'active' : ''}`}
            onClick={() => setMainView('templates')}
          >
            Templates
          </button>
          <button
            className={`main-view-tab ${mainView === 'drawings' ? 'active' : ''}`}
            onClick={() => setMainView('drawings')}
          >
            Drawings
          </button>
        </div>
      </header>

      <div className="container">
        <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <TemplateList
            templates={templates}
            selectedTemplate={selectedTemplate}
            onSelect={setSelectedTemplate}
            onUpload={handleUpload}
            onDelete={handleDelete}
          />
        </div>

        <div className="main-content">
          {mainView === 'templates' ? (
            selectedTemplate ? (
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
            )
          ) : (
            <DrawingManager />
          )}
        </div>
      </div>
    </div>
  );
}

export default App;

import { useState, useEffect } from 'react';
import VisualPlacementEditor from './VisualPlacementEditor';
import './CombinationsManager.css';

interface Combination {
  name: string;
  templateName: string;
  drawingPlacements: DrawingPlacement[];
}

interface DrawingPlacement {
  drawingName: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CombinationInfo {
  name: string;
}

interface TemplateInfo {
  name: string;
  hasMapping: boolean;
}

interface DrawingInfo {
  name: string;
  type: string;
  hasMapping: boolean;
}

interface FieldMapping {
  x: number;
  y: number;
  size: number;
}

interface TemplateMapping {
  [fieldName: string]: FieldMapping;
}

function CombinationsManager() {
  const [combinations, setCombinations] = useState<CombinationInfo[]>([]);
  const [selectedCombination, setSelectedCombination] = useState<string | null>(null);
  const [currentCombination, setCurrentCombination] = useState<Combination | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newCombinationName, setNewCombinationName] = useState('');
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [drawings, setDrawings] = useState<DrawingInfo[]>([]);
  const [viewMode, setViewMode] = useState<'edit' | 'test'>('edit');
  const [templateData, setTemplateData] = useState<{ [key: string]: string }>({});
  const [drawingsData, setDrawingsData] = useState<{ [drawingName: string]: { [key: string]: string } }>({});
  const [templateMapping, setTemplateMapping] = useState<TemplateMapping>({});
  const [drawingsMappings, setDrawingsMappings] = useState<{ [drawingName: string]: TemplateMapping }>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);

  const loadCombinations = async () => {
    try {
      const response = await fetch('/api/combinations');
      const data = await response.json();
      setCombinations(data);
    } catch (error) {
      console.error('Failed to load combinations:', error);
    }
  };

  const loadTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  const loadDrawings = async () => {
    try {
      const response = await fetch('/api/drawings');
      const data = await response.json();
      setDrawings(data);
    } catch (error) {
      console.error('Failed to load drawings:', error);
    }
  };

  useEffect(() => {
    loadCombinations();
    loadTemplates();
    loadDrawings();
  }, []);

  const handleSelectCombination = async (name: string) => {
    setSelectedCombination(name);
    setIsCreating(false);
    setViewMode('edit');
    setPdfPreviewUrl(null);
    
    try {
      const response = await fetch(`/api/combinations/${name}`);
      const data = await response.json();
      setCurrentCombination(data);
      await loadMappingsForCombination(data);
    } catch (error) {
      console.error('Failed to load combination:', error);
    }
  };

  const loadMappingsForCombination = async (combination: Combination) => {
    try {
      const templateResp = await fetch(`/api/mappings/${combination.templateName}`);
      if (templateResp.ok) {
        const tMapping = await templateResp.json();
        setTemplateMapping(tMapping);
        
        const initialTemplateData: { [key: string]: string } = {};
        Object.keys(tMapping).forEach((field) => {
          initialTemplateData[field] = '';
        });
        setTemplateData(initialTemplateData);
      }

      const drawingMappingsTemp: { [drawingName: string]: TemplateMapping } = {};
      const initialDrawingsData: { [drawingName: string]: { [key: string]: string } } = {};

      for (const placement of combination.drawingPlacements) {
        const drawingResp = await fetch(`/api/drawing-mappings/${placement.drawingName}`);
        if (drawingResp.ok) {
          const dMapping = await drawingResp.json();
          drawingMappingsTemp[placement.drawingName] = dMapping;
          
          const initialDrawingData: { [key: string]: string } = {};
          Object.keys(dMapping).forEach((field) => {
            initialDrawingData[field] = '';
          });
          initialDrawingsData[placement.drawingName] = initialDrawingData;
        } else {
          initialDrawingsData[placement.drawingName] = {};
        }
      }

      setDrawingsMappings(drawingMappingsTemp);
      setDrawingsData(initialDrawingsData);
    } catch (error) {
      console.error('Failed to load mappings:', error);
    }
  };

  const handleGenerate = async () => {
    if (!selectedCombination) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/generate-combination', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          combination: selectedCombination,
          templateData: templateData,
          drawingsData: drawingsData,
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
      link.download = `${selectedCombination}_generated.pdf`;
      link.click();
    }
  };

  const handleCreateNew = () => {
    setIsCreating(true);
    setSelectedCombination(null);
    setCurrentCombination({
      name: '',
      templateName: templates.length > 0 ? templates[0].name : '',
      drawingPlacements: []
    });
    setNewCombinationName('');
  };

  const handleSave = async () => {
    if (!currentCombination) return;
    
    const name = isCreating ? newCombinationName : currentCombination.name;
    
    if (!name) {
      alert('Please enter a combination name');
      return;
    }

    if (!currentCombination.templateName) {
      alert('Please select a template');
      return;
    }

    const combinationToSave = {
      ...currentCombination,
      name
    };

    try {
      await fetch(`/api/combinations/${name}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(combinationToSave),
      });

      alert('Combination saved successfully!');
      await loadCombinations();
      setIsCreating(false);
      setSelectedCombination(name);
      setCurrentCombination(combinationToSave);
      await loadMappingsForCombination(combinationToSave);
    } catch (error) {
      console.error('Save failed:', error);
      alert('Failed to save combination');
    }
  };

  const handleDelete = async () => {
    if (!selectedCombination) return;
    
    if (!confirm(`Delete combination "${selectedCombination}"? This cannot be undone.`)) {
      return;
    }

    try {
      await fetch(`/api/combinations/${selectedCombination}`, {
        method: 'DELETE',
      });

      alert('Combination deleted successfully!');
      setSelectedCombination(null);
      setCurrentCombination(null);
      await loadCombinations();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete combination');
    }
  };

  return (
    <div className="combinations-manager">
      <div className="combinations-sidebar">
        <h2>Combinations</h2>
        <p className="combinations-subtitle">Connect templates with drawings</p>
        
        <button
          className="create-combination-btn"
          onClick={handleCreateNew}
        >
          + New Combination
        </button>

        <div className="combinations-list">
          {combinations.length === 0 ? (
            <div className="no-combinations">
              <p>No combinations yet</p>
              <p className="hint">Create one to get started</p>
            </div>
          ) : (
            combinations.map((combo) => (
              <div
                key={combo.name}
                className={`combination-item ${selectedCombination === combo.name ? 'selected' : ''}`}
                onClick={() => handleSelectCombination(combo.name)}
              >
                <div className="combination-icon">🔗</div>
                <div className="combination-name">{combo.name}</div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="combinations-editor">
        {!currentCombination && !isCreating ? (
          <div className="no-selection">
            <h2>👈 Select a combination to get started</h2>
            <p>or create a new one</p>
          </div>
        ) : (
          <div className="editor-content">
            <div className="editor-header">
              <h2>{isCreating ? 'New Combination' : currentCombination?.name}</h2>
              <div className="editor-actions">
                {!isCreating && (
                  <div className="view-mode-tabs">
                    <button
                      className={`mode-tab ${viewMode === 'edit' ? 'active' : ''}`}
                      onClick={() => setViewMode('edit')}
                    >
                      ⚙️ Edit
                    </button>
                    <button
                      className={`mode-tab ${viewMode === 'test' ? 'active' : ''}`}
                      onClick={() => {
                        setViewMode('test');
                        if (currentCombination) {
                          loadMappingsForCombination(currentCombination);
                        }
                      }}
                    >
                      🧪 Test & Preview
                    </button>
                  </div>
                )}
                <button className="save-btn" onClick={handleSave}>
                  💾 Save
                </button>
                {!isCreating && (
                  <button className="delete-btn" onClick={handleDelete}>
                    🗑️ Delete
                  </button>
                )}
              </div>
            </div>

            {viewMode === 'edit' ? (
              <>
                {isCreating && (
                  <div className="form-group">
                    <label>Combination Name:</label>
                    <input
                      type="text"
                      value={newCombinationName}
                      onChange={(e) => setNewCombinationName(e.target.value)}
                      placeholder="e.g., Customer Drawing Package"
                      className="combination-name-input"
                    />
                  </div>
                )}

                <div className="form-group">
              <label>Template:</label>
              <select
                value={currentCombination?.templateName || ''}
                onChange={(e) => setCurrentCombination({
                  ...currentCombination!,
                  templateName: e.target.value
                })}
                className="template-select"
              >
                {templates.map((template) => (
                  <option key={template.name} value={template.name}>
                    {template.name} {template.hasMapping ? '✓' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group visual-placement-container">
              <label>Visual Drawing Placement:</label>
              {currentCombination?.templateName ? (
                <VisualPlacementEditor
                  templateName={currentCombination.templateName}
                  placements={currentCombination.drawingPlacements}
                  onPlacementsChange={(newPlacements) => {
                    setCurrentCombination({
                      ...currentCombination,
                      drawingPlacements: newPlacements
                    });
                  }}
                  drawings={drawings.map(d => d.name)}
                />
              ) : (
                <div className="no-placements">
                  <p>Please select a template first</p>
                </div>
              )}
            </div>
              </>
            ) : (
              <div className="test-layout">
                <div className="test-sidebar">
                  <div className="test-header">
                    <h3>Test Combination</h3>
                    <p>Fill in data for template and drawings</p>
                  </div>

                  <div className="test-form">
                    {Object.keys(templateMapping).length > 0 && (
                      <div className="test-section">
                        <h4>Template Fields ({currentCombination?.templateName})</h4>
                        {Object.keys(templateMapping).map((fieldName) => (
                          <div key={fieldName} className="form-group">
                            <label>{fieldName}</label>
                            <input
                              type="text"
                              value={templateData[fieldName] || ''}
                              onChange={(e) => setTemplateData({ ...templateData, [fieldName]: e.target.value })}
                              placeholder={`Enter ${fieldName}`}
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {currentCombination?.drawingPlacements.map((placement) => {
                      const drawingMapping = drawingsMappings[placement.drawingName];
                      if (!drawingMapping || Object.keys(drawingMapping).length === 0) {
                        return null;
                      }

                      return (
                        <div key={placement.drawingName} className="test-section">
                          <h4>Drawing: {placement.drawingName}</h4>
                          {Object.keys(drawingMapping).map((fieldName) => (
                            <div key={fieldName} className="form-group">
                              <label>{fieldName}</label>
                              <input
                                type="text"
                                value={drawingsData[placement.drawingName]?.[fieldName] || ''}
                                onChange={(e) => {
                                  const newDrawingsData = { ...drawingsData };
                                  if (!newDrawingsData[placement.drawingName]) {
                                    newDrawingsData[placement.drawingName] = {};
                                  }
                                  newDrawingsData[placement.drawingName][fieldName] = e.target.value;
                                  setDrawingsData(newDrawingsData);
                                }}
                                placeholder={`Enter ${fieldName}`}
                              />
                            </div>
                          ))}
                        </div>
                      );
                    })}
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
                        <p>Template with drawings at specified positions</p>
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
                        <p>Fill in the fields and click "Generate Preview" to see your combined PDF with template and drawings</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default CombinationsManager;

import { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import './PDFRotator.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

interface Props {
  pdfName: string;
  pdfType: 'template' | 'drawing';
  onRotate: (rotation: number) => void;
  onClose: () => void;
}

function PDFRotator({ pdfName, pdfType, onRotate, onClose }: Props) {
  const [rotation, setRotation] = useState(0);
  const [isRotating, setIsRotating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadPDF();
  }, [pdfName, rotation]);

  const loadPDF = async () => {
    if (!canvasRef.current) return;

    try {
      const endpoint = pdfType === 'template' ? 'templates' : 'drawings';
      const pdf = await pdfjsLib.getDocument(`/api/${endpoint}/${pdfName}`).promise;
      const page = await pdf.getPage(1);
      
      const scale = 0.8;
      const viewport = page.getViewport({ scale, rotation });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) return;

      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({
        canvasContext: context,
        viewport: viewport,
      }).promise;
    } catch (error) {
      console.error('Failed to load PDF:', error);
    }
  };

  const handleRotate = async () => {
    if (rotation === 0) {
      onClose();
      return;
    }

    setIsRotating(true);
    try {
      const endpoint = pdfType === 'template' ? 'templates' : 'drawings';
      const response = await fetch(`/api/${endpoint}/${pdfName}/rotate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rotation })
      });

      if (!response.ok) {
        throw new Error('Failed to rotate PDF');
      }

      onRotate(rotation);
      onClose();
    } catch (error) {
      console.error('Rotation error:', error);
      alert('Failed to rotate PDF. Please try again.');
    } finally {
      setIsRotating(false);
    }
  };

  return (
    <div className="pdf-rotator-overlay">
      <div className="pdf-rotator-modal">
        <div className="pdf-rotator-header">
          <h3>Rotate PDF</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <div className="pdf-rotator-content">
          <div className="pdf-preview">
            <canvas ref={canvasRef} />
          </div>

          <div className="rotation-controls">
            <h4>Current Rotation: {rotation}°</h4>
            
            <div className="rotation-info">
              <p>Select rotation angle for vertical/horizontal adjustment:</p>
            </div>
            
            <div className="rotation-options">
              <div className="rotation-buttons">
                <button
                  onClick={() => setRotation(90)}
                  className={`rotate-btn ${rotation === 0 ? 'active' : ''}`}
                >
                  ↶ 90°<br/><small>Left</small>
                </button>
                <button
                  onClick={() => setRotation(180)}
                  className={`rotate-btn ${rotation === 0 ? 'active' : ''}`}
                >
                  ↕ 180°<br/><small>Flip</small>
                </button>
                <button
                  onClick={() => setRotation(270)}
                  className={`rotate-btn ${rotation === 0 ? 'active' : ''}`}
                >
                  ↷ 270°<br/><small>Right</small>
                </button>
              </div>
            </div>

            <button
              onClick={() => setRotation(0)}
              className="reset-btn"
              disabled={rotation === 0}
            >
              ⟲ Reset to 0°
            </button>

            <div className="rotation-note">
              <p><strong>Note:</strong> This will permanently rotate the PDF file. PDFs only support 90° increments.</p>
            </div>
          </div>
        </div>

        <div className="pdf-rotator-actions">
          <button onClick={onClose} className="cancel-btn">
            Cancel
          </button>
          <button
            onClick={handleRotate}
            className="apply-btn"
            disabled={isRotating}
          >
            {isRotating ? 'Rotating...' : rotation === 0 ? 'Skip (No Rotation)' : `Apply ${rotation}° Rotation`}
          </button>
        </div>
      </div>
    </div>
  );
}

export default PDFRotator;

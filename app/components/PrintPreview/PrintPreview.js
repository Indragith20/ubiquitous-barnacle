import React, { useState } from 'react';
import { useTheme } from '~/contexts/themeContext';
import Modal from '../Modal/Modal';
import { getBufferedCoords } from '../utils/drawShapes';
import { printCanvas } from '../utils/redrawCanvas';
import styles from './PrintPreview.css';

export const PrintPreviewLinks = () => (
  [
    { rel: 'stylesheet', href: styles }
  ]
)

function PrintPreview({ shapes, showPreview, onCancel, baseLineHeight, baseFontSize, scalingFactor }) {

  let [src, setsrc] = useState(null);
  const { theme: selectedTheme } = useTheme();

  function onClose() {
    setsrc(null);
    onCancel();
  }

  if (showPreview && src === null) {
    let { bufferX, bufferY, canvasHeight, canvasWidth } = getBufferedCoords(shapes);
    let canvas = document.createElement('canvas');
    canvas.id = 'drawTempCanvas';
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    let tempContext = canvas.getContext('2d');



    printCanvas({ shapes, tempContext, bufferX, bufferY, baseLineHeight, baseFontSize, selectedTheme, scalingFactor, canvasHeight, canvasWidth })

    let dataURL = canvas.toDataURL('image/png', 1.0);
    setsrc(dataURL);
  }


  return (
    <Modal show={showPreview}>
      <Modal.Header needCloseIcon={true} close={onClose}>
        <div className="modal-header-title"> {'Download As Image'} </div>
      </Modal.Header>
      <Modal.Content>
        <div id='print-preview'>
          {src ? (
            <img src={src} alt="To be Downloaded" />
          ) : null}
        </div>
      </Modal.Content>
      <Modal.Footer>
        <div className='footer'>
          <button className="cancel-btn" onClick={onClose}>
            Cancel
          </button>

          <a href={src} className="download-btn" download>
            Download
          </a>
        </div>

      </Modal.Footer>

    </Modal>
  )
}


export default React.memo(PrintPreview);
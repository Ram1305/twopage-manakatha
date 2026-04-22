import React, { useEffect, useMemo, useRef } from 'react';
import SignatureCanvas from 'react-signature-canvas';

function exportPadToJpegDataUrl(pad, quality = 0.7) {
  const sourceCanvas = pad.getCanvas();
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = sourceCanvas.width;
  exportCanvas.height = sourceCanvas.height;
  const ctx = exportCanvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  ctx.drawImage(sourceCanvas, 0, 0);
  return exportCanvas.toDataURL('image/jpeg', quality);
}

const SignatureDialog = ({
  open,
  title,
  existingDataUrl,
  disabled = false,
  onClose,
  onSave,
  saving = false,
}) => {
  const padRef = useRef(null);

  const canInteract = open && !disabled && !saving;

  const padSize = useMemo(() => {
    // Keep it large enough for mobile; the canvas scales via CSS.
    return { width: 900, height: 300 };
  }, []);

  useEffect(() => {
    if (!open) return;
    const pad = padRef.current;
    if (!pad) return;

    pad.clear();
    if (existingDataUrl) {
      try {
        pad.fromDataURL(existingDataUrl);
      } catch {
        // ignore invalid data URL
      }
    }
  }, [open, existingDataUrl]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="sig-modal no-print" role="dialog" aria-modal="true" aria-label={title || 'Signature'}>
      <button
        className="sig-modalBackdrop"
        aria-label="Close signature dialog"
        onClick={() => onClose?.()}
        type="button"
      />

      <div className="sig-modalPanel">
        <div className="sig-modalHeader">
          <div className="sig-modalTitle">{title || 'Signature'}</div>
          <button className="sig-modalClose" onClick={() => onClose?.()} type="button">
            ✕
          </button>
        </div>

        <div className="sig-modalBody">
          <div className="sig-padWrap" aria-disabled={(!canInteract).toString()}>
            <SignatureCanvas
              ref={padRef}
              penColor="black"
              canvasProps={{
                className: 'sig-padCanvas',
                width: padSize.width,
                height: padSize.height,
              }}
            />
          </div>
          <div className="sig-modalHint">Draw your signature inside the box.</div>
        </div>

        <div className="sig-modalActions">
          <button
            className="btn btn-secondary"
            onClick={() => padRef.current?.clear()}
            type="button"
            disabled={!canInteract}
          >
            Clear
          </button>
          <div style={{ flex: 1 }} />
          <button className="btn btn-secondary" onClick={() => onClose?.()} type="button" disabled={saving}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              const pad = padRef.current;
              if (!pad) return;
              if (pad.isEmpty()) {
                alert('Please sign before saving.');
                return;
              }
              const dataUrl = exportPadToJpegDataUrl(pad, 0.7);
              onSave?.(dataUrl);
            }}
            type="button"
            disabled={!canInteract}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignatureDialog;


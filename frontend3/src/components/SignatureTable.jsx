import React, { useEffect, useMemo, useRef, useState } from 'react';

function showSaveToast(message) {
  let toast = document.getElementById('saveToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'saveToast';
    toast.style.cssText = [
      'position:fixed',
      'bottom:24px',
      'right:24px',
      'background:#1a1a6e',
      'color:#fff',
      'font-family:Times New Roman,serif',
      'font-size:11pt',
      'padding:10px 22px',
      'border-radius:6px',
      'box-shadow:0 4px 16px rgba(0,0,0,0.25)',
      'z-index:9999',
      'opacity:0',
      'transition:opacity 0.3s',
    ].join(';');
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.opacity = '1';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    toast.style.opacity = '0';
  }, 2000);
}

function isCanvasEmpty(cv) {
  const ctx = cv.getContext('2d');
  const pixelData = ctx.getImageData(0, 0, cv.width, cv.height).data;
  for (let i = 0; i < pixelData.length; i += 4) {
    if (pixelData[i + 3] > 0) return false;
  }
  return true;
}

const SignatureTable = ({ shareholders, signatures, onSaveSignature, isSubmitted, savingStates = {} }) => {
  const [activeIdx, setActiveIdx] = useState(null);
  const canvasRef = useRef(null);
  const lastPointRef = useRef({ x: 0, y: 0 });
  const drawingRef = useRef(false);

  const activeKey = useMemo(() => (activeIdx === null ? null : String(activeIdx)), [activeIdx]);
  const activeName = useMemo(() => (activeIdx === null ? '' : shareholders?.[activeIdx] || ''), [activeIdx, shareholders]);

  useEffect(() => {
    if (isSubmitted) setActiveIdx(null);
  }, [isSubmitted]);

  useEffect(() => {
    if (activeIdx === null) return;
    const cv = canvasRef.current;
    if (!cv) return;

    // Fit canvas to available width (keeps signature crisp)
    const desiredWidth = Math.max(320, Math.min(900, cv.parentElement?.clientWidth || 560));
    cv.width = desiredWidth;
    cv.height = 90;

    const ctx = cv.getContext('2d');
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.clearRect(0, 0, cv.width, cv.height);

    const existing = activeKey ? signatures?.[activeKey] : '';
    if (existing) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, cv.width, cv.height);
        ctx.drawImage(img, 0, 0, cv.width, cv.height);
      };
      img.src = existing;
    }
  }, [activeIdx, activeKey, signatures]);

  const openPad = (index) => {
    if (isSubmitted) return;
    const key = String(index);
    if (savingStates?.[key]) return;
    setActiveIdx((prev) => (prev === index ? null : index));
  };

  const onPointerDown = (e) => {
    const cv = canvasRef.current;
    if (!cv) return;
    drawingRef.current = true;
    const r = cv.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    lastPointRef.current = { x, y };
    cv.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!drawingRef.current) return;
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const r = cv.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const { x: lx, y: ly } = lastPointRef.current;
    ctx.beginPath();
    ctx.moveTo(lx, ly);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastPointRef.current = { x, y };
  };

  const onPointerUp = (e) => {
    drawingRef.current = false;
    const cv = canvasRef.current;
    if (!cv) return;
    cv.releasePointerCapture?.(e.pointerId);
  };

  const clearPad = () => {
    const cv = canvasRef.current;
    if (!cv) return;
    cv.getContext('2d').clearRect(0, 0, cv.width, cv.height);
  };

  const savePad = async () => {
    if (activeIdx === null) return;
    const cv = canvasRef.current;
    if (!cv) return;

    if (isCanvasEmpty(cv)) {
      await onSaveSignature?.(activeIdx, '');
      showSaveToast('🗑️ Signature cleared');
    } else {
      const dataUrl = cv.toDataURL('image/png');
      await onSaveSignature?.(activeIdx, dataUrl);
      showSaveToast('✅ Signature saved!');
    }
    setActiveIdx(null);
  };

  return (
    <div className="sig-block">
      <div className="table-responsive sig-tableView">
        <table className="sig-tbl" id="sigTable">
          <thead>
            <tr>
              <th style={{ width: '50px' }}>No</th>
              <th>Shareholder Name</th>
              <th style={{ width: '350px' }}>Signature</th>
            </tr>
          </thead>
          <tbody>
            {shareholders.map((name, index) => {
              const key = String(index);
              const hasSig = !!signatures?.[key];
              const isSaving = !!savingStates?.[key];
              const isActive = activeIdx === index;
              const canEdit = !isSubmitted && !isSaving;

              return (
                <React.Fragment key={key}>
                  <tr id={`row${index}`}>
                    <td style={{ textAlign: 'center' }}>{index + 1}</td>
                    <td style={{ verticalAlign: 'middle' }}>{name}</td>
                    <td>
                      <div
                        className={['sig-cell', hasSig ? 'signed' : '', isSubmitted ? 'submitted' : '']
                          .filter(Boolean)
                          .join(' ')}
                        role={canEdit ? 'button' : undefined}
                        tabIndex={canEdit ? 0 : undefined}
                        aria-disabled={(!canEdit).toString()}
                        onClick={() => {
                          if (!canEdit) return;
                          openPad(index);
                        }}
                        onKeyDown={(e) => {
                          if (!canEdit) return;
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            openPad(index);
                          }
                        }}
                        title={canEdit ? (hasSig ? 'Click to edit signature' : 'Click to sign') : undefined}
                      >
                        {hasSig ? (
                          <img src={signatures[key]} alt={`Signature of ${name}`} className="sig-image" />
                        ) : (
                          <span className="sig-placeholder">{isSubmitted ? '' : isSaving ? 'Saving…' : 'Click to sign'}</span>
                        )}
                        {!isSubmitted && <span className="sig-edit-hint">{hasSig ? '✏️ edit' : '✏️'}</span>}
                      </div>
                    </td>
                  </tr>

                  <tr className="sig-pad-row" id={`pad${index}`} style={{ display: isActive ? 'table-row' : 'none' }}>
                    <td colSpan={3}>
                      <div className="sig-pad-wrap">
                        <span className="sig-pad-label">
                          ✍️ Sign below — <strong>{activeName || name}</strong>
                        </span>
                        <canvas
                          className="sig-pad-canvas"
                          ref={isActive ? canvasRef : null}
                          width={560}
                          height={90}
                          onPointerDown={onPointerDown}
                          onPointerMove={onPointerMove}
                          onPointerUp={onPointerUp}
                          onPointerCancel={onPointerUp}
                          onPointerLeave={onPointerUp}
                        />
                        <div className="sig-pad-btns">
                          <button type="button" className="sp-btn clr" onClick={clearPad}>
                            Clear
                          </button>
                          <button type="button" className="sp-btn save" onClick={savePad} disabled={isSaving}>
                            {isSaving ? 'Saving…' : 'Save Signature'}
                          </button>
                          <button type="button" className="sp-btn" onClick={() => setActiveIdx(null)}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SignatureTable;


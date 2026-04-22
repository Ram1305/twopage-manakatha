import React, { useState, useEffect, useCallback } from 'react';
import { ResolutionPage } from './components/ResolutionContent';
import SignatureTable from './components/SignatureTable';

const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  'https://mankatha.octosofttechnologies.in';

function apiUrl(path) {
  const base = String(API_BASE_URL || '').replace(/\/+$/, '');
  const p = String(path || '').startsWith('/') ? String(path) : `/${path}`;
  return `${base}${p}`;
}

const App = () => {
  const [shareholders] = useState([
    "N. Thiruchelvam", "T. Gnanaraj", "T.Palanivel", "S. Lavatheepan",
    "P. Gopalakrishnan", "S. Balenthiran", "S. Balarajan", "A.Navajeevan",
    "S. Srirenganathan", "T. Krishnarajh", "T. Kumararasan", "S. Manimaran"
  ]);

  const [signatures, setSignatures] = useState({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submissionDate, setSubmissionDate] = useState('');
  const [lastSyncError, setLastSyncError] = useState('');
  const [isBlocked] = useState(() => (typeof window !== 'undefined' ? window.location.protocol === 'file:' : false));

  // Track per-row saving state
  const [sigSavingStates, setSigSavingStates] = useState({});

  const fetchLatestSignatures = useCallback(async () => {
    if (isBlocked) return;

    try {
      const response = await fetch(apiUrl('/api/signatures/latest'));
      const result = await response.json();
      if (result.success && result.data) {
        if (result.data.signatures) {
          // Normalize to a plain object with string keys.
          const next = {};
          for (const [k, v] of Object.entries(result.data.signatures || {})) {
            if (v) next[String(k)] = v;
          }
          setSignatures(next);
        }
        if (result.data.submitted) {
          setIsSubmitted(true);
          setSubmissionDate(result.data.date);
        }
      }
    } catch (err) {
      console.warn("Could not load existing signatures:", err);
      setLastSyncError('Could not load signatures from server. Please ensure the backend is running.');
    }
  }, [isBlocked]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      fetchLatestSignatures();
    }, 0);
    return () => window.clearTimeout(id);
  }, [fetchLatestSignatures]);

  useEffect(() => {
    // No-op placeholder: kept to preserve behaviour if we add modal UI later.
  }, [signatures, isSubmitted]);

  const saveSignatureForIndex = async (index, dataUrl) => {
    if (isBlocked || isSubmitted) return;
    const key = String(index);
    setSigSavingStates((prev) => ({ ...prev, [key]: true }));

    try {
      const response = await fetch(apiUrl('/api/save-signature'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ index: key, signature: dataUrl }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to save signature');
      }

      await fetchLatestSignatures();
    } catch (err) {
      console.error(err);
      alert('Error saving signature: ' + err.message);
    } finally {
      setSigSavingStates((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleReset = async () => {
    if (!window.confirm("This will permanently clear ALL signatures and reset the submission status. Continue?")) return;
    try {
      const response = await fetch(apiUrl('/api/signatures/reset'), { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Reset failed');
      }

      // Clear local state
      setIsSubmitted(false);
      setSignatures({});
      setSubmissionDate('');

      alert("Document reset successfully! The page will now reload.");
      window.location.reload();
    } catch (err) {
      alert("Error resetting document: " + (err?.message || String(err)));
    }
  };

  const handleSubmit = async () => {
    if (isSubmitted || isBlocked) return;

    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
      + ' ' + now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    const payload = {
      date: dateStr,
      signatures: signatures,
      shareholderData: shareholders.map((name, i) => ({
        id: i + 1,
        name: name,
        signed: !!signatures[String(i)]
      })),
      timestamp: new Date().toISOString()
    };

    try {
      const response = await fetch(apiUrl('/api/signatures'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to submit resolution');
      }

      setIsSubmitted(true);
      setSubmissionDate(dateStr);

      setTimeout(() => {
        document.getElementById('mainPage')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    } catch (error) {
      console.error("Error saving signatures:", error);
      alert("Failed to submit resolution. Please check your connection and try again.");
    }
  };

  return (
    <div className="document-container">
      <ResolutionPage>
        {isBlocked && (
          <div
            className="no-print"
            style={{
              margin: '12px 0 18px',
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid #ffd0d0',
              background: '#fff0f0',
              color: '#7a0000',
              fontSize: '10.5pt',
            }}
          >
            <strong>Opened as a local file (file://).</strong> Saving is disabled. Please start the backend and open this app via
            {' '}
            <code>{typeof window !== 'undefined' ? `http://${window.location.hostname}:5173/` : 'http://127.0.0.1:5173/'}</code>
            {' '}
            (Vite dev server; API is configured to use <code>{API_BASE_URL}</code>).
          </div>
        )}
        {!!lastSyncError && !isBlocked && (
          <div
            className="no-print"
            style={{
              margin: '12px 0 18px',
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid #ffd0d0',
              background: '#fff0f0',
              color: '#7a0000',
              fontSize: '10.5pt',
            }}
          >
            <strong>Warning:</strong> {lastSyncError}
          </div>
        )}
        <SignatureTable
          shareholders={shareholders}
          signatures={signatures}
          onSaveSignature={saveSignatureForIndex}
          isSubmitted={isSubmitted}
          savingStates={sigSavingStates}
        />

        {!isSubmitted ? (
          <div className="submit-area no-print" style={{ marginTop: '24px', textAlign: 'center' }}>
            <button className="btn btn-primary" style={{ padding: '12px 40px', fontSize: '13pt' }} onClick={handleSubmit} disabled={isBlocked}>
              SUBMIT RESOLUTION
            </button>
          </div>
        ) : (
          <div className="submitted-banner" style={{ marginTop: '20px', textAlign: 'center' }}>
            <div className="banner-date">{submissionDate}</div>
            <button className="btn btn-primary no-print" onClick={() => window.print()}>
              Print
            </button>
            <div style={{ marginTop: '20px' }} className="no-print">
              <button
                onClick={handleReset}
                style={{
                  background: 'none',
                  border: '1px solid #ccc',
                  color: '#888',
                  fontSize: '9pt',
                  padding: '5px 15px',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Reset Document (Dev Only)
              </button>
            </div>
          </div>
        )}
      </ResolutionPage>
    </div>
  );
};

export default App;


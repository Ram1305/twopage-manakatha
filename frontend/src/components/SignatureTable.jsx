import React from 'react';

const SignatureTable = ({ 
  shareholders, 
  signatures, 
  onOpenSignature,
  isSubmitted,
  savingStates = {}
}) => {
  return (
    <div className="sig-block">
      {/* Table (all screen sizes) */}
      <div className="table-responsive sig-tableView">
        <table className="sig-tbl">
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
              const isSaving = !!savingStates[key];
              const canEdit = !isSubmitted && !isSaving;

              return (
                <tr key={index}>
                  <td style={{ textAlign: 'center' }}>{index + 1}</td>
                  <td style={{ verticalAlign: 'middle' }}>{name}</td>
                  <td>
                    <div
                      className={[
                        'sig-cell',
                        hasSig ? 'signed' : '',
                        isSubmitted ? 'submitted' : '',
                        canEdit ? 'editable' : '',
                      ].filter(Boolean).join(' ')}
                      role={!isSubmitted ? 'button' : undefined}
                      tabIndex={!isSubmitted ? 0 : undefined}
                      aria-disabled={(!canEdit).toString()}
                      onClick={() => {
                        if (!canEdit) return;
                        onOpenSignature?.(index);
                      }}
                      onKeyDown={(e) => {
                        if (!canEdit) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onOpenSignature?.(index);
                        }
                      }}
                      title={!isSubmitted ? (hasSig ? 'Tap to edit signature' : 'Tap to add signature') : undefined}
                    >
                      {hasSig ? (
                        <img src={signatures[key]} alt={`Signature of ${name}`} className="sig-image" />
                      ) : (
                        <span className="sig-placeholder">{isSubmitted ? 'Not signed' : 'Tap to sign'}</span>
                      )}
                      {!isSubmitted && hasSig && <span className="edit-hint no-print">Tap to edit</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SignatureTable;

import React from 'react';
import ResolutionHeader from './ResolutionHeader';

export const ResolutionPage = ({ children }) => (
  <div className="page" id="mainPage">
    <div className="page-border"></div>

    <ResolutionHeader />

    <div className="date-line" style={{ fontWeight: 'bold', marginBottom: '14px', fontSize: '11pt' }}>
      Date: 08.04.2026
    </div>

    <div
      className="res-title"
      style={{
        fontWeight: 'bold',
        fontSize: '12pt',
        textDecoration: 'underline',
        marginBottom: '14px',
      }}
    >
      SHAREHOLDERS RESOLUTION&nbsp;&nbsp;(Director Removal &amp; Appointment)
    </div>

    <div className="intro" style={{ marginBottom: '10px', fontSize: '11pt' }}>
      We, the undersigned shareholders of <strong>Mankatha (Private) Limited</strong>, hereby resolve that:
    </div>

    <div className="sec" style={{ marginBottom: '14px', fontSize: '11pt' }}>
      <div className="sec-head" style={{ fontWeight: 'bold', marginBottom: '4px' }}>
        1.&nbsp;&nbsp;Removal of Director
      </div>
      <div className="sec-body" style={{ marginLeft: '20px', lineHeight: '1.6' }}>
        Mr. Thevarajah Gnanaraj, Mr. Mohanathas Kavichelvan, Mrs. Rasalingam Luxmy, be and is hereby removed from the
        position of Director of the Company with effect from 01.05.2026.
      </div>
    </div>

    <div className="sec" style={{ marginBottom: '14px', fontSize: '11pt' }}>
      <div className="sec-head" style={{ fontWeight: 'bold', marginBottom: '4px' }}>
        2.&nbsp;&nbsp;Appointment of New Director
      </div>
      <div className="sec-body" style={{ marginLeft: '20px', lineHeight: '1.6' }}>
        Mr. Sothilingam Krishnakumar, be and is hereby appointed as a Director of the Company with effect from
        01.05.2026, in accordance with the Articles of Association and the Companies Act No. 07 of 2007.
      </div>
    </div>

    <div className="sec" style={{ marginBottom: '14px', fontSize: '11pt' }}>
      <div style={{ marginBottom: '6px' }}>3.&nbsp;&nbsp;The Company Secretary is hereby authorized to:</div>
      <ul className="bullets">
        <li>Notify the Registrar of Companies</li>
        <li>Update statutory records</li>
        <li>File necessary forms</li>
      </ul>
    </div>

    {children}
  </div>
);


import React from 'react';
import ResolutionHeader from './ResolutionHeader';

export const ResolutionPage1 = ({ children }) => (
  <div className="page" id="page1">
    <div className="page-border"></div>
    <ResolutionHeader />

    <div className="date-line" style={{ fontWeight: 'bold', marginBottom: '14px', fontSize: '11pt' }}>
      Date: 08.04.2026
    </div>

    <div style={{ fontWeight: 'bold', fontSize: '11pt', marginBottom: '14px' }}>ORDINARY RESOLUTION</div>
    <div className="intro" style={{ marginBottom: '10px', fontSize: '11pt' }}>It is hereby resolved that:</div>

    <div className="sec" style={{ marginBottom: '14px', fontSize: '11pt' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>1. Approval of Share Transfer</div>
      <div className="sec-body" style={{ marginLeft: '0', lineHeight: '1.6' }}>
        The Company hereby approves the transfer of shares from the existing shareholders to the following new/existing shareholders as detailed below:
        <ul style={{ listStyleType: 'disc', paddingLeft: '40px', marginTop: '12px', marginBottom: '10px', lineHeight: '1.4' }}>
          <li style={{ marginBottom: '10px' }}><strong>Mr. T. Gnanaraj &rarr; Mr. Balachandran Sivakanesh</strong><br />Number of Shares Transferred: 20</li>
          <li style={{ marginBottom: '10px' }}><strong>Mr. T.Palanivel &rarr; Mr. Paramakurysamy Mohanraj</strong><br />Number of Shares Transferred: 20</li>
          <li style={{ marginBottom: '10px' }}><strong>Mr. S. Lavatheepan &rarr; Mr. Sothilingam Krishnakumar</strong><br />Number of Shares Transferred: 20</li>
          <li style={{ marginBottom: '10px' }}><strong>Mr. T. Gnanaraj &rarr; Mr. Karmegasundaram Vasanthan</strong><br />Number of Shares Transferred: 10</li>
          <li style={{ marginBottom: '10px' }}><strong>Mr. S. Manimaran &rarr; Mr. Karmegasundaram Vasanthan</strong><br />Number of Shares Transferred: 10</li>
        </ul>
      </div>
    </div>

    <hr style={{ border: 'none', borderTop: '1px solid #aaa', margin: '15px 0' }} />

    <div className="sec" style={{ marginBottom: '14px', fontSize: '11pt' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>2. Terms of Transfer</div>
      <div className="sec-body" style={{ marginLeft: '0', lineHeight: '1.6' }}>
        The above shares are transferred at a consideration of LKR price per share 5000.00 / total amount 100000.00, as mutually agreed between the parties.
      </div>
    </div>

    <hr style={{ border: 'none', borderTop: '1px solid #aaa', margin: '15px 0' }} />

    <div className="sec" style={{ marginBottom: '14px', fontSize: '11pt' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>3. Compliance with Articles of Association</div>
      <div className="sec-body" style={{ marginLeft: '0', lineHeight: '1.6' }}>
        The above transfer is confirmed to be in accordance with the provisions of the Company's Articles of Association.
      </div>
    </div>

    <hr style={{ border: 'none', borderTop: '1px solid #aaa', margin: '15px 0' }} />

    <div className="sec" style={{ marginBottom: '14px', fontSize: '11pt' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>4. Update of Share Register</div>
      <div className="sec-body" style={{ marginLeft: '0', lineHeight: '1.6' }}>
        The Directors are hereby authorized to update the Share Register of the Company to reflect the above transfer of shares.
      </div>
    </div>

    {children}

    <div className="footer-bar">1/2</div>
  </div>
);

export const ResolutionPage2 = ({ children }) => (
  <div className="page" id="mainPage">
    <div className="page-border"></div>
    <ResolutionHeader />

    <hr style={{ border: 'none', borderTop: '1px solid #aaa', margin: '15px 0' }} />

    <div className="sec" style={{ marginBottom: '14px', fontSize: '11pt' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>5. Filing with Registrar of Companies</div>
      <div className="sec-body" style={{ marginLeft: '0', lineHeight: '1.6' }}>
        The Company Secretary / Director is authorized to make all necessary filings (if applicable) with the Registrar of Companies of Sri Lanka.
      </div>
    </div>

    <hr style={{ border: 'none', borderTop: '1px solid #aaa', margin: '15px 0' }} />

    <div className="sec" style={{ marginBottom: '14px', fontSize: '11pt' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>6. Issue of Share Certificates</div>
      <div className="sec-body" style={{ marginLeft: '0', lineHeight: '1.6' }}>
        The Company is authorized to issue new Share Certificates to the transferees and cancel the existing certificates held by the transferors, where applicable.
      </div>
    </div>

    <hr style={{ border: 'none', borderTop: '1px solid #aaa', margin: '15px 0' }} />

    <div className="sec" style={{ marginBottom: '14px', fontSize: '11pt' }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>CERTIFICATION</div>
      <div className="sec-body" style={{ marginLeft: '0', lineHeight: '1.6' }}>
        We, the undersigned, being the shareholders of the Company, hereby approve the above resolution:
      </div>
    </div>

    <hr style={{ border: 'none', borderTop: '1px solid #aaa', margin: '15px 0' }} />

    {children}

    <div className="footer-bar">2/2</div>
  </div>
);

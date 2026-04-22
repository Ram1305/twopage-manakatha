import React, { useState } from 'react';

const ResolutionHeader = () => {
  const [logoMissing, setLogoMissing] = useState(false);

  return (
    <div className="header">
      <div className="logo-box">
        {!logoMissing ? (
          <img
            src="/assets/logo.png"
            alt="Mankatha Logo"
            onError={() => setLogoMissing(true)}
          />
        ) : (
          <img src="/assets/logo.svg" alt="Mankatha Logo" />
        )}
      </div>
      <div className="header-center">
        <div className="tamil">மங்காத்தா நிறுவனம்</div>
        <div className="english"><strong>MANKATHA</strong> (PVT) <strong>LTD</strong></div>
      </div>
      <div className="addr">
        No.11 Modern market<br />
        Valvettiturai<br />
        Email: mankathavvt@gmail.com
      </div>
    </div>
  );
};

export default ResolutionHeader;


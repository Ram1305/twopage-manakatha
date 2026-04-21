import React from 'react';
import logo from '../assets/logo.png';

const ResolutionHeader = () => {
  return (
    <div className="header">
      <div className="logo-box">
        <img src={logo} alt="Mankatha Logo" />
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

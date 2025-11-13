export const Triangle = ({ className = "" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    className={className}
  >
    <polygon
      points="12,4 20,20 4,20"
      fill="lightgrey"
      stroke="black"
      strokeWidth="1"
    />
  </svg>
);

export const Pit = ({ className = "" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    className={className}
  >
    <line x1="4" y1="12" x2="20" y2="12" stroke="red" strokeWidth="5" />
    <line x1="12" y1="4" x2="12" y2="20" stroke="red" strokeWidth="5" />
  </svg>
);

export const GP = ({ className = "" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    className={className}
  >
    <circle
      cx="12"
      cy="12"
      r="8"
      fill="#9333EA"
      fillOpacity="0.5"
      stroke="black"
      strokeWidth="1"
    />
    <circle cx="12" cy="12" r="2" fill="black" />
  </svg>
);

export const JunctionPoint = ({ className = "" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    className={className}
  >
    <rect
      x="5"
      y="5"
      width="14"
      height="14"
      fill="red"
      stroke="black"
      strokeWidth="1"
    />
    <circle cx="12" cy="12" r="2" fill="black" />
  </svg>
);

export const Tower = ({ className = "" }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    fill="#000000"
    width="800px"
    height="800px"
    viewBox="0 0 15 15"
    id="communications-tower"
  >
    <path d="M11.8545,6.4336l-.4131-.2813a4.7623,4.7623,0,0,0,.2813-4.8779l-.0835-.1533L12.0747.875l.0908.167a5.2619,5.2619,0,0,1-.311,5.3916Zm1.1521,7.1316V14h-11v-.4348H4.4952L6.0439,6.4a.5.5,0,0,1,.4888-.3945h.7255V4.6014A1.14,1.14,0,0,1,6.3756,3.5a1.1568,1.1568,0,1,1,2.3136,0,1.14,1.14,0,0,1-.931,1.1112V6.0059h.7223A.5.5,0,0,1,8.9692,6.4l1.5478,7.1648ZM8.4543,8.751H6.5588L6.236,10.2441H8.777ZM6.1279,10.7441l-.3233,1.4952H9.2082l-.3231-1.4952ZM6.936,7.0059,6.6669,8.251H8.3463L8.0771,7.0059ZM5.5179,13.5652H9.4948l-.1786-.8259h-3.62ZM5.21,5.0137a2.7523,2.7523,0,0,1,.0161-3.0518L4.812,1.6826a3.25,3.25,0,0,0-.019,3.6065ZM10.7568,3.5a3.2433,3.2433,0,0,0-.5341-1.7861l-.418.2754a2.7517,2.7517,0,0,1-.0176,3.0488l.4141.2793A3.2341,3.2341,0,0,0,10.7568,3.5ZM3.5342,6.1182A4.7637,4.7637,0,0,1,3.3813,1.13L2.9478.88a5.2643,5.2643,0,0,0,.1694,5.5137Z" />
  </svg>
);

import React from 'react';

type SpinnerProps = {
  size?: number;
  color?: string;
};

export const Spinner: React.FC<SpinnerProps> = ({ size = 18, color = 'currentColor' }) => (
  <span
    aria-hidden
    className="ds-spinner"
    style={{
      width: `${size}px`,
      height: `${size}px`,
      color
    }}
  />
);


import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { MemoryRouter } from 'react-router-dom';

import App from './App';

describe('App', () => {
  it('renderiza o título principal', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { name: /prop-stream/i })).toBeInTheDocument();
  });
});

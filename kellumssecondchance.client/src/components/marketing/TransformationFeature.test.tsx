import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { TransformationFeature } from './TransformationFeature';

describe('TransformationFeature', () => {
  it('shows four clearly disclosed exterior examples when no real projects are available', async () => {
    render(
      <MemoryRouter>
        <TransformationFeature projects={[]} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: /see what the outside can become/i })).toBeInTheDocument();
    expect(screen.getByText(/not photographs of completed Kellum’s projects/i)).toBeInTheDocument();

    expect(screen.getByAltText(/heavily weathered roof/i)).toHaveAttribute(
      'src',
      '/media/transformations/roofing-before.png',
    );
    expect(screen.getByAltText(/refreshed dark roof/i)).toHaveAttribute(
      'src',
      '/media/transformations/roofing-after.png',
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(4);
    expect(tabs.map((tab) => tab.textContent)).toEqual([
      '01Roofing',
      '02Siding',
      '03Porches & Railings',
      '04Decks',
    ]);

    await userEvent.click(screen.getByRole('tab', { name: /siding/i }));
    expect(screen.getByRole('heading', { name: 'The Exterior That Lost Its Edge' })).toBeInTheDocument();
    expect(screen.getByAltText(/faded and weathered exterior siding/i)).toHaveAttribute('src', '/media/transformations/siding-before.png');
    expect(screen.getByAltText(/clean, refreshed siding and trim/i)).toHaveAttribute('src', '/media/transformations/siding-after.png');

    await userEvent.click(screen.getByRole('tab', { name: /porches & railings/i }));
    expect(screen.getByAltText(/aged dark railings and supports/i)).toHaveAttribute('src', '/media/transformations/porches-railings-before.png');
    expect(screen.getByAltText(/refreshed white railings and supports/i)).toHaveAttribute('src', '/media/transformations/porches-railings-after.png');

    await userEvent.click(screen.getByRole('tab', { name: /decks/i }));
    expect(screen.getByAltText(/heavily weathered boards and railings/i)).toHaveAttribute('src', '/media/transformations/deck-before.png');
    expect(screen.getByAltText(/refreshed decking and railings/i)).toHaveAttribute('src', '/media/transformations/deck-after.png');
    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '48');
    expect(screen.getByText('Before')).toBeInTheDocument();
    expect(screen.getByText('After')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /full case study/i })).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/kitchen|bathroom|basement|interior renovation/i);
  });
});

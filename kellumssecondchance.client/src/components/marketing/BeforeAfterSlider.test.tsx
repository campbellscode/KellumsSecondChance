import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import type { ImageAsset } from '@/lib/api/types';

const before: ImageAsset = {
  src: '/media/test/before.svg',
  width: 1600,
  height: 1067,
  alt: 'A dated kitchen with worn cabinets.',
};

const after: ImageAsset = {
  src: '/media/test/after.svg',
  width: 1600,
  height: 1067,
  alt: 'The rebuilt kitchen with new cabinetry.',
};

function renderSlider(initial = 50) {
  return render(
    <BeforeAfterSlider before={before} after={after} label="Kitchen transformation" initial={initial} />,
  );
}

describe('BeforeAfterSlider', () => {
  it('exposes a real ARIA slider rather than a bare div', () => {
    renderSlider();

    const slider = screen.getByRole('slider');
    expect(slider).toHaveAttribute('aria-valuemin', '0');
    expect(slider).toHaveAttribute('aria-valuemax', '100');
    expect(slider).toHaveAttribute('aria-valuenow', '50');
  });

  it('gives both images independent alt text so the comparison works without the control', () => {
    renderSlider();

    // A screen-reader user must get the full before/after story from alt text
    // alone, without ever operating the slider.
    expect(screen.getByAltText(before.alt)).toBeInTheDocument();
    expect(screen.getByAltText(after.alt)).toBeInTheDocument();
  });

  it('moves in 2% steps with the arrow keys', async () => {
    const user = userEvent.setup();
    renderSlider(50);

    const slider = screen.getByRole('slider');
    slider.focus();

    await user.keyboard('{ArrowRight}');
    expect(slider).toHaveAttribute('aria-valuenow', '52');

    await user.keyboard('{ArrowLeft}{ArrowLeft}');
    expect(slider).toHaveAttribute('aria-valuenow', '48');
  });

  it('moves in 10% steps with Page Up and Page Down', async () => {
    const user = userEvent.setup();
    renderSlider(50);

    const slider = screen.getByRole('slider');
    slider.focus();

    await user.keyboard('{PageUp}');
    expect(slider).toHaveAttribute('aria-valuenow', '60');

    await user.keyboard('{PageDown}{PageDown}');
    expect(slider).toHaveAttribute('aria-valuenow', '40');
  });

  it('snaps to the extremes with Home and End', async () => {
    const user = userEvent.setup();
    renderSlider(50);

    const slider = screen.getByRole('slider');
    slider.focus();

    await user.keyboard('{Home}');
    expect(slider).toHaveAttribute('aria-valuenow', '0');

    await user.keyboard('{End}');
    expect(slider).toHaveAttribute('aria-valuenow', '100');
  });

  it('clamps at both ends rather than wrapping around', async () => {
    const user = userEvent.setup();
    renderSlider(0);

    const slider = screen.getByRole('slider');
    slider.focus();

    await user.keyboard('{ArrowLeft}{ArrowLeft}{ArrowLeft}');
    expect(slider).toHaveAttribute('aria-valuenow', '0');

    await user.keyboard('{End}{ArrowRight}{ArrowRight}');
    expect(slider).toHaveAttribute('aria-valuenow', '100');
  });

  it('clamps an out-of-range initial position', () => {
    render(<BeforeAfterSlider before={before} after={after} label="Test" initial={480} />);

    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '100');
  });

  it('describes which side is showing in aria-valuetext', async () => {
    const user = userEvent.setup();
    renderSlider(50);

    const slider = screen.getByRole('slider');
    slider.focus();

    await user.keyboard('{Home}');
    expect(slider.getAttribute('aria-valuetext')).toContain('After');

    await user.keyboard('{End}');
    expect(slider.getAttribute('aria-valuetext')).toContain('Before');
  });
});

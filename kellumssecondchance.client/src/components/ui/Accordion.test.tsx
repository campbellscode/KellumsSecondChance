import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Accordion } from './Accordion';

const items = [
  { id: 1, question: 'Do you charge for an estimate?', answer: <p>Ask us and we will be clear.</p> },
  { id: 2, question: 'Can we stay in the house?', answer: <p>For most projects, yes.</p> },
  { id: 3, question: 'Do you handle permits?', answer: <p>Where the work requires them.</p> },
];

describe('Accordion', () => {
  it('renders every question as a button inside a heading', () => {
    render(<Accordion items={items} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
    buttons.forEach((button) => expect(button).toHaveAttribute('aria-expanded', 'false'));
  });

  it('wires each button to its panel', async () => {
    const user = userEvent.setup();
    render(<Accordion items={items} />);

    const button = screen.getByRole('button', { name: /charge for an estimate/i });
    await user.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'true');
    const panelId = button.getAttribute('aria-controls');
    expect(panelId).toBeTruthy();
    expect(document.getElementById(panelId as string)).not.toHaveAttribute('hidden');
  });

  it('closes an open panel when clicked again', async () => {
    const user = userEvent.setup();
    render(<Accordion items={items} />);

    const button = screen.getByRole('button', { name: /charge for an estimate/i });
    await user.click(button);
    await user.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('keeps only one panel open by default', async () => {
    const user = userEvent.setup();
    render(<Accordion items={items} />);

    await user.click(screen.getByRole('button', { name: /charge for an estimate/i }));
    await user.click(screen.getByRole('button', { name: /stay in the house/i }));

    expect(screen.getByRole('button', { name: /charge for an estimate/i })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
    expect(screen.getByRole('button', { name: /stay in the house/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('allows several panels open when asked', async () => {
    const user = userEvent.setup();
    render(<Accordion items={items} allowMultiple />);

    await user.click(screen.getByRole('button', { name: /charge for an estimate/i }));
    await user.click(screen.getByRole('button', { name: /stay in the house/i }));

    expect(screen.getByRole('button', { name: /charge for an estimate/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(screen.getByRole('button', { name: /stay in the house/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  it('moves focus between questions with the arrow keys and wraps at the ends', async () => {
    const user = userEvent.setup();
    render(<Accordion items={items} />);

    const [first, second, third] = screen.getAllByRole('button');
    first.focus();

    await user.keyboard('{ArrowDown}');
    expect(second).toHaveFocus();

    await user.keyboard('{ArrowUp}');
    expect(first).toHaveFocus();

    // Wraps backwards from the first to the last.
    await user.keyboard('{ArrowUp}');
    expect(third).toHaveFocus();

    await user.keyboard('{Home}');
    expect(first).toHaveFocus();

    await user.keyboard('{End}');
    expect(third).toHaveFocus();
  });

  it('opens the panels named in defaultOpen', () => {
    render(<Accordion items={items} defaultOpen={[2]} />);

    expect(screen.getByRole('button', { name: /stay in the house/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });
});

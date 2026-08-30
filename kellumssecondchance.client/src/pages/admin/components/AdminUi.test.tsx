import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataTable, Pill, PublishPill, Switch, TagInput } from './AdminUi';
import type { Column } from './AdminUi';

interface Row {
  id: number;
  name: string;
}

const COLUMNS: readonly Column<Row>[] = [
  { key: 'name', header: 'Name', render: (row) => row.name },
  { key: 'actions', header: 'Actions', headerHidden: true, render: () => 'Edit' },
];

describe('DataTable', () => {
  it('renders a real table with a caption', () => {
    // A div grid looks identical and loses row/column semantics entirely, so
    // the element type is worth asserting rather than assuming.
    render(
      <DataTable
        caption="Projects"
        columns={COLUMNS}
        rows={[{ id: 1, name: 'Maple Street Kitchen' }]}
        rowKey={(row) => row.id}
        empty="Nothing here"
      />,
    );

    const table = screen.getByRole('table', { name: 'Projects' });
    expect(table).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: 'Maple Street Kitchen' })).toBeInTheDocument();
  });

  it('still announces a column whose header is visually hidden', () => {
    render(
      <DataTable
        caption="Projects"
        columns={COLUMNS}
        rows={[{ id: 1, name: 'Maple Street Kitchen' }]}
        rowKey={(row) => row.id}
        empty="Nothing here"
      />,
    );

    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument();
  });

  it('shows the empty message instead of a headed table with no rows', () => {
    render(
      <DataTable
        caption="Projects"
        columns={COLUMNS}
        rows={[]}
        rowKey={(row) => row.id}
        empty="No projects yet"
      />,
    );

    expect(screen.getByText('No projects yet')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('Switch', () => {
  it('is a real checkbox tied to its label', async () => {
    const onChange = vi.fn();
    render(
      <Switch
        label="Show this project on the website"
        description="While this is off the project is a draft."
        checked={false}
        onChange={onChange}
      />,
    );

    const control = screen.getByRole('checkbox', { name: /show this project/i });
    await userEvent.click(control);

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('associates the description for assistive tech', () => {
    render(
      <Switch
        label="Publish this address"
        description="Off by default."
        checked={false}
        onChange={() => {}}
      />,
    );

    expect(screen.getByRole('checkbox')).toHaveAccessibleDescription('Off by default.');
  });

  it('shows the consequence note only while it is switched on', () => {
    const { rerender } = render(
      <Switch
        label="Hold this back"
        checked={false}
        onChange={() => {}}
        activeNote="Write an answer before you can untick this."
      />,
    );

    expect(screen.queryByText(/write an answer/i)).not.toBeInTheDocument();

    rerender(
      <Switch
        label="Hold this back"
        checked
        onChange={() => {}}
        activeNote="Write an answer before you can untick this."
      />,
    );

    expect(screen.getByText(/write an answer/i)).toBeInTheDocument();
  });
});

describe('TagInput', () => {
  it('adds an entry on Enter without submitting the surrounding form', async () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());
    const onChange = vi.fn();

    render(
      <form onSubmit={onSubmit}>
        <TagInput label="Highlights" values={[]} onChange={onChange} />
      </form>,
    );

    await userEvent.type(screen.getByLabelText('Highlights'), 'Reclaimed oak worktops{Enter}');

    expect(onChange).toHaveBeenCalledWith(['Reclaimed oak worktops']);
    // Enter inside a text input would otherwise save the whole project.
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('refuses a duplicate rather than listing it twice', async () => {
    const onChange = vi.fn();
    render(<TagInput label="Highlights" values={['Oak']} onChange={onChange} />);

    await userEvent.type(screen.getByLabelText('Highlights'), 'Oak{Enter}');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('ignores an entry that is only whitespace', async () => {
    const onChange = vi.fn();
    render(<TagInput label="Highlights" values={[]} onChange={onChange} />);

    await userEvent.type(screen.getByLabelText('Highlights'), '   {Enter}');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes an entry with a named button', async () => {
    const onChange = vi.fn();
    render(<TagInput label="Highlights" values={['Oak', 'Brass']} onChange={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: /remove “Oak”/i }));

    expect(onChange).toHaveBeenCalledWith(['Brass']);
  });

  it('stops at the maximum and says so', () => {
    render(<TagInput label="Highlights" values={['a', 'b']} max={2} onChange={() => {}} />);

    const input = screen.getByLabelText('Highlights');
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute('placeholder', 'Maximum of 2 reached');
  });
});

describe('publish pills', () => {
  it('says what a business owner would say, not what the database says', () => {
    const { rerender } = render(<PublishPill isActive />);
    expect(screen.getByText('On the site')).toBeInTheDocument();

    rerender(<PublishPill isActive={false} />);
    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('renders arbitrary pill text', () => {
    render(<Pill tone="warn">Needs your answer</Pill>);
    expect(screen.getByText('Needs your answer')).toBeInTheDocument();
  });
});

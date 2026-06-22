import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatCard from '../StatCard';
import { Badge, PageHeader } from '../ui';
import DataTable from '../DataTable';

describe('shared UI components', () => {
  it('StatCard renders label, value and sub', () => {
    render(<StatCard label="Stock value" value="₹1,200" sub="on hand" />);
    expect(screen.getByText('Stock value')).toBeInTheDocument();
    expect(screen.getByText('₹1,200')).toBeInTheDocument();
    expect(screen.getByText('on hand')).toBeInTheDocument();
  });

  it('Badge humanizes underscored status', () => {
    render(<Badge>in_progress</Badge>);
    expect(screen.getByText('in progress')).toBeInTheDocument();
  });

  it('PageHeader shows title + subtitle', () => {
    render(<PageHeader title="Inventory" subtitle="stock register" />);
    expect(screen.getByRole('heading', { name: 'Inventory' })).toBeInTheDocument();
    expect(screen.getByText('stock register')).toBeInTheDocument();
  });

  it('DataTable shows empty state when no rows', () => {
    render(<DataTable columns={[{ key: 'name', header: 'Name' }]} rows={[]} emptyText="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('DataTable renders rows via render fn', () => {
    const cols = [{ key: 'name', header: 'Name', render: (r) => r.name }];
    render(<DataTable columns={cols} rows={[{ _id: '1', name: 'Cell A' }]} />);
    expect(screen.getByText('Cell A')).toBeInTheDocument();
  });
});

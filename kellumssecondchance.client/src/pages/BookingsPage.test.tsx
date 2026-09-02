import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import BookingsPage from './BookingsPage';
import { apiRequest } from '@/lib/api/client';

vi.mock('@/lib/api/client',async(importOriginal)=>({...await importOriginal<typeof import('@/lib/api/client')>(),apiRequest:vi.fn()}));
vi.mock('@/lib/siteContentContext',()=>({useSiteContent:()=>({site:{legalName:"Kellum’s Second Chance Renovations",siteUrl:'https://example.test',ogImagePath:null}})}));

describe('Bookings page',()=>{
  it('requires the useful booking fields and describes a request, not confirmation',()=>{
    render(<MemoryRouter><BookingsPage/></MemoryRouter>);
    for(const label of ['First Name','Last Name','Email','Phone','Preferred Date','Preferred Time','Project Address / Service Location','City','State','ZIP','Brief description']) expect(screen.getByLabelText(label)).toBeRequired();
    expect(screen.getByText(/not a confirmed appointment/i)).toBeInTheDocument();
  });
  it('submits a future request and uses non-confirming success wording',async()=>{
    vi.mocked(apiRequest).mockResolvedValueOnce({});
    render(<MemoryRouter><BookingsPage/></MemoryRouter>);
    await userEvent.type(screen.getByLabelText('First Name'),'Avery'); await userEvent.type(screen.getByLabelText('Last Name'),'Homeowner');
    await userEvent.type(screen.getByLabelText('Email'),'avery@example.com'); await userEvent.type(screen.getByLabelText('Phone'),'513-555-0101');
    const date=new Date();date.setDate(date.getDate()+3);await userEvent.type(screen.getByLabelText('Preferred Date'),date.toISOString().slice(0,10));
    await userEvent.type(screen.getByLabelText('Preferred Time'),'10:30'); await userEvent.type(screen.getByLabelText('Project Address / Service Location'),'1 Main St');
    await userEvent.type(screen.getByLabelText('City'),'Cincinnati'); await userEvent.type(screen.getByLabelText('State'),'OH'); await userEvent.type(screen.getByLabelText('ZIP'),'45236');
    await userEvent.type(screen.getByLabelText('Brief description'),'Please look at the exterior siding.'); await userEvent.click(screen.getByRole('button',{name:'Request a time'}));
    expect(await screen.findByText('Your booking request is in.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/follow up to confirm availability/i); expect(document.body.textContent).not.toMatch(/appointment is confirmed/i);
  });
});

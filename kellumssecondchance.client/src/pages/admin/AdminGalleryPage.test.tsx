import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminGalleryPage from './AdminGalleryPage';
import * as api from '@/lib/api/admin';

vi.mock('@/lib/siteContentContext',()=>({useSiteContent:()=>({site:{legalName:"Kellum’s",siteUrl:'https://example.test',ogImagePath:null}})}));
vi.mock('@/lib/api/admin', () => ({ getAdminGallery: vi.fn(), uploadGalleryImage: vi.fn(), updateGalleryImage: vi.fn(), reorderGalleryImages: vi.fn(), deleteGalleryImage: vi.fn() }));
const item={id:1,imageUrl:'/media/gallery/gallery-01.jpg',originalFileName:'gallery-01.jpg',altText:'Exterior photo',caption:null,width:752,height:1008,isActive:true,displayOrder:1,isUploaded:false,fileSizeBytes:null};

describe('Admin Gallery',()=>{
  beforeEach(()=>{ vi.mocked(api.getAdminGallery).mockResolvedValue([item]); });
  it('renders managed photos and supports multi-file selection',async()=>{
    render(<MemoryRouter><AdminGalleryPage/></MemoryRouter>);
    expect(await screen.findByText('gallery-01.jpg')).toBeInTheDocument();
    const input=screen.getByLabelText(/select photos/i);
    await userEvent.upload(input,[new File(['a'],'one.jpg',{type:'image/jpeg'}),new File(['b'],'two.png',{type:'image/png'})]);
    expect(screen.getByRole('button',{name:'Upload 2 photos'})).toBeInTheDocument();
  });
  it('saves active metadata and confirms delete',async()=>{
    vi.spyOn(window,'confirm').mockReturnValue(true); vi.mocked(api.updateGalleryImage).mockResolvedValue(item); vi.mocked(api.deleteGalleryImage).mockResolvedValue();
    render(<MemoryRouter><AdminGalleryPage/></MemoryRouter>); await screen.findByText('gallery-01.jpg');
    await userEvent.clear(screen.getByLabelText('Alt text')); await userEvent.type(screen.getByLabelText('Alt text'),'Updated exterior view'); await userEvent.click(screen.getByRole('button',{name:'Save'}));
    expect(api.updateGalleryImage).toHaveBeenCalledWith(1,expect.objectContaining({altText:'Updated exterior view',isActive:true}));
    await userEvent.click(screen.getByRole('button',{name:/delete/i})); expect(api.deleteGalleryImage).toHaveBeenCalledWith(1);
  });
});

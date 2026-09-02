import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, Images, Trash2, Upload } from 'lucide-react';
import { Seo } from '@/lib/seo/Seo';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { deleteGalleryImage, getAdminGallery, reorderGalleryImages, updateGalleryImage, uploadGalleryImage } from '@/lib/api/admin';
import type { AdminGalleryImage } from '@/lib/api/adminTypes';
import styles from './AdminGalleryPage.module.css';

export default function AdminGalleryPage() {
  const [items, setItems] = useState<readonly AdminGalleryImage[]>([]);
  const [state, setState] = useState<'loading'|'ready'|'error'>('loading');
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const load = useCallback(() => { getAdminGallery().then((x) => { setItems(x); setState('ready'); }).catch(() => setState('error')); }, []);
  useEffect(load, [load]);

  const uploadAll = async () => {
    setBusy(true); setMessage(null); const failures: string[] = [];
    for (const file of files) { try { await uploadGalleryImage(file); } catch { failures.push(file.name); } }
    setFiles([]); setBusy(false); load(); setMessage(failures.length ? `Could not upload: ${failures.join(', ')}` : 'Photos uploaded.');
  };
  const save = async (item: AdminGalleryImage, form: HTMLFormElement) => {
    const data = new FormData(form); setBusy(true); setMessage(null);
    try { await updateGalleryImage(item.id, { altText: String(data.get('altText')), caption: String(data.get('caption') || '') || null, isActive: data.get('isActive') === 'on' }); setMessage('Photo details saved.'); load(); }
    catch { setMessage('That photo could not be saved.'); } finally { setBusy(false); }
  };
  const move = async (index: number, delta: number) => {
    const next = [...items]; const target = index + delta; if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]]; setItems(next); setBusy(true);
    try { await reorderGalleryImages(next.map((x) => x.id)); setMessage('Gallery order saved.'); } catch { setMessage('The new order could not be saved.'); load(); } finally { setBusy(false); }
  };
  const remove = async (item: AdminGalleryImage) => {
    if (!window.confirm(`Delete ${item.originalFileName}? This cannot be undone.`)) return;
    setBusy(true); try { await deleteGalleryImage(item.id); setMessage('Photo deleted.'); load(); } catch { setMessage('That photo could not be deleted.'); } finally { setBusy(false); }
  };

  return <div className={styles.page}>
    <Seo title="Admin Gallery" description="Manage Gallery photography." path="/admin/gallery" noIndex />
    <header className={styles.header}><div><p className={styles.eyebrow}>Content</p><h1>Gallery</h1><p>{items.length} photos</p></div><label className={styles.uploadButton}><Upload size={16} aria-hidden="true" /> Select photos<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => setFiles(Array.from(e.target.files ?? []))} /></label></header>
    {message ? <p className={styles.message} role="status">{message}</p> : null}
    {files.length ? <section className={styles.queue} aria-label="Selected photos"><h2>Ready to upload</h2><ul>{files.map((file, i) => <li key={`${file.name}-${file.size}`}><img src={URL.createObjectURL(file)} alt="" /><span>{file.name}</span><button type="button" onClick={() => setFiles((x) => x.filter((_, n) => n !== i))}>Remove</button></li>)}</ul><button type="button" disabled={busy} onClick={uploadAll}>{busy ? 'Uploading…' : `Upload ${files.length} photo${files.length === 1 ? '' : 's'}`}</button></section> : null}
    {state === 'loading' ? <LoadingState label="Loading gallery photos" /> : state === 'error' ? <ErrorState title="Gallery management could not be loaded" description="Try again." onRetry={() => { setState('loading'); load(); }} /> : items.length === 0 ? <div className={styles.empty}><Images aria-hidden="true" /><h2>No gallery photos yet</h2><p>Select photos above to publish the first set.</p></div> : <ul className={styles.grid}>{items.map((item, index) => <li key={item.id} className={styles.card}>
      <img src={item.imageUrl} width={item.width} height={item.height} alt="" />
      <form onSubmit={(e) => { e.preventDefault(); void save(item, e.currentTarget); }}><div className={styles.cardHead}><strong>#{index + 1}</strong><span className={item.isActive ? styles.active : styles.inactive}>{item.isActive ? 'Active' : 'Inactive'}</span></div>
        <small>{item.originalFileName}</small>
        <label>Alt text<input name="altText" defaultValue={item.altText} required maxLength={300} /></label><label>Caption (optional)<textarea name="caption" defaultValue={item.caption ?? ''} maxLength={500} rows={2} /></label><label className={styles.check}><input name="isActive" type="checkbox" defaultChecked={item.isActive} /> Show publicly</label>
        <div className={styles.actions}><button type="button" aria-label={`Move ${item.originalFileName} up`} disabled={busy || index === 0} onClick={() => void move(index, -1)}><ArrowUp size={15} /></button><button type="button" aria-label={`Move ${item.originalFileName} down`} disabled={busy || index === items.length - 1} onClick={() => void move(index, 1)}><ArrowDown size={15} /></button><button type="submit" disabled={busy}>Save</button><button type="button" className={styles.delete} disabled={busy} onClick={() => void remove(item)}><Trash2 size={15} /> Delete</button></div>
      </form></li>)}</ul>}
  </div>;
}

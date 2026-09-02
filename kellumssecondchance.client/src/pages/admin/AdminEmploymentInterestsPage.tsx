import { useCallback, useEffect, useState } from 'react';
import styles from './AdminEmploymentInterestsPage.module.css';
import { Seo } from '@/lib/seo/Seo';
import { apiRequest } from '@/lib/api/client';
import { antiforgeryToken, retryEmploymentInterestNotification } from '@/lib/api/admin';
import { Button } from '@/components/ui/Button';
import { EmptyState, ErrorState, LoadingState } from '@/components/ui/States';

type Status = 'New' | 'Contacted' | 'Interview' | 'Closed' | 'Archived';
interface Interest { id:number; firstName:string; lastName:string; email:string; phone?:string; preferredContactMethod:string; generalWorkExperience?:string; areasOfExperience?:string; workInterest:string; availability?:string; message?:string; status:Status; internalNotes?:string; createdAtUtc:string; rowVersion:string; notificationAttemptCount:number; notificationAttemptedAtUtc?:string|null; notificationDeliveredAtUtc?:string|null; notificationFailedAtUtc?:string|null; notificationFailureCategory?:string|null }

export default function AdminEmploymentInterestsPage() {
  const [items,setItems]=useState<Interest[]>([]); const [loading,setLoading]=useState(true); const [error,setError]=useState(false); const [saving,setSaving]=useState<number|null>(null);
  const load=useCallback(()=>{setLoading(true);setError(false);apiRequest<Interest[]>('/api/admin/employment-interests').then(setItems).catch(()=>setError(true)).finally(()=>setLoading(false));},[]);
  useEffect(()=>{
    let active=true;
    apiRequest<Interest[]>('/api/admin/employment-interests')
      .then(data=>{if(active)setItems(data);})
      .catch(()=>{if(active)setError(true);})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[]);
  async function save(item:Interest){setSaving(item.id);try{const updated=await apiRequest<Interest>(`/api/admin/employment-interests/${item.id}`,{method:'PUT',antiforgeryToken:await antiforgeryToken(),body:{status:item.status,internalNotes:item.internalNotes,rowVersion:item.rowVersion}});setItems(current=>current.map(x=>x.id===updated.id?updated:x));}catch{setError(true);}finally{setSaving(null);}}
  async function retry(item:Interest){setSaving(item.id);setError(false);try{await retryEmploymentInterestNotification(item.id);const updated=await apiRequest<Interest>(`/api/admin/employment-interests/${item.id}`);setItems(current=>current.map(x=>x.id===updated.id?updated:x));}catch{setError(true);}finally{setSaving(null);}}
  const update=(id:number,changes:Partial<Interest>)=>setItems(current=>current.map(x=>x.id===id?{...x,...changes}:x));
  return <><Seo title="Work enquiries · Admin" description="Private employment-interest triage." path="/admin/employment-interests" noIndex/><header className={styles.header}><p>People</p><h1>Work enquiries</h1><span>Preliminary enquiries only—not formal applications.</span></header>{loading?<LoadingState label="Loading work enquiries" variant="inline"/>:error&&items.length===0?<ErrorState title="We could not load work enquiries" onRetry={load}/>:items.length===0?<EmptyState title="No work enquiries yet" description="New messages from the Work With Us page will appear here."/>:<div className={styles.list}>{items.map(item=><article className={styles.card} key={item.id}><div className={styles.top}><div><h2>{item.firstName} {item.lastName}</h2><p>{new Date(item.createdAtUtc).toLocaleString()}</p></div><select aria-label={`Status for ${item.firstName} ${item.lastName}`} value={item.status} onChange={e=>update(item.id,{status:e.target.value as Status})}>{['New','Contacted','Interview','Closed','Archived'].map(x=><option key={x}>{x}</option>)}</select></div><dl><div><dt>Contact</dt><dd><a href={`mailto:${item.email}`}>{item.email}</a>{item.phone&&<> · <a href={`tel:${item.phone}`}>{item.phone}</a></>}</dd></div><div><dt>Interested in</dt><dd>{item.workInterest}</dd></div>{item.availability&&<div><dt>Availability</dt><dd>{item.availability}</dd></div>}{item.generalWorkExperience&&<div><dt>Experience</dt><dd>{item.generalWorkExperience}</dd></div>}{item.areasOfExperience&&<div><dt>Skills</dt><dd>{item.areasOfExperience}</dd></div>}{item.message&&<div><dt>Message</dt><dd>{item.message}</dd></div>}<div><dt>Notification</dt><dd>{item.notificationDeliveredAtUtc?'Delivered':item.notificationFailedAtUtc?'Failed':'Not yet sent'} · {item.notificationAttemptCount} attempt{item.notificationAttemptCount===1?'':'s'}{item.notificationAttemptedAtUtc?<><br/>Last attempt: {new Date(item.notificationAttemptedAtUtc).toLocaleString()}</>:null}{item.notificationDeliveredAtUtc?<><br/>Delivered: {new Date(item.notificationDeliveredAtUtc).toLocaleString()}</>:null}{item.notificationFailedAtUtc?<><br/>Failed: {new Date(item.notificationFailedAtUtc).toLocaleString()}</>:null}{item.notificationFailureCategory?<><br/>Category: {item.notificationFailureCategory}</>:null}</dd></div></dl><label>Internal notes<textarea rows={4} maxLength={4000} value={item.internalNotes??''} onChange={e=>update(item.id,{internalNotes:e.target.value})}/></label><div className={styles.actions}><Button type="button" size="sm" loading={saving===item.id} onClick={()=>void save(item)}>Save</Button>{!item.notificationDeliveredAtUtc?<Button type="button" variant="secondary" size="sm" loading={saving===item.id} onClick={()=>void retry(item)}>Retry notification</Button>:null}</div></article>)}</div>}</>;
}

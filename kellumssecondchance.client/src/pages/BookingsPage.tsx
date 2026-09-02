import { useEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import styles from './BookingsPage.module.css';
import { Seo } from '@/lib/seo/Seo';
import { PageHero } from '@/components/marketing/PageHero';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { apiRequest, ApiError } from '@/lib/api/client';

const crumbs = [{ name: 'Home', path: '/' }, { name: 'Bookings', path: '/bookings' }];
const tomorrow = () => { const date = new Date(); date.setDate(date.getDate() + 1); return date.toISOString().slice(0, 10); };

export default function BookingsPage() {
  const started = useRef(0);
  const errorRef = useRef<HTMLDivElement>(null);
  const [busy,setBusy]=useState(false); const [sent,setSent]=useState(false); const [error,setError]=useState<string|null>(null);
  useEffect(() => { started.current = Date.now(); }, []);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(null);
    const data = new FormData(event.currentTarget);
    const alternateDate = String(data.get('alternateDate') ?? ''); const alternateTime = String(data.get('alternateTime') ?? '');
    if (Boolean(alternateDate) !== Boolean(alternateTime)) { setError('Provide both an alternate date and alternate time, or leave both blank.'); setBusy(false); requestAnimationFrame(()=>errorRef.current?.focus()); return; }
    try {
      await apiRequest('/api/booking-requests',{method:'POST',body:{
        firstName:data.get('firstName'),lastName:data.get('lastName'),email:data.get('email'),phone:data.get('phone'),
        preferredDate:data.get('preferredDate'),preferredTime:data.get('preferredTime'),alternateDate:alternateDate||null,alternateTime:alternateTime||null,
        address:data.get('address'),city:data.get('city'),state:data.get('state'),postalCode:data.get('postalCode'),
        projectDescription:data.get('projectDescription'),notes:data.get('notes'),companyWebsite:data.get('companyWebsite'),elapsedMs:Date.now()-started.current,
      }}); setSent(true);
    } catch (reason) { setError(reason instanceof ApiError ? reason.message : 'We could not send your booking request. Please try again.'); requestAnimationFrame(()=>errorRef.current?.focus()); }
    finally { setBusy(false); }
  }
  return <>
    <Seo title="Bookings" description="Request a time to discuss exterior renovation, repair or restoration work with Kellum’s Second Chance Renovations in Cincinnati, Ohio." path="/bookings" />
    <PageHero eyebrow="Book a time" title="Let’s find a time to look at your home." lead="Tell us when works best for you. We’ll review your request and follow up to confirm availability." crumbs={crumbs} layout="plain" />
    <section className={styles.section} aria-labelledby="booking-heading"><Container width="narrow">
      <div className={styles.intro}><h2 id="booking-heading">Request a time.</h2><p>This is a request, not a confirmed appointment. Choose the times you prefer and we’ll follow up to confirm availability.</p></div>
      {sent ? <div className={styles.success} role="status"><CheckCircle2 aria-hidden="true"/><h3>Your booking request is in.</h3><p>We’ll review the time you requested and follow up to confirm availability.</p></div> :
      <form className={styles.form} onSubmit={submit}>
        {error ? <div ref={errorRef} className={styles.error} role="alert" tabIndex={-1}><strong>We could not submit that yet.</strong><p>{error}</p></div> : null}
        <fieldset><legend>Your details</legend><div className={styles.row}><label>First Name<input name="firstName" required maxLength={80} autoComplete="given-name"/></label><label>Last Name<input name="lastName" required maxLength={80} autoComplete="family-name"/></label></div><div className={styles.row}><label>Email<input name="email" type="email" required maxLength={254} autoComplete="email"/></label><label>Phone<input name="phone" type="tel" required maxLength={30} autoComplete="tel"/></label></div></fieldset>
        <fieldset><legend>Preferred date and time</legend><p className={styles.hint}>These times are preferences. We’ll confirm what is available.</p><div className={styles.row}><label>Preferred Date<input name="preferredDate" type="date" min={tomorrow()} required/></label><label>Preferred Time<input name="preferredTime" type="time" required/></label></div><div className={styles.row}><label>Alternate Date <span>Optional</span><input name="alternateDate" type="date" min={tomorrow()}/></label><label>Alternate Time <span>Optional</span><input name="alternateTime" type="time"/></label></div></fieldset>
        <fieldset><legend>Service location</legend><label>Project Address / Service Location<input name="address" required maxLength={200} autoComplete="street-address"/></label><div className={styles.addressRow}><label>City<input name="city" required maxLength={100} autoComplete="address-level2"/></label><label>State<input name="state" required minLength={2} maxLength={2} autoComplete="address-level1"/></label><label>ZIP<input name="postalCode" required maxLength={12} autoComplete="postal-code"/></label></div></fieldset>
        <fieldset><legend>What should we look at?</legend><label>Brief description<textarea name="projectDescription" required minLength={10} maxLength={3000} rows={6}/></label><label>Notes <span>Optional</span><textarea name="notes" maxLength={2000} rows={4}/></label></fieldset>
        <label className={styles.honeypot} aria-hidden="true">Company website<input name="companyWebsite" tabIndex={-1} autoComplete="off"/></label>
        <Button type="submit" size="lg" loading={busy} loadingLabel="Sending request…">Request a time</Button>
      </form>}
    </Container></section>
  </>;
}

import { useEffect, useRef, useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import styles from './WorkWithUsPage.module.css';
import { Seo } from '@/lib/seo/Seo';
import { PageHero } from '@/components/marketing/PageHero';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { apiRequest, ApiError } from '@/lib/api/client';
import { trackEvent } from '@/lib/analytics';

const values = [
  ['Show up', 'Be dependable and ready to contribute.'],
  ['Keep learning', 'Bring curiosity, accept guidance and improve with every job.'],
  ['Take pride', 'Care about the work people see and the details they never will.'],
  ['Respect people', 'Treat customers, their homes and your teammates well.'],
  ['Be accountable', 'Own the work, communicate clearly and make things right.'],
  ['Build what comes next', 'Turn today’s effort into skill, experience and momentum.'],
] as const;

export default function WorkWithUsPage() {
  const startedAt = useRef(0);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { startedAt.current = Date.now(); }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const data = new FormData(event.currentTarget);
    try {
      await apiRequest('/api/employment-interests', {
        method: 'POST',
        body: {
          firstName: data.get('firstName'), lastName: data.get('lastName'),
          email: data.get('email'), phone: data.get('phone'),
          preferredContactMethod: data.get('preferredContactMethod'),
          generalWorkExperience: data.get('generalWorkExperience'),
          areasOfExperience: data.get('areasOfExperience'),
          workInterest: data.get('workInterest'), availability: data.get('availability'),
          message: data.get('message'), companyWebsite: data.get('companyWebsite'),
          elapsedMs: Date.now() - startedAt.current,
        },
      });
      setSent(true);
      trackEvent('employment_interest_submitted');
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : 'We could not send that. Please try again.');
    } finally { setBusy(false); }
  }

  return <>
    <Seo title="Work With Us" description="Renovation and construction opportunities at Kellum’s for people ready to work, learn and take pride in what they build." path="/work-with-us" />
    <PageHero eyebrow="Work with Kellum’s" title="Build something better." lead="If you are ready to work, learn, grow and take pride in what you build, we would like to hear from you." crumbs={[{ name: 'Home', path: '/' }, { name: 'Work With Us', path: '/work-with-us' }]} />

    <section className={styles.intro} aria-labelledby="place-heading"><Container width="wide">
      <div className={styles.split}><div><p className={styles.kicker}>A place to build from</p><h2 id="place-heading">Potential matters here. So does the work.</h2></div>
      <div className={styles.prose}><p>We believe in considering the person in front of us and the potential of what comes next. An opportunity is a beginning—what gives it meaning is effort, accountability and pride in the craft.</p><p>There is something powerful about restoring a home while building something new for yourself. Every repaired exterior and renewed house is proof that what comes next can be better than what came before.</p></div></div>
    </Container></section>

    <section className={styles.values} aria-labelledby="matters-heading"><Container width="wide"><p className={styles.kicker}>What matters here</p><h2 id="matters-heading">One standard. A team that keeps getting better.</h2><ul>{values.map(([title, body]) => <li key={title}><h3>{title}</h3><p>{body}</p></li>)}</ul></Container></section>

    <section className={styles.formSection} aria-labelledby="interest-heading"><Container width="narrow">
      <p className={styles.kicker}>Tell us about yourself</p><h2 id="interest-heading">Looking for an opportunity?</h2><p className={styles.lead}>This is an initial conversation, not a job application or a promise of employment. Share only what helps us understand the work you want to do—we do not ask for sensitive background or medical information here.</p>
      {sent ? <div className={styles.success} role="status"><CheckCircle2 aria-hidden="true"/><h3>Thank you for reaching out.</h3><p>We have your note. If there may be a fit, someone from Kellum’s will contact you using the method you chose.</p></div> :
      <form className={styles.form} onSubmit={submit}>
        {error && <p className={styles.error} role="alert" tabIndex={-1}>{error}</p>}
        <div className={styles.row}><label>First name<input name="firstName" required maxLength={80} autoComplete="given-name" /></label><label>Last name<input name="lastName" required maxLength={80} autoComplete="family-name" /></label></div>
        <div className={styles.row}><label>Email<input name="email" type="email" required maxLength={254} autoComplete="email" /></label><label>Phone<input name="phone" type="tel" maxLength={30} autoComplete="tel" /></label></div>
        <label>Preferred contact method<select name="preferredContactMethod" defaultValue="NoPreference"><option value="NoPreference">No preference</option><option value="Email">Email</option><option value="Phone">Phone</option><option value="Text">Text</option></select></label>
        <label>General work experience<textarea name="generalWorkExperience" rows={4} maxLength={2000} /></label>
        <label>Areas of experience or skills<textarea name="areasOfExperience" rows={4} maxLength={2000} /></label>
        <label>What type of work interests you?<input name="workInterest" required maxLength={300} /></label>
        <label>Availability<input name="availability" maxLength={300} /></label>
        <label>Anything else you would like us to know?<textarea name="message" rows={5} maxLength={3000} /></label>
        <label className={styles.honeypot} aria-hidden="true">Company website<input name="companyWebsite" tabIndex={-1} autoComplete="off" /></label>
        <Button type="submit" size="lg" loading={busy} loadingLabel="Sending…">Tell us about yourself</Button>
      </form>}
    </Container></section>
  </>;
}

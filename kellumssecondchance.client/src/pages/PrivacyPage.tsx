import { Link } from 'react-router-dom';
import { LegalPage } from '@/components/marketing/LegalPage';
import type { LegalSection } from '@/components/marketing/LegalPage';
import { useSiteContent } from '@/lib/siteContentContext';

/**
 * Describes what the application actually does with visitor data — nothing more.
 * It is written to match the real behaviour of the estimate endpoint, but it is
 * NOT legal advice and has not been reviewed by a lawyer.
 */
const SECTIONS: readonly LegalSection[] = [
  {
    id: 'what-we-collect',
    heading: 'What we collect',
    body: (
      <>
        <p>
          The only information we collect is what you type into a form on this site. That is your
          name, email address, phone number if you give one, the property location details you
          choose to share, and your description of the project. If you contact us through the Work
          With Us page, it also includes the work experience, skills, interests, availability and
          message you choose to provide. That form does not ask for criminal, medical or other
          sensitive background information.
        </p>
        <p>
          We also record the date and time your request arrived. For anti-spam purposes we store a
          one-way fingerprint of the network address the request came from — a scrambled value that
          lets us spot repeated automated submissions but cannot be turned back into an address. The
          address itself is never written down.
        </p>
        <p>
          For renovation enquiries, we may also keep the first page visited, an external referring
          page, and campaign labels such as source, medium and campaign. These first-party details
          help us understand how an enquiry found us; they do not contain the form message or create
          a cross-site profile.
        </p>
      </>
    ),
  },
  {
    id: 'why-we-collect-it',
    heading: 'Why we collect it',
    body: (
      <>
        <p>
          To reply to a renovation enquiry, arrange a visit and prepare an estimate; or to consider
          and respond to an employment-interest enquiry. We do not build a marketing profile of you
          or use the information for an unrelated purpose.
        </p>
      </>
    ),
  },
  {
    id: 'what-we-do-not-do',
    heading: 'What we do not do',
    body: (
      <ul>
        <li>We do not sell your information to anybody.</li>
        <li>We do not share it with third parties for marketing.</li>
        <li>We do not add you to a mailing list because you asked for an estimate.</li>
        <li>We do not run advertising or analytics trackers on this site.</li>
      </ul>
    ),
  },
  {
    id: 'cookies',
    heading: 'Cookies and tracking',
    body: (
      <p>
        This site sets no advertising or analytics cookies. The only cookie the application can set
        is a session cookie used to sign in to the private administration area, which applies to
        staff and not to visitors. Because there are no tracking cookies, there is no consent banner
        to click through.
      </p>
    ),
  },
  {
    id: 'how-long',
    heading: 'How long we keep it',
    body: (
      <p>
        Estimate and employment-interest requests are kept for as long as they are useful for the
        purpose you contacted us about and for reasonable business records. If you would like your
        enquiry deleted, ask us and we will remove it where we are able to do so.
      </p>
    ),
  },
  {
    id: 'security',
    heading: 'How it is protected',
    body: (
      <p>
        Submissions are sent over an encrypted connection and stored in a private database that is
        not publicly accessible. Access is restricted to people at the business who need it. No
        system is perfect, but we do not keep anything we do not need, which is the most effective
        protection there is.
      </p>
    ),
  },
  {
    id: 'your-choices',
    heading: 'Your choices',
    body: (
      <p>
        You can ask us what we hold about you, ask us to correct it, or ask us to delete it. Get in
        touch through the contact page and we will deal with it. You never have to give us a phone
        number or a street address to make an enquiry — email alone is enough.
      </p>
    ),
  },
  {
    id: 'contact',
    heading: 'Questions about this notice',
    body: (
      <p>
        Get in touch through the <Link to="/contact">contact page</Link> and ask. A person will answer
        you.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  const { site } = useSiteContent();
  return (
    <LegalPage
      title="Privacy"
      eyebrow="Privacy notice"
      description={`How ${site.legalName} handles the information you send through this website.`}
      path="/privacy"
      lead="Short version: we use what you send us to reply to you, and nothing else. Here is the longer version."
      updated="Awaiting business review"
      reviewNotice="This notice describes what the website actually does with your data, but it has not been reviewed by a lawyer and does not yet reflect any jurisdiction-specific obligations. It should be checked by a legal adviser before launch."
      sections={SECTIONS}
    />
  );
}

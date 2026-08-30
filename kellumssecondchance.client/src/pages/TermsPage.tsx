import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { LegalPage } from '@/components/marketing/LegalPage';
import type { LegalSection } from '@/components/marketing/LegalPage';
import { useSiteContent } from '@/lib/siteContentContext';

/**
 * Website terms only — deliberately narrow.
 *
 * These cover use of this website. They make no warranty, guarantee, pricing or
 * contractual promise about renovation work, because the business has not
 * supplied those terms and inventing them would be materially misleading.
 */
/**
 * A function of the business name rather than a constant.
 *
 * The name is editable at /admin/site-settings, and terms that keep naming a
 * company the business has stopped being are worse than no terms at all.
 */
function buildSections(businessName: string): readonly LegalSection[] {
  return [
  {
    id: 'about',
    heading: 'About these terms',
    body: (
      <p>
        These terms cover your use of this website. They do not form a contract for renovation work.
        Any work {businessName} carries out is governed by a separate written agreement made
        directly with you before the work begins.
      </p>
    ),
  },
  {
    id: 'information',
    heading: 'Information on this site',
    body: (
      <>
        <p>
          We publish this site in good faith and keep it as accurate as we can. Descriptions of
          services, project case studies and process explanations are illustrative — they describe how
          we work, not a fixed specification for your project.
        </p>
        <p>
          Nothing on this site is a quote. Renovation work cannot be priced without seeing the space.
          A price only becomes binding once it is issued to you in writing for your specific project.
        </p>
      </>
    ),
  },
  {
    id: 'sample-content',
    heading: 'Sample and placeholder content',
    body: (
      <p>
        While the site is being set up, some content is clearly labelled as sample or placeholder
        material — including example project case studies, example reviews and placeholder service
        areas. Anything marked as sample content is illustrative and should not be relied on as a
        record of completed work or a genuine customer statement.
      </p>
    ),
  },
  {
    id: 'enquiries',
    heading: 'Enquiries and estimate requests',
    body: (
      <>
        <p>
          Sending an enquiry through this site does not create an agreement and does not oblige
          either of us to anything. We aim to reply to every genuine enquiry, but submitting a form
          does not guarantee that we will take on the work.
        </p>
        <p>
          Please only submit information you are comfortable sharing, and only submit information
          about a property you are entitled to enquire about.
        </p>
      </>
    ),
  },
  {
    id: 'acceptable-use',
    heading: 'Acceptable use',
    body: (
      <ul>
        <li>Do not submit false, abusive or misleading information through our forms.</li>
        <li>Do not attempt to disrupt, overload or gain unauthorised access to this site.</li>
        <li>Do not use automated tools to scrape or bulk-submit to this site.</li>
      </ul>
    ),
  },
  {
    id: 'content',
    heading: 'Site content and images',
    body: (
      <p>
        The text, layout, branding and images on this site belong to {businessName} unless
        stated otherwise. You are welcome to link to the site or share pages. Please do not
        reproduce our project photography or copy elsewhere without asking first.
      </p>
    ),
  },
  {
    id: 'availability',
    heading: 'Availability',
    body: (
      <p>
        We try to keep the site available and working, but we do not promise uninterrupted access. We
        may change or remove content at any time — including updating service descriptions as what we
        offer changes.
      </p>
    ),
  },
  {
    id: 'contact',
    heading: 'Questions',
    body: (
      <p>
        If anything here is unclear, ask us through the <Link to="/contact">contact page</Link>.
      </p>
      ),
    },
  ];
}

export default function TermsPage() {
  const { site } = useSiteContent();
  const sections = useMemo(() => buildSections(site.legalName), [site.legalName]);
  return (
    <LegalPage
      title="Terms"
      eyebrow="Website terms"
      description={`Terms covering use of the ${site.legalName} website.`}
      path="/terms"
      lead="These cover using this website. The agreement for actual renovation work is a separate written document you get before anything starts."
      updated="Awaiting business review"
      reviewNotice="These terms cover website use only. Contract terms, warranty terms, payment terms and any consumer-protection obligations for renovation work must be drafted with a legal adviser before launch."
      sections={sections}
    />
  );
}

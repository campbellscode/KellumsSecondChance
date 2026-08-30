import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import styles from './AdminSiteSettingsPage.module.css';
import {
  ErrorSummary,
  FormSection,
  Notice,
  PageHeader,
  Panel,
  SaveBar,
  Switch,
} from './components/AdminUi';
import adminUi from './components/AdminUi.module.css';
import { ImageUploadField } from './components/ImageUploadField';
import { useDirtyGuard, useToast } from './components/adminFeedback';
import { NO_ERRORS, orNull, sameValue, toFormErrors } from './components/adminForm';
import type { FormErrors } from './components/adminForm';
import { TextArea, TextInput } from '@/components/ui/FormField';
import { ErrorState, LoadingState } from '@/components/ui/States';
import { useAsync } from '@/lib/hooks/useAsync';
import { getSiteSettings, saveSiteSettings, uploadSocialImage } from '@/lib/api/admin';
import { phoneCandidate } from '@/content/business';
import type { AdminSiteSettings, SiteSettingsWrite } from '@/lib/api/adminTypes';
import type { OfficeHours, SocialLink } from '@/lib/api/types';

const SOCIAL_ICONS = ['facebook', 'instagram', 'google', 'youtube', 'linkedin'] as const;

interface Draft {
  businessName: string;
  tagline: string;
  phoneDisplay: string;
  phoneE164: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  addressLocality: string;
  addressRegion: string;
  addressPostalCode: string;
  publishAddress: boolean;
  serviceAreaSummary: string;
  licensing: string;
  insurance: string;
  foundedYear: string;
  siteUrl: string;
  ogImagePath: string;
  socialLinks: readonly SocialLink[];
  officeHours: readonly OfficeHours[];
}

const EMPTY: Draft = {
  businessName: '',
  tagline: '',
  phoneDisplay: '',
  phoneE164: '',
  email: '',
  addressLine1: '',
  addressLine2: '',
  addressLocality: '',
  addressRegion: '',
  addressPostalCode: '',
  publishAddress: false,
  serviceAreaSummary: '',
  licensing: '',
  insurance: '',
  foundedYear: '',
  siteUrl: '',
  ogImagePath: '',
  socialLinks: [],
  officeHours: [],
};

function toDraft(settings: AdminSiteSettings): Draft {
  return {
    businessName: settings.businessName ?? '',
    tagline: settings.tagline ?? '',
    phoneDisplay: settings.phoneDisplay ?? '',
    phoneE164: settings.phoneE164 ?? '',
    email: settings.email ?? '',
    addressLine1: settings.addressLine1 ?? '',
    addressLine2: settings.addressLine2 ?? '',
    addressLocality: settings.addressLocality ?? '',
    addressRegion: settings.addressRegion ?? '',
    addressPostalCode: settings.addressPostalCode ?? '',
    publishAddress: settings.publishAddress,
    serviceAreaSummary: settings.serviceAreaSummary ?? '',
    licensing: settings.licensing ?? '',
    insurance: settings.insurance ?? '',
    foundedYear: settings.foundedYear === null ? '' : String(settings.foundedYear),
    siteUrl: settings.siteUrl ?? '',
    ogImagePath: settings.ogImagePath ?? '',
    socialLinks: settings.socialLinks,
    officeHours: settings.officeHours,
  };
}

/**
 * The business's own details.
 *
 * This screen is the reason the whole site was built the way it was. Every
 * field here starts empty because nobody had confirmed it, and every one of
 * them is OMITTED from the public site while it is empty: no placeholder phone
 * number, no invented address, no licence claim.
 *
 * Filling one in is all it takes for the corresponding element to appear —
 * across the header, hero, footer, contact page, mobile call bar and the
 * structured data search engines read. There is no rebuild and no code change.
 */
export default function AdminSiteSettingsPage() {
  const toast = useToast();
  const guard = useDirtyGuard();

  const loader = useCallback((signal: AbortSignal) => getSiteSettings(signal), []);
  const { data, status, error, reload } = useAsync(loader);

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [baseline, setBaseline] = useState<Draft>(EMPTY);
  const [errors, setErrors] = useState<FormErrors>(NO_ERRORS);
  const [saving, setSaving] = useState(false);
  /** Dimensions of the card, known only after an upload in this session. */
  const [socialSize, setSocialSize] = useState<{ width: number; height: number } | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    if (!data || loaded.current) return;
    loaded.current = true;
    const next = toDraft(data);
    setDraft(next);
    setBaseline(next);
  }, [data]);

  const dirty = !sameValue(draft, baseline);

  // The stable setter, for the reason given in AdminProjectEditorPage.
  const { setDirty } = guard;
  useEffect(() => {
    setDirty(dirty);
    return () => setDirty(false);
  }, [dirty, setDirty]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const save = async () => {
    setSaving(true);
    setErrors(NO_ERRORS);

    const payload: SiteSettingsWrite = {
      businessName: orNull(draft.businessName),
      tagline: orNull(draft.tagline),
      phoneDisplay: orNull(draft.phoneDisplay),
      phoneE164: orNull(draft.phoneE164),
      email: orNull(draft.email),
      addressLine1: orNull(draft.addressLine1),
      addressLine2: orNull(draft.addressLine2),
      addressLocality: orNull(draft.addressLocality),
      addressRegion: orNull(draft.addressRegion),
      addressPostalCode: orNull(draft.addressPostalCode),
      publishAddress: draft.publishAddress,
      serviceAreaSummary: orNull(draft.serviceAreaSummary),
      licensing: orNull(draft.licensing),
      insurance: orNull(draft.insurance),
      foundedYear: draft.foundedYear.trim() ? Number(draft.foundedYear) : null,
      siteUrl: orNull(draft.siteUrl),
      ogImagePath: orNull(draft.ogImagePath),
      socialLinks: draft.socialLinks.filter((link) => link.label.trim() && link.href.trim()),
      officeHours: draft.officeHours.filter((entry) => entry.label.trim() && entry.hours.trim()),
    };

    try {
      const saved = await saveSiteSettings(payload);
      const next = toDraft(saved);
      setDraft(next);
      setBaseline(next);
      guard.setDirty(false);
      toast.success('Business details saved. The website has been updated.');
    } catch (caught) {
      const formErrors = toFormErrors(caught);
      setErrors(formErrors);
      toast.error(formErrors.summary ?? 'Some of those details need another look.');
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading') return <LoadingState label="Loading your business details" variant="inline" />;

  if (status === 'error') {
    return (
      <ErrorState
        title="We could not load your business details"
        description={error?.message ?? 'Your website did not answer. Check your connection and try again.'}
        onRetry={reload}
      />
    );
  }

  const phoneMatchesCandidate =
    draft.phoneDisplay.trim() === phoneCandidate.display &&
    draft.phoneE164.trim() === phoneCandidate.e164;

  const updateHours = (index: number, patch: Partial<OfficeHours>) =>
    set(
      'officeHours',
      draft.officeHours.map((entry, i) => (i === index ? { ...entry, ...patch } : entry)),
    );

  const updateSocial = (index: number, patch: Partial<SocialLink>) =>
    set(
      'socialLinks',
      draft.socialLinks.map((link, i) => (i === index ? { ...link, ...patch } : link)),
    );

  return (
    <>
      <PageHeader
        title="Business details"
        lead="Your contact details, licensing and web address. Anything left blank is simply not shown anywhere on the website — nothing is ever guessed or filled in for you."
      />

      {errors.summary ? (
        <div className={styles.block}>
          <Notice tone="danger" title="That could not be saved">
            {errors.summary}
          </Notice>
        </div>
      ) : null}

      <div className={styles.block}>
        <ErrorSummary
          fields={errors.fields}
          labels={{
            businessName: 'Business name',
            tagline: 'Tagline',
            phoneDisplay: 'Phone number',
            phoneE164: 'Number for tap-to-call',
            email: 'Email address',
            addressLine1: 'Address line 1',
            addressLocality: 'Town or city',
            addressRegion: 'State',
            addressPostalCode: 'ZIP code',
            serviceAreaSummary: 'Coverage summary',
            licensing: 'Licensing',
            insurance: 'Insurance',
            foundedYear: 'Year the business started',
            siteUrl: 'Website address',
            ogImagePath: 'Sharing image',
            socialLinks: 'Social profiles',
            officeHours: 'Trading hours',
          }}
        />
      </div>

      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        {/* ---- Identity ------------------------------------------------- */}
        <Panel>
          <FormSection
            title="Name and tagline"
            description="Used in the page title, the footer and the information search engines hold about the business."
          >
            <TextInput
              label="Business name"
              name="businessName"
              maxLength={120}
              value={draft.businessName}
              error={errors.fields.businessName}
              hint="Leave blank to keep the built-in name, “Kellum’s Second Chance Renovations”."
              onChange={(event) => set('businessName', event.target.value)}
            />
            <TextInput
              label="Tagline"
              name="tagline"
              maxLength={200}
              value={draft.tagline}
              error={errors.fields.tagline}
              onChange={(event) => set('tagline', event.target.value)}
            />
          </FormSection>
        </Panel>

        {/* ---- Contact --------------------------------------------------- */}
        <Panel>
          <FormSection
            title="How customers reach you"
            description="Until a phone number is set there is no call button anywhere on the website — not in the header, not on the mobile bar, not on the contact page. That is deliberate: a wrong number is worse than none."
          >
            {!draft.phoneDisplay && !draft.phoneE164 ? (
              <Notice tone="warn" title="A number was read off your logo but never published">
                The supplied artwork prints <strong>{phoneCandidate.display}</strong> under “FREE
                ESTIMATES”. It was read from a picture, and one wrong digit would send every enquiry
                to a stranger — so nothing was published. Check the digits, then use the button
                below.
                <div className={styles.candidateAction}>
                  <button
                    type="button"
                    className={adminUi.secondaryButton}
                    onClick={() => {
                      set('phoneDisplay', phoneCandidate.display);
                      set('phoneE164', phoneCandidate.e164);
                    }}
                  >
                    Fill in {phoneCandidate.display}
                  </button>
                </div>
              </Notice>
            ) : null}

            <div className={styles.two}>
              <TextInput
                label="Phone number"
                name="phoneDisplay"
                maxLength={40}
                value={draft.phoneDisplay}
                error={errors.fields.phoneDisplay}
                hint="As you want it written, e.g. (513) 620-0130."
                onChange={(event) => set('phoneDisplay', event.target.value)}
              />
              <TextInput
                label="Number for tap-to-call"
                name="phoneE164"
                maxLength={16}
                value={draft.phoneE164}
                error={errors.fields.phoneE164}
                hint="The same number with the country code, e.g. +15136200130. This is what a tap-to-call link uses."
                onChange={(event) => set('phoneE164', event.target.value)}
              />
            </div>

            {phoneMatchesCandidate && !baseline.phoneDisplay ? (
              <Notice tone="info">
                Check these digits against something you know is right — a business card, an invoice
                — before saving.
              </Notice>
            ) : null}

            <TextInput
              label="Email address"
              name="email"
              type="email"
              maxLength={254}
              value={draft.email}
              error={errors.fields.email}
              hint="A monitored address that reaches a person."
              onChange={(event) => set('email', event.target.value)}
            />
          </FormSection>
        </Panel>

        {/* ---- Address --------------------------------------------------- */}
        <Panel>
          <FormSection
            title="Address"
            description="Plenty of renovation businesses work from a van and have no address to publish. Leave this blank if that is you — nothing on the site expects one."
          >
            <TextInput
              label="Address line 1"
              name="addressLine1"
              maxLength={200}
              value={draft.addressLine1}
              error={errors.fields.addressLine1}
              onChange={(event) => set('addressLine1', event.target.value)}
            />
            <TextInput
              label="Address line 2"
              name="addressLine2"
              maxLength={200}
              value={draft.addressLine2}
              error={errors.fields.addressLine2}
              onChange={(event) => set('addressLine2', event.target.value)}
            />
            <div className={styles.three}>
              <TextInput
                label="Town or city"
                name="addressLocality"
                maxLength={120}
                value={draft.addressLocality}
                error={errors.fields.addressLocality}
                onChange={(event) => set('addressLocality', event.target.value)}
              />
              <TextInput
                label="State"
                name="addressRegion"
                maxLength={80}
                value={draft.addressRegion}
                error={errors.fields.addressRegion}
                onChange={(event) => set('addressRegion', event.target.value)}
              />
              <TextInput
                label="ZIP code"
                name="addressPostalCode"
                maxLength={20}
                value={draft.addressPostalCode}
                error={errors.fields.addressPostalCode}
                onChange={(event) => set('addressPostalCode', event.target.value)}
              />
            </div>

            <Switch
              label="Publish this address on the website"
              description="Off by default. You can record an address here for your own reference without it appearing anywhere public."
              checked={draft.publishAddress}
              onChange={(checked) => set('publishAddress', checked)}
              activeNote="The address will appear in the footer, on the contact page, and in the information search engines hold about the business."
            />
          </FormSection>
        </Panel>

        {/* ---- Credentials ----------------------------------------------- */}
        <Panel>
          <FormSection
            title="Licensing and insurance"
            description="Write only what is exactly true, in your own words. These are legal claims — this application will never phrase one for you, and both are omitted entirely while blank."
          >
            <TextInput
              label="Licensing"
              name="licensing"
              maxLength={300}
              value={draft.licensing}
              error={errors.fields.licensing}
              hint="e.g. “Ohio registered contractor #123456”. Copy the wording from the document itself."
              onChange={(event) => set('licensing', event.target.value)}
            />
            <TextInput
              label="Insurance"
              name="insurance"
              maxLength={300}
              value={draft.insurance}
              error={errors.fields.insurance}
              hint="e.g. “Fully insured — certificate available on request”."
              onChange={(event) => set('insurance', event.target.value)}
            />
            <TextInput
              label="Year the business started"
              name="foundedYear"
              type="number"
              min={1900}
              max={2200}
              value={draft.foundedYear}
              error={errors.fields.foundedYear}
              hint="Powers “serving homeowners since …”. Leave blank rather than approximating."
              onChange={(event) => set('foundedYear', event.target.value)}
            />
          </FormSection>
        </Panel>

        {/* ---- Coverage --------------------------------------------------- */}
        <Panel>
          <FormSection
            title="Where you work"
            description="A short line for the footer and the About page. The actual list of towns is managed under Service areas."
          >
            <TextArea
              label="Coverage summary"
              name="serviceAreaSummary"
              rows={2}
              maxLength={400}
              showCount
              value={draft.serviceAreaSummary}
              error={errors.fields.serviceAreaSummary}
              onChange={(event) => set('serviceAreaSummary', event.target.value)}
            />
          </FormSection>
        </Panel>

        {/* ---- Hours ------------------------------------------------------ */}
        <Panel>
          <FormSection
            title="When you are reachable"
            description="Nothing is filled in for you here. Until you add a line, the website shows no hours at all — which is the honest answer, and better than a time somebody might turn up on."
          >
            {draft.officeHours.length === 0 ? (
              <Notice tone="info">
                No hours are published. The footer and contact page simply leave the section out.
              </Notice>
            ) : (
              <ul className={styles.hoursList}>
                {draft.officeHours.map((entry, index) => (
                  <li key={index} className={styles.hoursRow}>
                    <TextInput
                      label="Days"
                      name={`hoursLabel${index}`}
                      maxLength={60}
                      value={entry.label}
                      placeholder="Monday – Friday"
                      onChange={(event) => updateHours(index, { label: event.target.value })}
                    />
                    <TextInput
                      label="Hours"
                      name={`hoursValue${index}`}
                      maxLength={80}
                      value={entry.hours}
                      placeholder="7:00 AM – 5:00 PM"
                      onChange={(event) => updateHours(index, { hours: event.target.value })}
                    />
                    <button
                      type="button"
                      className={adminUi.ghostButton}
                      onClick={() =>
                        set(
                          'officeHours',
                          draft.officeHours.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      <span className="u-visually-hidden">
                        Remove the {entry.label || 'blank'} line
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {draft.officeHours.length < 10 ? (
              <button
                type="button"
                className={adminUi.secondaryButton}
                onClick={() => set('officeHours', [...draft.officeHours, { label: '', hours: '' }])}
              >
                <Plus size={15} aria-hidden="true" />
                Add a line
              </button>
            ) : null}
          </FormSection>
        </Panel>

        {/* ---- Web ------------------------------------------------------- */}
        <Panel>
          <FormSection
            title="Web address and sharing"
            description="These control what search engines index and what people see when your link is shared."
          >
            <TextInput
              label="Website address"
              name="siteUrl"
              type="url"
              maxLength={200}
              value={draft.siteUrl}
              error={errors.fields.siteUrl}
              hint="The full live address, starting with https://. Every canonical link and sharing URL is built from this, so a wrong value here misdirects your whole site."
              onChange={(event) => set('siteUrl', event.target.value)}
            />

            <TextInput
              label="Sharing image"
              name="ogImagePath"
              maxLength={300}
              value={draft.ogImagePath}
              error={errors.fields.ogImagePath}
              hint="Path to a 1200×630 PNG or JPG, e.g. /brand/social-card.png. Not an SVG — Facebook and iMessage will not render one."
              onChange={(event) => set('ogImagePath', event.target.value)}
            />

            {!draft.ogImagePath ? (
              <Notice tone="info">
                With no sharing image the site sends a clean text-only preview rather than a broken
                picture — which is better than a card that fails to load.
              </Notice>
            ) : null}

            {/*
              Uploading is the path most people will use. The path field above
              stays for anyone who already has artwork sitting in the site's
              own folders and would rather point at it.
            */}
            <ImageUploadField
              label="Upload a sharing card"
              description="This is the picture people see when a link to the site is shared in a message, on Facebook or on LinkedIn."
              requireAltText={false}
              current={
                draft.ogImagePath
                  ? {
                      src: draft.ogImagePath,
                      width: socialSize?.width ?? 1200,
                      height: socialSize?.height ?? 630,
                      alt: 'The current sharing card',
                    }
                  : null
              }
              guidance="1200 × 630 works everywhere. PNG or JPG only — no platform renders an SVG preview, so one would show as a blank card."
              warn={(image) => {
                if (!socialSize) return null;
                const ratio = image.width / image.height;
                return ratio < 1.7 || ratio > 2.1
                  ? `That image is ${image.width}×${image.height}. Sharing cards are cropped to roughly 1.91:1, so the top and bottom of this one will be cut off.`
                  : null;
              }}
              onUpload={async (file) => {
                const uploaded = await uploadSocialImage(file);
                setSocialSize({ width: uploaded.width, height: uploaded.height });
                // Saved immediately by the upload, so both copies have to agree.
                setDraft((current) => ({ ...current, ogImagePath: uploaded.src }));
                setBaseline((current) => ({ ...current, ogImagePath: uploaded.src }));
                toast.success('Sharing card updated.');
                return uploaded;
              }}
            />
          </FormSection>

          <FormSection
            title="Social profiles"
            description="Only add profiles that exist and are yours. Each one appears in the footer and is declared to search engines as an official account."
          >
            {draft.socialLinks.length === 0 ? (
              <p className={styles.quiet}>No profiles added. The footer shows nothing at all.</p>
            ) : (
              <ul className={styles.socialList}>
                {draft.socialLinks.map((link, index) => (
                  <li key={index} className={styles.socialRow}>
                    <TextInput
                      label="Label"
                      name={`socialLabel${index}`}
                      maxLength={60}
                      value={link.label}
                      onChange={(event) => updateSocial(index, { label: event.target.value })}
                    />
                    <TextInput
                      label="Address"
                      name={`socialHref${index}`}
                      type="url"
                      maxLength={300}
                      value={link.href}
                      onChange={(event) => updateSocial(index, { href: event.target.value })}
                    />
                    <label className={styles.socialIcon}>
                      <span className={styles.socialIconLabel}>Icon</span>
                      <select
                        className={styles.select}
                        value={link.icon}
                        onChange={(event) => updateSocial(index, { icon: event.target.value })}
                      >
                        {SOCIAL_ICONS.map((icon) => (
                          <option key={icon} value={icon}>
                            {icon}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      className={adminUi.ghostButton}
                      onClick={() =>
                        set(
                          'socialLinks',
                          draft.socialLinks.filter((_, i) => i !== index),
                        )
                      }
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      <span className="u-visually-hidden">Remove {link.label || 'this profile'}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {errors.fields.socialLinks ? (
              <p className={styles.fieldError}>{errors.fields.socialLinks}</p>
            ) : null}

            {draft.socialLinks.length < 8 ? (
              <button
                type="button"
                className={adminUi.secondaryButton}
                onClick={() =>
                  set('socialLinks', [
                    ...draft.socialLinks,
                    { label: '', href: '', icon: 'facebook' },
                  ])
                }
              >
                <Plus size={15} aria-hidden="true" />
                Add a profile
              </button>
            ) : null}
          </FormSection>
        </Panel>

        <SaveBar
          dirty={dirty}
          saving={saving}
          onSave={() => void save()}
          onCancel={dirty ? () => setDraft(baseline) : undefined}
          status={
            dirty
              ? 'You have unsaved changes. Nothing on the website has changed yet.'
              : 'Everything is saved and live on the website.'
          }
        />
      </form>
    </>
  );
}

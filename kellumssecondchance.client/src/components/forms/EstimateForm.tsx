import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Send } from 'lucide-react';
import styles from './EstimateForm.module.css';
import {
  ChoiceGrid,
  Honeypot,
  Select,
  TextArea,
  TextInput,
} from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import {
  budgetOptions,
  contactMethodOptions,
  initialEstimateForm,
  propertyTypeOptions,
  referralOptions,
  timelineOptions,
  toPayload,
  validateAll,
  validateField,
  validateStep,
} from './estimateFormModel';
import type { EstimateFormState, FieldErrors } from './estimateFormModel';
import { submitEstimateRequest } from '@/lib/api/endpoints';
import { ApiError } from '@/lib/api/client';
import { useAsync } from '@/lib/hooks/useAsync';
import { getServices } from '@/lib/api/endpoints';
import { useSiteContent } from '@/lib/siteContentContext';
import { cn } from '@/lib/cn';
import type { EstimateRequestResult } from '@/lib/api/types';
import { trackEvent } from '@/lib/analytics';

const STEPS = [
  { title: 'What needs a second chance?', hint: 'Pick everything that applies.' },
  { title: 'Tell us about the property.', hint: 'So we know what we are walking into.' },
  { title: 'What are you envisioning?', hint: 'Timing and budget, honestly.' },
  { title: 'How should we reach you?', hint: 'Last step — then it is with us.' },
] as const;

/** Anything faster than this was almost certainly not typed by a person. */
const MIN_HUMAN_FILL_MS = 3000;

export function EstimateForm() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<EstimateFormState>(initialEstimateForm);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<EstimateRequestResult | null>(null);

  // Stamped on mount rather than during render: reading the clock while
  // rendering is impure and would differ between the two Strict Mode passes.
  const startedAt = useRef<number>(0);
  const stepHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const errorSummaryRef = useRef<HTMLDivElement | null>(null);
  const shouldFocusStep = useRef(false);

  const { phone, email } = useSiteContent();
  const servicesLoader = useCallback((signal: AbortSignal) => getServices(signal), []);
  const services = useAsync(servicesLoader);

  const set = useCallback(<K extends keyof EstimateFormState>(key: K, value: EstimateFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    // Clear a field's error as soon as the visitor edits it.
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }, []);

  const blur = useCallback(
    (key: keyof EstimateFormState) => {
      setForm((current) => {
        const message = validateField(key, current);
        setErrors((existing) => (message ? { ...existing, [key]: message } : existing));
        return current;
      });
    },
    [],
  );

  useEffect(() => {
    startedAt.current = Date.now();
  }, []);

  // Move focus to the new step heading so keyboard/screen-reader users follow along.
  useEffect(() => {
    if (!shouldFocusStep.current) return;
    shouldFocusStep.current = false;
    stepHeadingRef.current?.focus();
  }, [step]);

  const goNext = () => {
    const stepErrors = validateStep(step, form);
    if (Object.keys(stepErrors).length > 0) {
      setErrors((current) => ({ ...current, ...stepErrors }));
      window.requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return;
    }
    shouldFocusStep.current = true;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => {
    shouldFocusStep.current = true;
    setStep((s) => Math.max(s - 1, 0));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    const allErrors = validateAll(form);
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      // Send the visitor back to the first step that has a problem.
      const firstBadStep = [0, 1, 2, 3].find(
        (index) => Object.keys(validateStep(index, form)).length > 0,
      );
      if (firstBadStep !== undefined && firstBadStep !== step) {
        shouldFocusStep.current = true;
        setStep(firstBadStep);
      }
      window.requestAnimationFrame(() => errorSummaryRef.current?.focus());
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const elapsedMs = startedAt.current > 0 ? Date.now() - startedAt.current : 0;
      const payload = toPayload(form, elapsedMs);
      const response = await submitEstimateRequest(payload);
      setResult(response);
      trackEvent('estimate_form_submitted');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      if (error instanceof ApiError) {
        // Server-side validation wins: show its messages against our fields.
        if (Object.keys(error.fieldErrors).length > 0) {
          const serverErrors: FieldErrors = {};
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            if (field in initialEstimateForm && messages.length > 0) {
              serverErrors[field as keyof EstimateFormState] = messages[0];
            }
          }
          setErrors(serverErrors);
          setSubmitError(
            Object.keys(serverErrors).length > 0
              ? 'A couple of details need another look — we have marked them below.'
              : error.message,
          );
        } else if (error.isRateLimited) {
          setSubmitError(
            'That is a few submissions in quick succession. Give it a minute and try again — or call us instead.',
          );
        } else {
          setSubmitError(error.message);
        }
      } else {
        setSubmitError('We could not send that. Please check your connection and try again.');
      }
      window.requestAnimationFrame(() => errorSummaryRef.current?.focus());
    } finally {
      setSubmitting(false);
    }
  };

  /* ---- Success ---------------------------------------------------------- */
  if (result) {
    return (
      <div className={styles.success} role="status">
        <span className={styles.successIcon} aria-hidden="true">
          <CheckCircle2 size={30} strokeWidth={1.5} />
        </span>
        <h2 className={styles.successTitle}>Your project is officially on our radar.</h2>
        <p className={styles.successBody}>{result.message}</p>

        <dl className={styles.successMeta}>
          <div>
            <dt>Your reference</dt>
            <dd className={styles.reference}>{result.reference}</dd>
          </div>
        </dl>

        <p className={styles.successNote}>
          Keep that reference handy — quoting it saves time if you get in touch before we do.
        </p>

        <div className={styles.successActions}>
          <Button as="link" to="/projects" variant="secondary">
            Look through our work
          </Button>
          {phone ? (
            <Button as="a" href={phone.href} variant="link">
              Or call {phone.display}
            </Button>
          ) : email ? (
            <Button as="a" href={`mailto:${email}`} variant="link">
              Or email {email}
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  const errorList = Object.entries(errors).filter(([, message]) => Boolean(message));
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {/* ---- Progress ------------------------------------------------------ */}
      <div className={styles.progress}>
        <ol className={styles.stepList}>
          {STEPS.map((item, index) => (
            <li
              key={item.title}
              className={cn(
                styles.stepChip,
                index === step && styles.stepChipActive,
                index < step && styles.stepChipDone,
              )}
            >
              <span className={styles.stepChipNumber}>{String(index + 1).padStart(2, '0')}</span>
              <span className={styles.stepChipLabel}>{item.title}</span>
            </li>
          ))}
        </ol>
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEPS.length}
          aria-valuenow={step + 1}
          aria-valuetext={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step].title}`}
        >
          <span className={styles.progressFill} style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* ---- Step heading -------------------------------------------------- */}
      <div className={styles.stepHeader}>
        <p className={styles.stepCounter}>
          Step {step + 1} of {STEPS.length}
        </p>
        <h2 className={styles.stepTitle} ref={stepHeadingRef} tabIndex={-1}>
          {STEPS[step].title}
        </h2>
        <p className={styles.stepHint}>{STEPS[step].hint}</p>
      </div>

      {/* ---- Error summary -------------------------------------------------- */}
      {submitError || errorList.length > 0 ? (
        <div
          className={styles.errorSummary}
          role="alert"
          tabIndex={-1}
          ref={errorSummaryRef}
        >
          <p className={styles.errorSummaryTitle}>
            {submitError ?? 'A few things still need filling in.'}
          </p>
          {errorList.length > 0 ? (
            <ul className={styles.errorSummaryList}>
              {errorList.map(([field, message]) => (
                <li key={field}>{message}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {/* ---- Step 1: project type ------------------------------------------ */}
      <div className={styles.step} hidden={step !== 0}>
        <ChoiceGrid
          legend="What kind of work are you thinking about?"
          name="projectTypeSlugs"
          multiple
          required
          columns={2}
          hint="Choose as many as apply. Not sure? Pick the closest and tell us more below."
          options={(services.data ?? []).map((service) => ({
            value: service.slug,
            label: service.name,
            description: service.tagline,
            icon: <Icon name={service.icon} size={17} strokeWidth={1.7} />,
          }))}
          value={form.projectTypeSlugs}
          onChange={(value) => set('projectTypeSlugs', [...value])}
          error={errors.projectTypeSlugs}
        />

        <TextArea
          label="Tell us what you are picturing"
          name="description"
          required
          rows={6}
          maxLength={4000}
          showCount
          hint="What is wrong with the space now, what you would like it to be, anything you have already tried. There is no wrong amount of detail."
          placeholder="Tell us what is happening with your home’s exterior, what you would like changed, and anything else that may help us understand the project."
          value={form.description}
          onChange={(event) => set('description', event.target.value)}
          onBlur={() => blur('description')}
          error={errors.description}
        />
      </div>

      {/* ---- Step 2: property ---------------------------------------------- */}
      <div className={styles.step} hidden={step !== 1}>
        <ChoiceGrid
          legend="What kind of property is it?"
          name="propertyType"
          required
          columns={3}
          options={propertyTypeOptions.map((o) => ({ value: o.value, label: o.label }))}
          value={form.propertyType ? [form.propertyType] : []}
          onChange={(value) => set('propertyType', (value[0] ?? '') as EstimateFormState['propertyType'])}
          error={errors.propertyType}
        />

        <div className={styles.row}>
          <TextInput
            label="ZIP or postal code"
            name="postalCode"
            required
            inputMode="text"
            autoComplete="postal-code"
            maxLength={12}
            hint="So we can check we cover your area."
            value={form.postalCode}
            onChange={(event) => set('postalCode', event.target.value)}
            onBlur={() => blur('postalCode')}
            error={errors.postalCode}
          />
          <TextInput
            label="City or town"
            name="city"
            autoComplete="address-level2"
            maxLength={120}
            value={form.city}
            onChange={(event) => set('city', event.target.value)}
            onBlur={() => blur('city')}
            error={errors.city}
          />
        </div>

        <TextInput
          label="Street address"
          name="addressLine"
          autoComplete="street-address"
          maxLength={250}
          hint="Only if you are comfortable sharing it now — we will confirm before any visit."
          value={form.addressLine}
          onChange={(event) => set('addressLine', event.target.value)}
          onBlur={() => blur('addressLine')}
          error={errors.addressLine}
        />
      </div>

      {/* ---- Step 3: timeline and budget ------------------------------------ */}
      <div className={styles.step} hidden={step !== 2}>
        <ChoiceGrid
          legend="When would you like this done?"
          name="timeline"
          required
          columns={2}
          options={timelineOptions.map((o) => ({
            value: o.value,
            label: o.label,
            description: o.description,
          }))}
          value={form.timeline ? [form.timeline] : []}
          onChange={(value) => set('timeline', (value[0] ?? '') as EstimateFormState['timeline'])}
          error={errors.timeline}
        />

        <ChoiceGrid
          legend="Rough budget range"
          name="budgetRange"
          required
          columns={2}
          hint="Sharing a range is not a commitment. It lets us tell you early whether the scope and the number line up — which saves everyone time."
          options={budgetOptions.map((o) => ({
            value: o.value,
            label: o.label,
            description: o.description,
          }))}
          value={form.budgetRange ? [form.budgetRange] : []}
          onChange={(value) => set('budgetRange', (value[0] ?? '') as EstimateFormState['budgetRange'])}
          error={errors.budgetRange}
        />
      </div>

      {/* ---- Step 4: contact ------------------------------------------------ */}
      <div className={styles.step} hidden={step !== 3}>
        <div className={styles.row}>
          <TextInput
            label="First name"
            name="firstName"
            required
            autoComplete="given-name"
            maxLength={80}
            value={form.firstName}
            onChange={(event) => set('firstName', event.target.value)}
            onBlur={() => blur('firstName')}
            error={errors.firstName}
          />
          <TextInput
            label="Last name"
            name="lastName"
            required
            autoComplete="family-name"
            maxLength={80}
            value={form.lastName}
            onChange={(event) => set('lastName', event.target.value)}
            onBlur={() => blur('lastName')}
            error={errors.lastName}
          />
        </div>

        <div className={styles.row}>
          <TextInput
            label="Email"
            name="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            maxLength={254}
            value={form.email}
            onChange={(event) => set('email', event.target.value)}
            onBlur={() => blur('email')}
            error={errors.email}
          />
          <TextInput
            label="Phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            inputMode="tel"
            maxLength={20}
            value={form.phone}
            onChange={(event) => set('phone', event.target.value)}
            onBlur={() => blur('phone')}
            error={errors.phone}
          />
        </div>

        <ChoiceGrid
          legend="How would you rather we get back to you?"
          name="preferredContactMethod"
          columns={2}
          options={contactMethodOptions.map((o) => ({ value: o.value, label: o.label }))}
          value={[form.preferredContactMethod]}
          onChange={(value) =>
            set(
              'preferredContactMethod',
              (value[0] ?? 'NoPreference') as EstimateFormState['preferredContactMethod'],
            )
          }
        />

        <Select
          label="How did you hear about us?"
          name="referralSource"
          options={referralOptions}
          value={form.referralSource}
          onChange={(event) => set('referralSource', event.target.value)}
        />

        <p className={styles.privacyNote}>
          We use these details to reply to your enquiry and nothing else. We do not sell or share
          them. See our <Link to="/privacy">privacy notice</Link>.
        </p>
      </div>

      <Honeypot value={form.companyWebsite} onChange={(value) => set('companyWebsite', value)} />

      {/* ---- Navigation ------------------------------------------------------ */}
      <div className={styles.actions}>
        {step > 0 ? (
          <Button type="button" variant="secondary" size="lg" onClick={goBack} iconLeft={<ArrowLeft size={17} />}>
            Back
          </Button>
        ) : (
          <span />
        )}

        {step < STEPS.length - 1 ? (
          <Button type="button" size="lg" onClick={goNext} iconRight={<ArrowRight size={17} />}>
            Continue
          </Button>
        ) : (
          <Button
            type="submit"
            size="lg"
            loading={submitting}
            loadingLabel="Sending your project…"
            iconRight={<Send size={17} />}
          >
            Send my project
          </Button>
        )}
      </div>

      <p className={styles.timeNote}>
        {step < STEPS.length - 1
          ? 'About two minutes left.'
          : 'That is everything. Nothing is sent until you press the button.'}
      </p>

      {/* Guards against instant machine submissions without affecting people. */}
      <input type="hidden" name="minFillMs" value={MIN_HUMAN_FILL_MS} readOnly />
    </form>
  );
}

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { useId } from 'react';
import { AlertCircle } from 'lucide-react';
import styles from './FormField.module.css';
import { cn } from '@/lib/cn';

interface FieldShellProps {
  label: string;
  /** Field name — also used to look up server-side validation messages. */
  name: string;
  hint?: ReactNode;
  error?: string | undefined;
  required?: boolean;
  optionalLabel?: boolean;
  className?: string;
  children: (props: {
    id: string;
    describedBy: string | undefined;
    invalid: boolean;
  }) => ReactNode;
}

/**
 * Label + hint + error wrapper.
 *
 * The control is always associated with its label by id, `aria-describedby`
 * covers both hint and error text, and `aria-invalid` flips with the error so
 * assistive tech announces the failure without a live-region hack.
 */
export function FormField({
  label,
  name,
  hint,
  error,
  required = false,
  optionalLabel = true,
  className,
  children,
}: FieldShellProps) {
  const reactId = useId();
  const id = `${name}-${reactId}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn(styles.field, error && styles.hasError, className)}>
      <label className={styles.label} htmlFor={id}>
        <span>{label}</span>
        {required ? (
          <span className={styles.required} aria-hidden="true">
            *
          </span>
        ) : optionalLabel ? (
          <span className={styles.optional}>Optional</span>
        ) : null}
      </label>
      {hint ? (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      ) : null}
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error ? (
        <p className={styles.error} id={errorId}>
          <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ input */

type TextInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & {
  label: string;
  name: string;
  hint?: ReactNode;
  error?: string | undefined;
  className?: string;
  /** Set false to suppress the "Optional" marker on a non-required field. */
  optionalLabel?: boolean;
};

export function TextInput({
  label,
  name,
  hint,
  error,
  className,
  required,
  optionalLabel = true,
  ...rest
}: TextInputProps) {
  return (
    <FormField
      label={label}
      name={name}
      hint={hint}
      error={error}
      required={required}
      optionalLabel={optionalLabel}
      className={className}
    >
      {({ id, describedBy, invalid }) => (
        <input
          {...rest}
          id={id}
          name={name}
          required={required}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={styles.input}
        />
      )}
    </FormField>
  );
}

/* --------------------------------------------------------------- textarea */

type TextAreaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> & {
  label: string;
  name: string;
  hint?: ReactNode;
  error?: string | undefined;
  className?: string;
  /** Shows a live character counter against `maxLength`. */
  showCount?: boolean;
  value?: string;
};

export function TextArea({
  label,
  name,
  hint,
  error,
  className,
  required,
  showCount,
  maxLength,
  value,
  ...rest
}: TextAreaProps) {
  const used = typeof value === 'string' ? value.length : 0;
  return (
    <FormField label={label} name={name} hint={hint} error={error} required={required} className={className}>
      {({ id, describedBy, invalid }) => (
        <>
          <textarea
            {...rest}
            value={value}
            maxLength={maxLength}
            id={id}
            name={name}
            required={required}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={cn(styles.input, styles.textarea)}
          />
          {showCount && maxLength ? (
            <p className={styles.count} aria-hidden="true">
              {used} / {maxLength}
            </p>
          ) : null}
        </>
      )}
    </FormField>
  );
}

/* ----------------------------------------------------------------- select */

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> & {
  label: string;
  name: string;
  hint?: ReactNode;
  error?: string | undefined;
  className?: string;
  options: readonly { readonly value: string; readonly label: string }[];
  placeholder?: string;
};

export function Select({
  label,
  name,
  hint,
  error,
  className,
  required,
  options,
  placeholder,
  ...rest
}: SelectProps) {
  return (
    <FormField label={label} name={name} hint={hint} error={error} required={required} className={className}>
      {({ id, describedBy, invalid }) => (
        <div className={styles.selectWrap}>
          <select
            {...rest}
            id={id}
            name={name}
            required={required}
            aria-describedby={describedBy}
            aria-invalid={invalid || undefined}
            className={cn(styles.input, styles.select)}
          >
            {placeholder ? (
              <option value="" disabled>
                {placeholder}
              </option>
            ) : null}
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <svg className={styles.chevron} width="12" height="8" viewBox="0 0 12 8" aria-hidden="true">
            <path d="M1 1.5 6 6.5 11 1.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </FormField>
  );
}

/* ------------------------------------------------------------ choice grid */

export interface ChoiceOption {
  readonly value: string;
  readonly label: string;
  readonly description?: string;
  readonly icon?: ReactNode;
}

interface ChoiceGridProps {
  legend: string;
  name: string;
  options: readonly ChoiceOption[];
  value: readonly string[];
  onChange: (value: readonly string[]) => void;
  multiple?: boolean;
  error?: string | undefined;
  hint?: ReactNode;
  required?: boolean;
  columns?: 1 | 2 | 3;
  className?: string;
}

/**
 * Card-style radio / checkbox group.
 *
 * Built on real inputs inside a fieldset so it is keyboard- and
 * screen-reader-native; the card look is styling on top of standard controls,
 * not a div pretending to be one.
 */
export function ChoiceGrid({
  legend,
  name,
  options,
  value,
  onChange,
  multiple = false,
  error,
  hint,
  required = false,
  columns = 2,
  className,
}: ChoiceGridProps) {
  const reactId = useId();
  const hintId = hint ? `${name}-${reactId}-hint` : undefined;
  const errorId = error ? `${name}-${reactId}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  const toggle = (optionValue: string) => {
    if (!multiple) {
      onChange([optionValue]);
      return;
    }
    onChange(
      value.includes(optionValue)
        ? value.filter((v) => v !== optionValue)
        : [...value, optionValue],
    );
  };

  return (
    <fieldset
      className={cn(styles.fieldset, error && styles.hasError, className)}
      aria-describedby={describedBy}
      aria-invalid={error ? true : undefined}
    >
      <legend className={styles.legend}>
        <span>{legend}</span>
        {required ? (
          <span className={styles.required} aria-hidden="true">
            *
          </span>
        ) : null}
      </legend>
      {hint ? (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      ) : null}
      <div className={cn(styles.choices, styles[`cols${columns}`])}>
        {options.map((option) => {
          const checked = value.includes(option.value);
          return (
            <label
              key={option.value}
              className={cn(styles.choice, checked && styles.choiceChecked)}
            >
              <input
                type={multiple ? 'checkbox' : 'radio'}
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => toggle(option.value)}
                className={styles.choiceInput}
              />
              <span className={styles.choiceMarker} aria-hidden="true" />
              <span className={styles.choiceBody}>
                <span className={styles.choiceLabel}>
                  {option.icon ? (
                    <span className={styles.choiceIcon} aria-hidden="true">
                      {option.icon}
                    </span>
                  ) : null}
                  {option.label}
                </span>
                {option.description ? (
                  <span className={styles.choiceDescription}>{option.description}</span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
      {error ? (
        <p className={styles.error} id={errorId}>
          <AlertCircle size={14} strokeWidth={2} aria-hidden="true" />
          <span>{error}</span>
        </p>
      ) : null}
    </fieldset>
  );
}

/* --------------------------------------------------------------- honeypot */

interface HoneypotProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Bot trap.
 *
 * Hidden from sighted users AND from screen readers (aria-hidden + tabIndex -1),
 * so no real visitor can fill it in. The server rejects any submission where it
 * carries a value. Deliberately named to look like a field a bot would want.
 */
export function Honeypot({ value, onChange }: HoneypotProps) {
  return (
    <div className={styles.honeypot} aria-hidden="true">
      <label htmlFor="company-website-field">Company website</label>
      <input
        id="company-website-field"
        name="companyWebsite"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

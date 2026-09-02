import { Link } from 'react-router-dom';
import { ArrowUpRight, Mail, MapPin, Phone } from 'lucide-react';
import styles from './Footer.module.css';
import { Logo } from '@/components/brand/Logo';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { isProvided } from '@/content/business';
import { footerNav, footerServiceLinks, legalNav } from '@/content/navigation';
import { useSiteContent } from '@/lib/siteContentContext';

export function Footer() {
  const { phone, email, content, address, site } = useSiteContent();
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer} data-theme="dark">
      <Container width="wide">
        <div className={styles.top}>
          <div className={styles.brandBlock}>
            <Logo size={92} tone="onDark" className={styles.footerLogo} />
            <p className={styles.footerTagline}>{site.tagline}</p>
            <p className={styles.pitch}>We believe in what a home can become—and what a person can become. Craftsmanship with purpose, built for what comes next.</p>
            <Button as="link" to="/request-estimate" iconRight={<ArrowUpRight size={17} />}>
              Give Your Home Its Second Chance
            </Button>
          </div>

          <div className={styles.columns}>
            {footerNav.map((group) => (
              <nav className={styles.column} key={group.title} aria-label={group.title}>
                <h2 className={styles.columnTitle}>{group.title}</h2>
                <ul className={styles.columnList}>
                  {group.items.map((item) => (
                    <li key={item.to}>
                      <Link className={styles.columnLink} to={item.to}>
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}

            <nav className={styles.column} aria-label="Services">
              <h2 className={styles.columnTitle}>Services</h2>
              <ul className={styles.columnList}>
                {footerServiceLinks.map((service) => (
                  <li key={service.to}>
                    <Link className={styles.columnLink} to={service.to}>
                      {service.label}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link className={styles.columnLinkAll} to="/services">
                    All services
                  </Link>
                </li>
              </ul>
            </nav>

            <div className={styles.column}>
              <h2 className={styles.columnTitle}>Get in Touch</h2>
              <ul className={styles.contactList}>
                {phone ? (
                  <li>
                    <a className={styles.contactLink} href={phone.href}>
                      <Phone size={15} strokeWidth={1.9} aria-hidden="true" />
                      <span>{phone.display}</span>
                    </a>
                  </li>
                ) : null}
                {email ? (
                  <li>
                    <a className={styles.contactLink} href={`mailto:${email}`}>
                      <Mail size={15} strokeWidth={1.9} aria-hidden="true" />
                      <span>{email}</span>
                    </a>
                  </li>
                ) : null}
                {address ? (
                  <li>
                    <p className={styles.contactText}>
                      <MapPin size={15} strokeWidth={1.9} aria-hidden="true" />
                      <span className={styles.address}>
                        {address.lines.map((line) => (
                          <span key={line}>{line}</span>
                        ))}
                      </span>
                    </p>
                  </li>
                ) : null}
                {!phone && !email ? (
                  <li>
                    <p className={styles.contactText}>
                      <Mail size={15} strokeWidth={1.9} aria-hidden="true" />
                      <span>
                        Send us your project through the{' '}
                        <Link to="/request-estimate" className={styles.inlineLink}>
                          estimate form
                        </Link>{' '}
                        and we will come back to you.
                      </span>
                    </p>
                  </li>
                ) : null}
                <li>
                  <Link className={styles.contactLink} to="/service-area">
                    <MapPin size={15} strokeWidth={1.9} aria-hidden="true" />
                    <span>Where we work</span>
                  </Link>
                </li>
              </ul>

              {/*
                Hours appear only once somebody has entered them. Printing
                invented opening times is how a homeowner ends up outside a
                locked door on a Saturday morning.
              */}
              {content.officeHours.length > 0 ? (
                <>
                  <h2 className={styles.columnTitle}>Hours</h2>
                  <ul className={styles.hoursList}>
                    {content.officeHours.map((entry) => (
                      <li key={entry.label}>
                        <span className={styles.hoursLabel}>{entry.label}</span>
                        <span className={styles.hoursValue}>{entry.hours}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}

              {content.socialLinks.length > 0 ? (
                <ul className={styles.social}>
                  {content.socialLinks.map((link) => (
                    <li key={link.href}>
                      <a
                        className={styles.socialLink}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer me"
                      >
                        {link.label}
                        <ArrowUpRight size={13} aria-hidden="true" />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </div>

        <div className={styles.bottom}>
          <p className={styles.copyright}>
            © {year} {site.legalName}. All rights reserved.
          </p>

          {/* Licence and insurance render only once the business supplies them. */}
          {isProvided(content.licensing) || isProvided(content.insurance) ? (
            <p className={styles.credentials}>
              {[content.licensing, content.insurance].filter(Boolean).join(' · ')}
            </p>
          ) : null}

          <ul className={styles.legal}>
            {legalNav.map((item) => (
              <li key={item.to}>
                <Link className={styles.legalLink} to={item.to}>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </footer>
  );
}

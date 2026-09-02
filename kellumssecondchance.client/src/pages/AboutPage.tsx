import { useMemo } from 'react';
import { ArrowUpRight } from 'lucide-react';
import styles from './AboutPage.module.css';
import { Seo } from '@/lib/seo/Seo';
import { breadcrumbSchema, graph, organizationSchema } from '@/lib/seo/structuredData';
import { PageHero } from '@/components/marketing/PageHero';
import { CtaSection } from '@/components/marketing/CtaSection';
import { WhyKellums } from '@/components/marketing/WhyKellums';
import { Container } from '@/components/ui/Container';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Photo } from '@/components/ui/Photo';
import { editorialMedia } from '@/content/media';
import { business, isProvided } from '@/content/business';
import { useSiteContent } from '@/lib/siteContentContext';

const CRUMBS = [
  { name: 'Home', path: '/' },
  { name: 'About', path: '/about' },
];


const EXPECTATIONS = [
  {
    title: 'A walkthrough, not a sales pitch',
    body: 'We look at the space, ask questions, and tell you what we find — including the things you did not ask about and the things we think can wait.',
  },
  {
    title: 'A written scope before anything starts',
    body: 'What is included, what is not, what happens if something unexpected turns up behind a wall. In writing, so nobody is relying on memory.',
  },
  {
    title: 'One person you actually talk to',
    body: 'Different trades come and go through a project. Who you call does not change, and you never have to explain your job twice.',
  },
  {
    title: 'A house you can still live in',
    body: 'Containment up, floors covered, tools stacked and the site swept at the end of every working day. It takes twenty minutes and it changes the whole experience.',
  },
  {
    title: 'The truth about the hard parts',
    body: 'Delays, surprises and things that cost more than we hoped get told to you on the day we find out. You will never learn about a problem from the invoice.',
  },
  {
    title: 'A finish you actually sign off',
    body: 'We walk it with you, build the punch list together, and finish it. Done means done to your satisfaction.',
  },
];

export default function AboutPage() {
  const { content, site } = useSiteContent();
  const structuredData = useMemo(
    () => graph(organizationSchema(site), breadcrumbSchema(site, CRUMBS)),
    [site],
  );

  return (
    <>
      <Seo
        title="About Kellum’s"
        description="Learn about Kellum’s exterior renovation, repair and restoration work in Cincinnati and the purpose behind the Second Chance name."
        path="/about"
        structuredData={structuredData}
      />

      <section className={styles.expect} aria-labelledby="what-is-kellums">
        <Container width="narrow">
          <Eyebrow>What is Kellum&rsquo;s?</Eyebrow>
          <h2 id="what-is-kellums" className={styles.h2}>An exterior renovation, repair and restoration company.</h2>
          <div className={styles.prose}>
            <p>Kellum&rsquo;s Second Chance Renovations works on residential exteriors in Cincinnati, Ohio. Homeowners can explore the active services and published projects on this site, then request an estimate for their own exterior project.</p>
            <p>The company&rsquo;s deeper mission includes making room for people who are ready to work, learn, grow and build what comes next. An expression of work interest is a preliminary enquiry, not a job offer or hiring guarantee.</p>
          </div>
        </Container>
      </section>

      <PageHero
        eyebrow="Who you would be working with"
        title="We believe in what comes next."
        lead={business.elevatorPitch}
        crumbs={CRUMBS}
        image={editorialMedia.about}
        layout="banner"
      />

      {/* ---- The name ----------------------------------------------------- */}
      <section className={styles.name} aria-labelledby="name-heading">
        <Container width="wide">
          <div className={styles.nameGrid}>
            <div className={styles.nameCopy}>
              <Eyebrow index="01">Why &ldquo;Second Chance&rdquo;</Eyebrow>
              <h2 id="name-heading" className={styles.h2} data-reveal>
                What something is today does not have to determine what it becomes tomorrow.
              </h2>
              <div className={styles.prose}>
                <p>
                  At Kellum’s, Second Chance is not just a name. We believe a home’s current
                  condition does not have to define its future.
                </p>
                <p>
                  Your house can be rebuilt. Your home can become somewhere a family loves again.
                </p>
                <p>
                  Separately, we believe people who are ready to work, learn and grow deserve to be
                  considered for real opportunity. That belief never guarantees a role, and it never
                  lowers the professional standard expected on a customer&rsquo;s home.
                </p>
                <p>
                  Neither kind of transformation happens on good intentions alone. It takes hard
                  work, patience, accountability and care for the details. That is what Second Chance
                  means here: seeing what could be, then doing the work to build it well.
                </p>
              </div>
              <blockquote className={styles.quote}>
                <span className={styles.quoteSeam} aria-hidden="true" />
                <p>
                  Homes deserve second chances. People do too.
                </p>
              </blockquote>
            </div>

            <div className={styles.nameMedia}>
              <Photo
                image={editorialMedia.aboutSecondChance}
                ratio="portrait"
                className={styles.namePhoto}
                objectPosition="center 48%"
                sizes="(min-width: 68rem) 34vw, 92vw"
              />
              <span className={styles.mediaPlaque} aria-hidden="true">
                <span>Second chances</span>
                are what we build
              </span>
            </div>
          </div>
        </Container>
      </section>

      <section className={styles.expect} aria-labelledby="manifesto-heading">
        <Container width="narrow">
          <Eyebrow index="02">What we believe</Eyebrow>
          <h2 id="manifesto-heading" className={styles.h2}>Second chances earn their meaning in the building.</h2>
          <div className={styles.prose}>
            <p>We believe what you see today is not always the whole story. An outdated house can become the place a family loves again. A person looking for an opportunity can become a skilled craftsperson, a trusted teammate and someone proud of what they have built.</p>
            <p>Neither transformation happens by wishing for it. It takes work. It takes patience, accountability and respect. It takes someone willing to see the potential—and someone willing to do something with the opportunity.</p>
            <p>That is what Second Chance means to us. We rebuild spaces with care. We make room for people to learn and grow. We hold everyone to a professional standard. And each day, we try to leave the work, the home and the future better than we found them.</p>
          </div>
        </Container>
      </section>

      {/* ---- Craftsmanship ------------------------------------------------ */}
      <section className={styles.craft} data-theme="dark" aria-labelledby="craft-heading">
        <span className={styles.craftGrid} aria-hidden="true" />
        <Container width="wide">
          <Eyebrow className={styles.craftEyebrow} index="02">
            Craftsmanship philosophy
          </Eyebrow>
          <h2 id="craft-heading" className={styles.craftTitle} data-reveal>
            The parts nobody photographs are the parts that decide everything.
          </h2>
          <div className={styles.craftGridBody}>
            <p>
              Anyone can make a home&rsquo;s exterior look good on the day it is finished. Flashing at a
              ledger, water managed behind siding, exterior joints fitted instead of caulked over —
              that work is invisible, permanent, and the difference
              between a renovation that lasts a decade and one that starts failing in eighteen months.
            </p>
            <p>
              It is also the work that is easiest to skip, because you will never know. We do not skip
              it. Not out of virtue — out of experience. We have been called in to fix enough of
              somebody else&rsquo;s shortcuts to know exactly where they show up.
            </p>
          </div>
        </Container>
      </section>

      {/* ---- Expectations ------------------------------------------------- */}
      <section className={styles.expect} aria-labelledby="expect-heading">
        <Container width="wide">
          <Eyebrow index="03">What homeowners can expect</Eyebrow>
          <h2 id="expect-heading" className={styles.h2} data-reveal>
            Six things you get every time.
          </h2>
          <ul className={styles.expectList}>
            {EXPECTATIONS.map((item, index) => (
              <li key={item.title} data-reveal style={{ ['--reveal-delay' as string]: `${(index % 3) * 80}ms` }}>
                <span className={styles.expectNumber} aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <h3 className={styles.expectTitle}>{item.title}</h3>
                <p className={styles.expectBody}>{item.body}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <WhyKellums eyebrowIndex="04" />

      {/* ---- Team & credentials ------------------------------------------- */}
      <section className={styles.team} aria-labelledby="team-heading">
        <Container width="narrow">
          <Eyebrow index="05">The people</Eyebrow>
          <h2 id="team-heading" className={styles.h2} data-reveal>
            Who is actually in your house.
          </h2>

          {/*
            NEEDS_BUSINESS_INPUT — owner biography, crew, years in business.

            Deliberately unwritten: inventing a founder's story on a page arguing
            for honesty would be self-defeating. The copy below is what the
            business can truthfully say TODAY, and it is written for a homeowner —
            not a "coming soon" apology and not a developer note. Replace it with
            the real story (and set `foundedYear`, `licensing` and `insurance` in
            src/content/business.ts) once the business supplies them.
          */}
          <div className={styles.people}>
            <p className={styles.peopleLead}>
              Renovation is unusual among trades: you are not buying a product, you are letting
              people into the place you sleep. So the honest answer to &ldquo;who are you?&rdquo;
              matters more than a list of certificates.
            </p>
            <p className={styles.peopleBody}>
              Ask us on the walkthrough. Ask who will be running your job, who to call when something
              comes up, and who will be in the house on a Tuesday. You will get names and straight
              answers — and if we bring in a licensed trade for electrical or plumbing, we will tell
              you who they are and why.
            </p>
            <p className={styles.peopleBody}>
              We would rather earn that trust in a conversation than claim it in a paragraph you have
              no way to check.
            </p>
          </div>

          {isProvided(content.licensing) || isProvided(content.insurance) || isProvided(content.foundedYear) ? (
            <dl className={styles.credentials}>
              {isProvided(content.foundedYear) ? (
                <div>
                  <dt>Serving homeowners since</dt>
                  <dd>{content.foundedYear}</dd>
                </div>
              ) : null}
              {isProvided(content.licensing) ? (
                <div>
                  <dt>Licensing</dt>
                  <dd>{content.licensing}</dd>
                </div>
              ) : null}
              {isProvided(content.insurance) ? (
                <div>
                  <dt>Insurance</dt>
                  <dd>{content.insurance}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          <div className={styles.areaBlock}>
            <h3 className={styles.areaTitle}>Where we work</h3>
            <p className={styles.areaBody}>
              {content.serviceAreaSummary ?? business.serviceAreaSummary}
            </p>
            <Button as="link" to="/service-area" variant="secondary" iconRight={<ArrowUpRight size={17} />}>
              Check your area
            </Button>
          </div>
        </Container>
      </section>

      <CtaSection />
    </>
  );
}

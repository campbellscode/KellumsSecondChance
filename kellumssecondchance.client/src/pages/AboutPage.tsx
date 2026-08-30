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
        description="Why we called it Second Chance, how we work, and what homeowners can expect when they let us into their house."
        path="/about"
        structuredData={structuredData}
      />

      <PageHero
        eyebrow="Who you would be working with"
        title="We are the people who take the room nobody wanted to touch."
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
                Because most rooms are not broken. They are just written off.
              </h2>
              <div className={styles.prose}>
                <p>
                  There is a moment in a lot of houses where a room quietly gets given up on. Nobody
                  decides it — the kitchen just becomes the kitchen you work around, the basement
                  becomes storage, the bathroom becomes something you apologise for. The house stops
                  being all yours.
                </p>
                <p>
                  Almost none of that is because a room is beyond saving. It is because looking at it
                  properly, working out what it could be, and doing that work well is genuinely hard —
                  and most people do not have a reason to believe it will go smoothly.
                </p>
                <p>
                  So we named the company after the thing we actually do. Not a remodel. Not a
                  refresh. A second chance for the part of your home you had stopped believing in.
                </p>
              </div>
              <blockquote className={styles.quote}>
                <span className={styles.quoteSeam} aria-hidden="true" />
                <p>
                  The best compliment we get is somebody saying they use a room they used to walk
                  past.
                </p>
              </blockquote>
            </div>

            <div className={styles.nameMedia} data-photo-zoom data-reveal>
              <Photo
                image={editorialMedia.storyPortrait}
                ratio="portrait"
                zoomOnHover
                sizes="(min-width: 68rem) 34vw, 92vw"
              />
              <span className={styles.mediaTick} aria-hidden="true" />
            </div>
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
              Anyone can make a room look good on the day it is finished. Blocking behind a grab bar,
              flashing at a ledger, a subfloor levelled before the tile goes down, a joint that is
              scribed instead of caulked over — that work is invisible, permanent, and the difference
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

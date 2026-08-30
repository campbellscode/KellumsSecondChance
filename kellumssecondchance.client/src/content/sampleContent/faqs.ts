import type { FaqItem } from '@/lib/api/types';

/**
 * ============================================================================
 *  FAQ CONTENT — EDITABLE BUSINESS CONTENT
 * ============================================================================
 *
 *  Answers here are deliberately written WITHOUT contractual or legal promises:
 *  no warranty periods, no guaranteed timelines, no licensing or insurance
 *  claims, no fixed pricing. Those are commitments only the business can make.
 *
 *  An answer that depends on an unset business policy is passed as `null` with a
 *  `reviewNote`. Those items are `needsReview` and are NOT published: they never
 *  reach the public FAQ or the FAQ structured data, and appear only in
 *  /admin/faqs. Publishing a plausible guess about deposits, fees or warranties
 *  would be exactly the kind of fabricated claim this site refuses to make.
 * ============================================================================
 */

export const faqCategories = [
  { slug: 'getting-started', name: 'Getting Started' },
  { slug: 'estimates', name: 'Estimates' },
  { slug: 'scheduling', name: 'Scheduling' },
  { slug: 'the-process', name: 'The Renovation Process' },
  { slug: 'living-in-the-home', name: 'Living in the Home During Work' },
  { slug: 'changes', name: 'Project Changes' },
  { slug: 'payments', name: 'Payments' },
  { slug: 'materials', name: 'Materials & Selections' },
  { slug: 'completion', name: 'Finishing Up' },
] as const;

let nextId = 0;

/**
 * @param answer      Pass null when there is no honest answer without a business
 *                    policy that has not been set yet.
 * @param reviewNote  What the business still has to decide. An item with a null
 *                    answer is `needsReview`: it is withheld from the public FAQ
 *                    AND from the FAQ structured data, exactly as a null phone
 *                    number is omitted rather than faked.
 */
function faq(
  categorySlug: string,
  question: string,
  answer: string | null,
  reviewNote?: string,
): FaqItem {
  nextId += 1;
  const category = faqCategories.find((c) => c.slug === categorySlug)?.name ?? 'General';
  return {
    id: nextId,
    question,
    answer: answer ?? '',
    category,
    categorySlug,
    displayOrder: nextId,
    needsReview: answer === null,
    reviewNote: reviewNote ?? null,
  };
}

export const sampleFaqs: readonly FaqItem[] = [
  /* ---- Getting Started ------------------------------------------------- */
  faq(
    'getting-started',
    'I am not sure what I actually want yet. Is it too early to call?',
    'No — that is genuinely one of the better times to call. A lot of our conversations start with "the kitchen is bad but I do not know what to do about it." Part of our job is walking the space and helping you separate what is possible from what is worth doing. You do not need a plan before you talk to us.',
  ),
  faq(
    'getting-started',
    'How do I know if my project is too small for you?',
    'Ask. Small, well-defined jobs are often the easiest thing to schedule, and plenty of larger projects started as a small one. If a project is not a fit for us, we will say so and, where we can, point you toward someone better suited.',
  ),
  faq(
    'getting-started',
    'Do you work on older homes?',
    'Yes. Older homes take more care — nothing is plumb, profiles are discontinued, and there is usually a previous repair to work around — but that is much of what renovation work is. We will tell you where an older house makes something harder or more expensive before you commit.',
  ),
  faq(
    'getting-started',
    'What information helps most on a first call?',
    'Roughly what room, roughly what is wrong with it, and roughly when you would like it done. Photos help enormously. If you already have a budget range in mind, sharing it early saves everyone time — it lets us tell you honestly whether the scope and the number line up.',
  ),

  /* ---- Estimates -------------------------------------------------------- */
  faq(
    'estimates',
    'What happens after I submit an estimate request?',
    'We read it, and we get back to you to arrange a time to see the space. Renovation work cannot be priced accurately from a form — we need to look at what is actually there. The form exists so that when we do speak, we already understand what you are trying to solve.',
  ),
  faq(
    'estimates',
    'Do you charge for an estimate?',
    null,
    'The supplied logo prints “FREE ESTIMATES” — so the answer is very likely yes. Confirm that, and confirm whether detailed design work or a full measured plan is charged separately, then answer this and publish it.',
  ),
  faq(
    'estimates',
    'Why is my estimate a range instead of one number?',
    'Because some things are genuinely unknown until a wall or a floor is open. We would rather give you an honest range with the variables named than a single confident number that changes the moment we start. Where the scope is fully knowable, you will get a fixed figure.',
  ),
  faq(
    'estimates',
    'How long is an estimate good for?',
    null,
    'Decide how long a written estimate stays valid before it has to be re-priced.',
  ),

  /* ---- Scheduling ------------------------------------------------------- */
  faq(
    'scheduling',
    'How far out are you booking?',
    'It varies with the season and the size of the project. We will give you a realistic answer when we talk rather than an optimistic one — a start date we can actually hold is worth more to you than an early one we cannot.',
  ),
  faq(
    'scheduling',
    'Will the same people be in my house every day?',
    'Renovation work involves different trades at different stages, so the faces change as the project moves through demolition, rough-in and finish work. What stays constant is who you talk to. You will not have to explain your project again to whoever turns up.',
  ),
  faq(
    'scheduling',
    'What hours do you work?',
    'Normal working hours, and we will confirm the specific daily window before we start so you can plan around it. If something needs an early start or a weekend, we ask first.',
  ),

  /* ---- The Process ------------------------------------------------------ */
  faq(
    'the-process',
    'What does the process actually look like?',
    'Five stages: you tell us what needs a second chance, we walk the space, we build a plan and a price, we do the work, and we finish properly. Each stage ends with you knowing what happens next. There is a fuller breakdown on the homepage.',
  ),
  faq(
    'the-process',
    'Do you handle permits?',
    'For work that requires them, permitting is part of the plan and we will tell you at the estimate stage whether your project needs one. Structural changes, new openings in exterior walls and some mechanical work typically do. We will not start permit-required work without one.',
  ),
  faq(
    'the-process',
    'Do you use subcontractors?',
    'For licensed trades — electrical, plumbing, HVAC, structural engineering — yes, because that work should be done by people who do it every day and carry the right licence. We coordinate them and remain your single point of contact.',
  ),
  faq(
    'the-process',
    'How do you communicate during a project?',
    'You get a point of contact and an agreed way of reaching them. We tell you about problems on the day we find them, not at the end. Most complaints homeowners have about renovations are communication problems rather than craftsmanship problems, and we take that seriously.',
  ),

  /* ---- Living in the home ----------------------------------------------- */
  faq(
    'living-in-the-home',
    'Can we stay in the house during the work?',
    'For most projects, yes. We plan containment, dust control and the daily working area around the fact that people live there. For whole-floor or single-bathroom projects there may be days that are genuinely disruptive, and we will flag those in advance so you can plan.',
  ),
  faq(
    'living-in-the-home',
    'How do you handle dust?',
    'Containment barriers, floor protection on the path in and out, and cleanup at the end of every working day. Renovation dust is impossible to eliminate entirely, but a site that gets swept nightly is a completely different experience from one that does not.',
  ),
  faq(
    'living-in-the-home',
    'What about pets and kids?',
    'Tell us at the walkthrough. Knowing there is a dog who bolts for open doors, or a child asleep at midday, changes how we set up the site. It is much easier to plan around than to react to.',
  ),
  faq(
    'living-in-the-home',
    'Will we lose our kitchen or bathroom completely?',
    'For a full remodel of a single-bathroom home or a kitchen gut, there will be a period without it. We will tell you how long, help you set up a temporary alternative where that is practical, and sequence the work to shorten that window as much as the job allows.',
  ),

  /* ---- Changes ---------------------------------------------------------- */
  faq(
    'changes',
    'What happens if we want to change something mid-project?',
    'It is normal — seeing a space open often changes what you want. We price the change, tell you what it does to the schedule, and get your agreement in writing before doing it. Nothing gets added to your bill that you have not agreed to.',
  ),
  faq(
    'changes',
    'What if you find something unexpected behind a wall?',
    'We stop, we show you, and we explain the options and what each one costs. Hidden damage is common in renovation work, especially in older homes. What should never happen is finding out about it on the final invoice.',
  ),

  /* ---- Payments --------------------------------------------------------- */
  faq(
    'payments',
    'How does payment work?',
    null,
    'Publish the payment structure: deposit amount, progress-payment milestones, and final payment terms.',
  ),
  faq(
    'payments',
    'What payment methods do you take?',
    null,
    'List the accepted payment methods.',
  ),
  faq(
    'payments',
    'Do you require a deposit?',
    null,
    'Confirm whether a deposit is required, how much, and exactly what it covers.',
  ),

  /* ---- Materials -------------------------------------------------------- */
  faq(
    'materials',
    'Do we choose the materials, or do you?',
    'You choose, and we help. We will tell you where a cheaper product performs just as well, and where spending more genuinely buys you something. Below-grade rooms and wet areas rule some materials out entirely, and we will steer you away from those before you fall in love with them.',
  ),
  faq(
    'materials',
    'Can we supply our own materials?',
    'Often, yes — talk to us early. The thing to know is that homeowner-supplied materials shift responsibility for quantity, condition and lead time onto you, and a shortfall mid-install stops the job. We will be clear about which items are sensible to supply yourself.',
  ),
  faq(
    'materials',
    'How do you deal with material lead times?',
    'We order early and schedule against confirmed delivery dates rather than promised ones. Some products — windows and custom cabinetry in particular — can have long lead times, and we would rather build that into the plan than pretend it away.',
  ),

  /* ---- Completion ------------------------------------------------------- */
  faq(
    'completion',
    'How do you decide when a project is finished?',
    'We walk it with you and build a punch list together. Anything on that list gets done before we call it complete. "Finished" means finished to your satisfaction, not to ours.',
  ),
  faq(
    'completion',
    'What if something is wrong after you leave?',
    'Tell us. Get in touch and we will come out and look at it — we would far rather hear about a problem than have you live with it. Any formal warranty terms that apply to your project are set out in your written agreement, so you are never relying on something you read on a website.',
    'Confirm the formal warranty terms so they can be stated here as well as in the customer agreement.',
  ),
  faq(
    'completion',
    'Do you clean up at the end?',
    'Yes. Debris removed, surfaces cleaned, protection taken up, and the room handed back ready to use. A room that needs a deep clean before you can move back in is not a finished room.',
  ),
];

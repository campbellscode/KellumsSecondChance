import type { ProjectDetail, ProjectImage } from '@/lib/api/types';
import { projectImage } from '@/content/media';

/**
 * ============================================================================
 *  SAMPLE PROJECT CASE STUDIES — DEMONSTRATION CONTENT
 * ============================================================================
 *
 *  These six case studies are WRITTEN EXAMPLES, not records of completed
 *  Kellum’s jobs. Street names, dates and details are illustrative. They exist
 *  to show how a real case study will look and read.
 *
 *  Every record carries `isSampleContent` on the server so the UI can label the
 *  gallery honestly until real projects replace them.
 *
 *  ▸ Replace via /admin/projects, or by editing Data/Seed/SampleContent.cs.
 * ============================================================================
 */

let imageId = 0;

function image(
  projectSlug: string,
  file: string,
  kind: ProjectImage['kind'],
  alt: string,
  order: number,
  shape: 'landscape' | 'portrait' = 'landscape',
  caption: string | null = null,
  pairKey: string | null = null,
): ProjectImage {
  imageId += 1;
  return {
    ...projectImage(projectSlug, file, alt, shape),
    id: imageId,
    kind,
    caption,
    displayOrder: order,
    pairKey,
  };
}

export const sampleProjects: readonly ProjectDetail[] = [
  {
    id: 1,
    slug: 'maple-street-kitchen',
    title: 'The Kitchen That Stopped Working',
    category: 'Kitchen Remodeling',
    categorySlug: 'kitchen-remodeling',
    location: 'Maple Street',
    summary:
      'A closed-off galley kitchen with failing cabinets became an open, working room with an island the whole family ends up standing around.',
    completedOn: '2025-04-18',
    coverImage: projectImage(
      'maple-street-kitchen',
      'cover',
      'A renovated kitchen with dark cabinetry, a large island and pendant lighting.',
    ),
    isFeatured: true,
    displayOrder: 1,
    hasBeforeAfter: true,
    isSampleContent: true,
    challenge:
      'The kitchen had been laid out for one cook and one appliance at a time. Two people could not pass each other. The cabinet boxes had swollen at the base from a dishwasher leak nobody had caught, the counter had a burn mark the family had covered with a cutting board for four years, and a half-wall blocked every bit of afternoon light from reaching the sink.',
    vision:
      'The homeowners did not want a showpiece. They wanted to be able to cook dinner while a teenager did homework in the same room. That meant opening the half-wall, moving the primary prep zone to an island, and getting real storage where they actually reach for things.',
    transformation:
      'We removed the half-wall, reframed the opening and rebuilt the cabinet run along the exterior wall. New base and upper cabinetry, quartz counters, a full-height tile backsplash and an island sized to seat three. Under-cabinet lighting replaced the single ceiling fixture, and the flooring was carried through from the adjoining dining room so the two rooms finally read as one space.',
    outcome:
      'The room now takes four people without anyone apologising. The family reports that the island is where everyone ends up, which is the outcome they asked for.',
    durationLabel: 'Approximately five weeks',
    propertyType: 'Single-family home',
    serviceSlugs: ['kitchen-remodeling', 'flooring', 'carpentry-and-trim', 'drywall-and-painting'],
    serviceNames: ['Kitchen Remodeling', 'Flooring', 'Carpentry & Trim', 'Drywall & Painting'],
    highlights: [
      'Half-wall removed and opening reframed',
      'Full cabinetry replacement with quartz counters',
      'Island seating for three',
      'Flooring carried through to the dining room',
    ],
    images: [
      image('maple-street-kitchen', 'before', 'Before', 'The original kitchen with dated cabinets, a damaged counter and a half-wall blocking daylight.', 1, 'landscape', 'Swollen cabinet bases and a counter the family had been covering up.', 'main'),
      image('maple-street-kitchen', 'after', 'After', 'The rebuilt kitchen with new cabinetry, quartz counters and an island.', 2, 'landscape', 'The same view with the half-wall gone.', 'main'),
      image('maple-street-kitchen', 'gallery-1', 'Gallery', 'New hardwood flooring carried from the kitchen into the dining room.', 3, 'portrait', 'Flooring runs unbroken between the two rooms.'),
      image('maple-street-kitchen', 'gallery-2', 'Gallery', 'Painted trim and panelling detail beside the new cabinet run.', 4, 'landscape'),
    ],
    metaTitle: "Maple Street Kitchen Remodel | Kellum’s Second Chance Renovations",
    metaDescription:
      'A closed galley kitchen with failing cabinets rebuilt into an open, working room with an island — a Kellum’s Second Chance Renovations case study.',
  },

  {
    id: 2,
    slug: 'harborview-primary-bath',
    title: 'Twenty Years of Slow Water Damage',
    category: 'Bathroom Renovations',
    categorySlug: 'bathroom-renovations',
    location: 'Harborview',
    summary:
      'Failed grout had been quietly letting water into the subfloor for years. The room was taken back to framing and rebuilt to stay dry.',
    completedOn: '2025-06-09',
    coverImage: projectImage(
      'harborview-primary-bath',
      'cover',
      'A renovated bathroom with a glass-enclosed tiled shower and a floating vanity.',
    ),
    isFeatured: true,
    displayOrder: 2,
    hasBeforeAfter: true,
    isSampleContent: true,
    challenge:
      'The homeowners called about replacing a vanity. During the walkthrough the floor flexed near the shower curb — never a good sign. Grout at the base of the surround had failed long ago, and water had been travelling into the subfloor on every shower since. The vanity was the least of the problem.',
    vision:
      'Once we showed them what was under the tile, the conversation changed from cosmetic to structural. They wanted it done once and done right: a shower that would not leak again, a floor that felt solid, and a room that finally matched the rest of a house they had recently updated.',
    transformation:
      'Full demolition to framing. Damaged subfloor and two joist sections were repaired, the shower was rebuilt with a proper sloped base and a bonded waterproofing membrane, and the whole room was re-tiled. A floating vanity with a solid surface top, a frameless glass enclosure, new ventilation and blocking installed behind the walls for future grab bars.',
    outcome:
      'A room the homeowners can stop worrying about. The blocking behind the tile means accessibility hardware can be added later without opening anything back up.',
    durationLabel: 'Approximately four weeks',
    propertyType: 'Single-family home',
    serviceSlugs: ['bathroom-renovations', 'repair-and-restoration', 'carpentry-and-trim'],
    serviceNames: ['Bathroom Renovations', 'Repair & Restoration', 'Carpentry & Trim'],
    highlights: [
      'Subfloor and joist repair after long-term water intrusion',
      'Shower rebuilt with bonded waterproofing membrane',
      'Frameless glass enclosure and floating vanity',
      'Blocking installed for future accessibility hardware',
    ],
    images: [
      image('harborview-primary-bath', 'before', 'Before', 'The original bathroom with failing grout, a dated vanity and a worn tub surround.', 1, 'landscape', 'Grout failure at the curb had been going on for years.', 'main'),
      image('harborview-primary-bath', 'after', 'After', 'The rebuilt bathroom with a tiled walk-in shower, glass enclosure and floating vanity.', 2, 'landscape', 'Rebuilt from the framing out.', 'main'),
      image('harborview-primary-bath', 'gallery-1', 'Gallery', 'New painted trim and panelling beside the vanity wall.', 3, 'portrait'),
      image('harborview-primary-bath', 'gallery-2', 'Gallery', 'New tile flooring running to a fresh baseboard.', 4, 'landscape'),
    ],
    metaTitle: "Harborview Primary Bath Renovation | Kellum’s Second Chance Renovations",
    metaDescription:
      'A bathroom taken back to framing after years of hidden water damage, rebuilt with proper waterproofing — a Kellum’s case study.',
  },

  {
    id: 3,
    slug: 'oakridge-basement',
    title: 'Nine Hundred Square Feet of Storage',
    category: 'Basement Finishing',
    categorySlug: 'basement-finishing',
    location: 'Oakridge',
    summary:
      'An unfinished basement used for boxes and a treadmill became the room the family spends most evenings in.',
    completedOn: '2025-02-27',
    coverImage: projectImage(
      'oakridge-basement',
      'cover',
      'A finished basement with recessed lighting, built-in cabinetry and a media wall.',
    ),
    isFeatured: true,
    displayOrder: 3,
    hasBeforeAfter: true,
    isSampleContent: true,
    challenge:
      'Bare block walls, exposed joists, one bare bulb and a slab that got cold enough in February that nobody went down there. The family had outgrown their main floor but did not want to move. The obvious answer was already in the house — it was just being used to store things nobody had opened in six years.',
    vision:
      'A room that felt like part of the house rather than a basement with furniture in it. Warm, properly lit despite low ceilings, with enough built-in storage that the boxes had somewhere to go.',
    transformation:
      'We started with a moisture assessment and confirmed the basement was dry. Framing and insulation went in against the block, ductwork was reworked to preserve height, and lighting was laid out for a low ceiling — recessed cans on a tight grid rather than a few bright fixtures. A shiplap media wall, built-in base cabinetry along one side, and flooring rated for below-grade use.',
    outcome:
      'The family got a second living space without moving house, and the storage they lost was replaced by built-ins that hold considerably more.',
    durationLabel: 'Approximately seven weeks',
    propertyType: 'Single-family home',
    serviceSlugs: ['basement-finishing', 'flooring', 'drywall-and-painting', 'custom-renovation-projects'],
    serviceNames: ['Basement Finishing', 'Flooring', 'Drywall & Painting', 'Custom Renovation Projects'],
    highlights: [
      'Moisture assessment completed before any framing',
      'Ductwork reworked to preserve ceiling height',
      'Recessed lighting laid out for a low ceiling',
      'Built-in storage and shiplap media wall',
    ],
    images: [
      image('oakridge-basement', 'before', 'Before', 'An unfinished basement with bare block walls, exposed joists and a single bulb.', 1, 'landscape', 'Block walls, exposed joists, one bulb.', 'main'),
      image('oakridge-basement', 'after', 'After', 'The finished basement with recessed lighting, built-ins and new flooring.', 2, 'landscape', 'The same room, finished to match the house above it.', 'main'),
      image('oakridge-basement', 'gallery-1', 'Gallery', 'A renovated living area with a rebuilt feature wall and new flooring.', 3, 'portrait'),
      image('oakridge-basement', 'gallery-2', 'Gallery', 'Below-grade rated flooring installed wall to wall.', 4, 'landscape'),
    ],
    metaTitle: "Oakridge Basement Finishing | Kellum’s Second Chance Renovations",
    metaDescription:
      'An unfinished storage basement turned into the family’s main living space — a Kellum’s Second Chance Renovations case study.',
  },

  {
    id: 4,
    slug: 'brookfield-living-room',
    title: 'The Wall That Was In The Way',
    category: 'Interior Renovations',
    categorySlug: 'interior-renovations',
    location: 'Brookfield',
    summary:
      'Three cramped rooms became one, with a rebuilt fireplace surround, new trim throughout and daylight that finally reaches the back of the house.',
    completedOn: '2024-11-14',
    coverImage: projectImage(
      'brookfield-living-room',
      'cover',
      'A renovated living room with a rebuilt fireplace, large windows and hardwood floors.',
    ),
    isFeatured: true,
    displayOrder: 4,
    hasBeforeAfter: true,
    isSampleContent: true,
    challenge:
      'A 1950s floor plan chopped the main floor into a formal living room nobody sat in, a dining room used as a dumping ground, and a dark middle hallway. The fireplace surround had been "updated" at some point with materials that had not aged well, and the trim had been painted so many times the profiles had disappeared.',
    vision:
      'Open the main floor without gutting the character of the house. Keep the fireplace as the anchor, get light from the front windows all the way to the back, and put trim back that looks like it belongs in a house of this age.',
    transformation:
      'The dividing wall was load-bearing, so a structural engineer specified a beam and we permitted the work. With the wall gone, we rebuilt the fireplace surround, ran new hardwood across the whole floor, and installed new baseboard, casing and crown milled to match the original profiles still present in the upstairs bedrooms. Windows were replaced in their existing openings.',
    outcome:
      'One room instead of three, with the original character intact. The homeowners say they use the front of the house for the first time since they bought it.',
    durationLabel: 'Approximately eight weeks',
    propertyType: 'Single-family home',
    serviceSlugs: ['interior-renovations', 'carpentry-and-trim', 'flooring', 'doors-and-windows', 'drywall-and-painting'],
    serviceNames: ['Interior Renovations', 'Carpentry & Trim', 'Flooring', 'Doors & Windows', 'Drywall & Painting'],
    highlights: [
      'Load-bearing wall removed with engineered beam and permit',
      'Trim profiles matched to the home’s original millwork',
      'New hardwood across the full main floor',
      'Windows replaced in existing openings',
    ],
    images: [
      image('brookfield-living-room', 'before', 'Before', 'A dark, divided living room with dated trim and a worn fireplace surround.', 1, 'landscape', 'Three rooms, none of them used.', 'main'),
      image('brookfield-living-room', 'after', 'After', 'The opened living space with a rebuilt fireplace, new trim and hardwood floors.', 2, 'landscape', 'One room, with the beam doing the work the wall used to.', 'main'),
      image('brookfield-living-room', 'gallery-1', 'Gallery', 'New crown moulding and panelling matched to the home’s original profiles.', 3, 'portrait', 'Profiles milled to match the upstairs originals.'),
      image('brookfield-living-room', 'gallery-2', 'Gallery', 'New hardwood flooring running the length of the main floor.', 4, 'landscape'),
    ],
    metaTitle: "Brookfield Living Room Renovation | Kellum’s Second Chance Renovations",
    metaDescription:
      'A chopped-up 1950s main floor opened into one room with matched trim and a rebuilt fireplace — a Kellum’s case study.',
  },

  {
    id: 5,
    slug: 'cedar-lane-deck',
    title: 'A Deck Nobody Trusted',
    category: 'Decks & Exteriors',
    categorySlug: 'decks-and-exteriors',
    location: 'Cedar Lane',
    summary:
      'Soft boards and a railing that moved when you leaned on it. Rebuilt on sound framing with proper drainage and hardware that will not bleed.',
    completedOn: '2025-07-22',
    coverImage: projectImage(
      'cedar-lane-deck',
      'cover',
      'A rebuilt rear deck with new decking boards, railings and balusters.',
    ),
    isFeatured: false,
    displayOrder: 5,
    hasBeforeAfter: true,
    isSampleContent: true,
    challenge:
      'The homeowners had stopped using the deck. Two boards near the door had gone soft, the railing flexed under a hand, and the fasteners had rust-bled dark streaks down every board. It looked worse than it was, but the parts that were actually dangerous were not the parts they were worried about.',
    vision:
      'They expected to be told the whole thing had to come out. They wanted honesty more than they wanted a sales pitch.',
    transformation:
      'We pulled boards and inspected the framing, which was largely sound — the joists were fine, three had localised rot at the ledger end, and the posts were solid. We replaced the damaged framing members, re-flashed the ledger, installed new decking with hidden fasteners, and rebuilt the railing and stairs properly. The homeowners kept the framing they had already paid for once.',
    outcome:
      'A deck that is safe and gets used again, at meaningfully less than a full teardown would have cost.',
    durationLabel: 'Approximately two weeks',
    propertyType: 'Single-family home',
    serviceSlugs: ['decks-and-exteriors', 'carpentry-and-trim', 'repair-and-restoration'],
    serviceNames: ['Decks & Exterior Improvements', 'Carpentry & Trim', 'Repair & Restoration'],
    highlights: [
      'Framing inspected and retained where sound',
      'Ledger re-flashed to stop water at the house',
      'Hidden fasteners — no rust bleed',
      'Railing and stairs rebuilt to be genuinely solid',
    ],
    images: [
      image('cedar-lane-deck', 'before', 'Before', 'A worn deck with soft boards, rust-stained fasteners and a loose railing.', 1, 'landscape', 'Rust bleed and boards that had gone soft near the door.', 'main'),
      image('cedar-lane-deck', 'after', 'After', 'The rebuilt deck with new boards, a solid railing and clean hardware.', 2, 'landscape', 'Same framing where it was sound, everything else new.', 'main'),
      image('cedar-lane-deck', 'gallery-1', 'Gallery', 'New exterior trim and railing detail at the stair.', 3, 'portrait'),
    ],
    metaTitle: "Cedar Lane Deck Rebuild | Kellum’s Second Chance Renovations",
    metaDescription:
      'A failing deck rebuilt on sound existing framing with proper flashing and hidden fasteners — a Kellum’s case study.',
  },

  {
    id: 6,
    slug: 'rental-turnover-duplex',
    title: 'Eleven Days Between Tenants',
    category: 'Rental Property Turnovers',
    categorySlug: 'rental-property-turnovers',
    location: 'Duplex unit',
    summary:
      'A full turnover on a hard deadline: paint, flooring, a kitchen refresh and a long punch list, finished before the vacancy started costing real money.',
    completedOn: '2025-05-30',
    coverImage: projectImage(
      'rental-turnover-duplex',
      'cover',
      'A refreshed rental unit laundry and utility area with new cabinetry and flooring.',
    ),
    isFeatured: false,
    displayOrder: 6,
    hasBeforeAfter: true,
    isSampleContent: true,
    challenge:
      'A four-year tenancy had ended and the unit showed it: worn carpet throughout, wall damage in every room, a kitchen with cabinet doors that no longer closed, and a move-out inspection list twenty-two items long. The owner had a signed lease starting in under two weeks.',
    vision:
      'Durable, not precious. Every choice had to survive the next tenancy and be available off the shelf — nothing on a four-week lead time.',
    transformation:
      'Carpet came out and luxury vinyl plank went in throughout. Full drywall repair and repaint. The kitchen cabinets were structurally sound, so we refaced rather than replaced, added new hardware and a new counter. Fixtures, blinds, locks and the full punch list were handled in the same visit, with photo documentation for the owner at every stage.',
    outcome:
      'The unit was ready with three days to spare, and the owner had a photographic record of the condition it was handed over in.',
    durationLabel: 'Eleven days',
    propertyType: 'Rental — duplex unit',
    serviceSlugs: ['rental-property-turnovers', 'flooring', 'drywall-and-painting', 'kitchen-remodeling', 'repair-and-restoration'],
    serviceNames: ['Rental Property Turnovers', 'Flooring', 'Drywall & Painting', 'Kitchen Remodeling', 'Repair & Restoration'],
    highlights: [
      'Completed inside an eleven-day vacancy window',
      'Cabinets refaced rather than replaced to save cost and time',
      'Durable luxury vinyl plank throughout',
      'Photo-documented condition report at handover',
    ],
    images: [
      image('rental-turnover-duplex', 'before', 'Before', 'A worn rental unit with damaged walls, dated cabinets and failing flooring.', 1, 'landscape', 'Four years of tenancy and a twenty-two item punch list.', 'main'),
      image('rental-turnover-duplex', 'after', 'After', 'The refreshed unit with new flooring, repainted walls and refaced cabinetry.', 2, 'landscape', 'Durable finishes, off-the-shelf materials, eleven days.', 'main'),
      image('rental-turnover-duplex', 'gallery-1', 'Gallery', 'New luxury vinyl plank flooring installed throughout the unit.', 3, 'portrait'),
      image('rental-turnover-duplex', 'gallery-2', 'Gallery', 'The refreshed kitchen with refaced cabinets and a new counter.', 4, 'landscape'),
    ],
    metaTitle: "Duplex Rental Turnover | Kellum’s Second Chance Renovations",
    metaDescription:
      'A full rental turnover completed inside an eleven-day vacancy window — a Kellum’s Second Chance Renovations case study.',
  },
];

export const sampleProjectSummaries = sampleProjects.map(
  ({
    id, slug, title, category, categorySlug, location, summary,
    completedOn, coverImage, isFeatured, displayOrder, hasBeforeAfter, isSampleContent,
  }) => ({
    id, slug, title, category, categorySlug, location, summary,
    completedOn, coverImage, isFeatured, displayOrder, hasBeforeAfter, isSampleContent,
  }),
);

/** Distinct categories in display order, for the projects filter bar. */
export const sampleProjectCategories = Array.from(
  new Map(sampleProjects.map((p) => [p.categorySlug, { slug: p.categorySlug, name: p.category }])).values(),
);

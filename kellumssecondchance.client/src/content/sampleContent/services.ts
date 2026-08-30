import type { ServiceDetail } from '@/lib/api/types';
import { serviceImage } from '@/content/media';

/**
 * ============================================================================
 *  SAMPLE SERVICE CATALOGUE — EDITABLE BUSINESS CONTENT
 * ============================================================================
 *
 *  These are CANDIDATE services, not confirmed offerings. Kellum's has not yet
 *  confirmed which of these it takes on, so before launch someone at the
 *  business must review this list and remove anything they do not do.
 *
 *  The same records are seeded server-side (Data/Seed/SampleContent.cs) and are
 *  editable through /admin/services once an administrator account exists — the
 *  catalogue is data, never hard-coded into a component.
 *
 *  Ordering is controlled by `displayOrder`; hiding a service is a matter of
 *  setting IsActive = false on the server record.
 * ============================================================================
 */

function build(
  order: number,
  slug: string,
  name: string,
  tagline: string,
  icon: string,
  summary: string,
  headline: string,
  introduction: string,
  includes: string[],
  bestFor: string[],
  considerations: string[],
  relatedProjectSlugs: string[],
  isFeatured = false,
): ServiceDetail {
  return {
    id: order,
    slug,
    name,
    tagline,
    summary,
    icon,
    image: serviceImage(slug),
    displayOrder: order,
    isFeatured,
    headline,
    introduction,
    includes,
    bestFor,
    considerations,
    relatedProjectSlugs,
    metaTitle: `${name} | Kellum's Second Chance Renovations`,
    metaDescription: summary,
  };
}

export const sampleServices: readonly ServiceDetail[] = [
  build(
    1,
    'kitchen-remodeling',
    'Kitchen Remodeling',
    'The room everyone actually lives in',
    'chef-hat',
    'From a cabinet-and-counter refresh to moving walls and rebuilding the whole layout — kitchens that work the way you cook.',
    'The kitchen you keep meaning to fix.',
    'Most kitchens do not fail all at once. The drawer stops closing, the counter gets a burn mark, the layout starts fighting you every time two people are in there — and one day you realise you have been working around your kitchen for six years. We rebuild kitchens so they stop being a compromise: better flow, better storage, surfaces you are not afraid to use.',
    [
      'Cabinet installation — new, refaced, or reconfigured',
      'Countertop templating, fabrication coordination and installation',
      'Tile backsplashes and feature walls',
      'Sink, faucet and appliance set-and-connect',
      'Lighting layout, including under-cabinet and island pendants',
      'Flooring, trim, drywall and paint to finish the room out',
      'Coordination with licensed electrical and plumbing trades where the work requires it',
    ],
    [
      'Kitchens with a layout that no longer fits how the household cooks',
      'Cabinets that are structurally fine but visually done',
      'Homeowners who want one crew handling the whole room, not five',
    ],
    [
      'Moving plumbing or gas lines changes both the timeline and the permitting picture — we will tell you that at the walkthrough, not halfway through.',
      'Counter fabrication is measured after cabinets are set, so there is a built-in gap between install days. We plan a working temporary setup around it.',
    ],
    ['maple-street-kitchen', 'rental-turnover-duplex'],
    true,
  ),

  build(
    2,
    'bathroom-renovations',
    'Bathroom Renovations',
    'Small room, zero margin for sloppy work',
    'shower-head',
    'Tile, waterproofing, vanities and fixtures done properly — because a bathroom is where shortcuts show up first and cost the most.',
    'A bathroom is the least forgiving room in the house.',
    'Every bathroom mistake eventually becomes a water problem. That is why the parts of a bathroom renovation nobody photographs — the waterproofing, the slope to the drain, the blocking behind the grab bar — are the parts we care most about. The tile is the easy part. Doing what is behind it correctly is the job.',
    [
      'Full demolition and haul-away',
      'Shower and tub surrounds with proper waterproofing',
      'Floor and wall tile, including heated-floor underlayment when specified',
      'Vanities, mirrors, lighting and hardware',
      'Fixture installation and trim-out',
      'Ventilation improvements',
      'Accessibility work such as blocking for grab bars, curbless entries and comfort-height fixtures',
    ],
    [
      'Bathrooms with grout failure, soft floors, or any sign of past water damage',
      'Dated but structurally sound rooms that need a full visual reset',
      'Households planning to age in place',
    ],
    [
      'If we open a wall and find rot or an old leak, we stop and show you before we go further. Surprises behind tile are common in older homes.',
      'A single-bathroom home needs a plan for the days the room is out of service. We will build that into the schedule with you.',
    ],
    ['harborview-primary-bath'],
    true,
  ),

  build(
    3,
    'basement-finishing',
    'Basement Finishing',
    'The square footage you already paid for',
    'layers',
    'Turning cold, unfinished storage into a real room — framing, insulation, egress, lighting and finishes that feel like the rest of the house.',
    'You already own this space. Let us make it liveable.',
    'A basement is the cheapest square footage a homeowner will ever add, because the walls, roof and slab already exist. The work is in making it feel like it belongs to the house above it: dry, warm, properly lit, and finished to the same standard as the main floor — not an obvious afterthought with a drop ceiling.',
    [
      'Moisture assessment before any framing goes up',
      'Framing, insulation and vapour management',
      'Drywall, taping and finishing',
      'Egress and code-required safety considerations',
      'Lighting design for low ceilings',
      'Flooring suited to below-grade conditions',
      'Built-ins, bars, media walls and storage',
      'Bathroom or laundry rough-in coordination',
    ],
    [
      'Dry basements with adequate ceiling height',
      'Families who need another bedroom, office, or place for teenagers to exist',
      'Homeowners weighing finishing versus moving',
    ],
    [
      'We will not frame over an active moisture problem. If the basement takes on water, that gets solved first — sometimes by someone other than us.',
      'Ceiling height, existing ductwork and beam locations shape what is realistic. We map that at the walkthrough.',
    ],
    ['oakridge-basement'],
    true,
  ),

  build(
    4,
    'interior-renovations',
    'Interior Renovations',
    'Whole rooms, reworked',
    'home',
    'Living rooms, bedrooms, dining rooms and the awkward spaces in between — reconfigured, refinished and brought back to life.',
    'Not every renovation has a category.',
    'Sometimes the problem is not one room, it is the way three rooms meet. A wall that should not be there. A dining room nobody uses. A hallway that eats light. Interior renovation work is where we reshape how a house actually functions, and it is often the work that changes daily life the most.',
    [
      'Non-structural wall removal and openings (with engineering input when a wall is load-bearing)',
      'Room reconfiguration and layout changes',
      'Ceiling repairs, including removing dated textures',
      'Fireplace surrounds and feature walls',
      'Built-in shelving, benches and storage',
      'Complete drywall, trim, flooring and paint',
    ],
    [
      'Houses where the floor plan fights the family',
      'Rooms that have been "temporarily" unfinished for years',
      'Homeowners who want a coherent look across a whole floor rather than one nice room',
    ],
    [
      'Load-bearing walls need a structural engineer and a permit. We bring that up early because it changes both cost and schedule.',
      'Matching existing trim and flooring profiles in older homes is sometimes impossible; we will show you options rather than quietly substituting.',
    ],
    ['brookfield-living-room'],
  ),

  build(
    5,
    'flooring',
    'Flooring',
    'Where the whole room starts',
    'grid-3x3',
    'Hardwood, engineered, luxury vinyl plank and tile — installed flat, tight and with transitions that do not trip you.',
    'Flat, tight, and quiet underfoot.',
    'Good flooring is mostly invisible work: subfloor prep, moisture checks, acclimation, layout planning so you do not end up with a two-inch sliver plank at the most visible wall in the room. Anybody can lay a floor. Making it stay flat, silent and square is the part that takes experience.',
    [
      'Subfloor assessment, levelling and repair',
      'Hardwood and engineered hardwood installation',
      'Luxury vinyl plank and tile',
      'Ceramic, porcelain and stone tile',
      'Stair treads, risers and nosing',
      'Baseboard, quarter round and transition detailing',
      'Removal and disposal of existing flooring',
    ],
    [
      'Homes with squeaks, soft spots or visible height changes between rooms',
      'Whole-floor replacements where consistency matters',
      'Rental properties needing durable, fast-turnaround surfaces',
    ],
    [
      'Existing floors sometimes hide subfloor damage. We check before quoting where we can, but some of it only appears on demolition day.',
      'Below-grade and high-moisture rooms rule out certain materials. We will steer you away from products that will not survive there.',
    ],
    ['maple-street-kitchen', 'brookfield-living-room'],
  ),

  build(
    6,
    'drywall-and-painting',
    'Drywall & Painting',
    'The finish everyone sees',
    'paint-roller',
    'Hanging, taping, patching and painting — including the repairs that make a room look renovated rather than touched up.',
    'The surface people actually look at.',
    'Drywall is where careless work is most obvious. Light rakes across a wall and shows every seam, every nail pop, every patch that was floated too tight. We take the extra passes, because a beautiful kitchen with a wavy wall behind it still reads as a cheap job.',
    [
      'New drywall hanging, taping and finishing',
      'Patch and repair work, including water-damage repairs after the source is fixed',
      'Texture removal and smooth-wall conversions',
      'Skim coating',
      'Interior painting — walls, ceilings, trim and doors',
      'Caulking and detail work',
      'Surface preparation and priming',
    ],
    [
      'Rooms with cracked, damaged or dated textured surfaces',
      'Anyone who has tried patching a ceiling and would like to stop',
      'Projects that need a professional finish level, not a rental-grade one',
    ],
    [
      'Water-damaged drywall means finding the leak first. Painting over a stain does not fix anything.',
      'Colour looks different in your house than on the chip. We encourage sample patches before committing a whole floor.',
    ],
    ['brookfield-living-room', 'rental-turnover-duplex'],
  ),

  build(
    7,
    'carpentry-and-trim',
    'Carpentry & Trim',
    'The details that make a room feel finished',
    'ruler',
    'Baseboard, casing, crown, wainscoting, built-ins and stair work — tight joints and clean reveals.',
    'This is where craftsmanship is visible.',
    'Trim carpentry is the part of a renovation people run their hand along. Mitres that stay closed through a season of humidity, reveals that are consistent from one door to the next, scribes that follow a wall that has not been plumb since 1948. It is slow work and it is worth it.',
    [
      'Baseboard, door and window casing',
      'Crown moulding and ceiling detail',
      'Wainscoting, board-and-batten and panelled walls',
      'Built-in shelving, benches, mudroom lockers and window seats',
      'Stair treads, risers, skirt boards and railings',
      'Interior door hanging and hardware',
      'Custom pieces built for the space rather than bought to fit it',
    ],
    [
      'Character homes where existing profiles need matching',
      'Rooms that feel plain and cannot be fixed with paint',
      'Storage problems that furniture will not solve',
    ],
    [
      'Reproducing a discontinued historic profile may require custom milling, which adds lead time.',
      'Old houses move. We build with that in mind, but seasonal gapping in solid wood is normal, not a defect.',
    ],
    ['brookfield-living-room', 'harborview-primary-bath'],
  ),

  build(
    8,
    'doors-and-windows',
    'Doors & Windows',
    'Openings that seal, swing and last',
    'door-open',
    'Replacement and new openings — installed square, insulated properly and trimmed out to match the room.',
    'A door should not need a shoulder.',
    'Windows and doors are where a house meets the weather, and where bad installation shows up as a draft, a stuck sash or a rotten sill ten years later. Getting them plumb, level, square and properly sealed matters more than the sticker on the glass.',
    [
      'Interior and exterior door replacement',
      'Window replacement in existing openings',
      'New rough openings where the structure allows',
      'Patio and sliding door installation',
      'Weatherproofing, flashing and insulation detailing',
      'Interior and exterior trim, casing and finishing',
      'Hardware installation and adjustment',
    ],
    [
      'Drafty, painted-shut or failing units',
      'Rooms that need more daylight',
      'Entryways that have never closed properly',
    ],
    [
      'Cutting a new opening in an exterior wall is structural work and needs permitting.',
      'Window lead times vary by manufacturer and can be long. We order early and schedule around confirmed delivery, not promised delivery.',
    ],
    ['brookfield-living-room'],
  ),

  build(
    9,
    'decks-and-exteriors',
    'Decks & Exterior Improvements',
    'Outside deserves the same standard',
    'trees',
    'Deck rebuilds, railings, stairs, siding repair and exterior trim — built for weather, not for photos.',
    'Built to survive a decade of weather.',
    'Exterior work gets judged by winter. Fasteners that will not bleed, framing that drains, flashing where two materials meet, railings that do not wobble when someone leans on them at a party. We build outside the way we would build for our own families.',
    [
      'Deck rebuilds and new deck construction',
      'Railing, stair and baluster work',
      'Decking board replacement over sound framing',
      'Pergolas, privacy screens and built-in benches',
      'Exterior trim, fascia and soffit repair',
      'Siding repair and targeted replacement',
      'Exterior door and threshold work',
    ],
    [
      'Decks with soft boards, wobbly rails or visible rot',
      'Outdoor spaces that go unused because they are unpleasant',
      'Homes with exterior trim that has started to fail',
    ],
    [
      'Deck framing condition is not fully knowable until boards come off. We quote in stages when there is doubt rather than guessing high.',
      'Exterior work is weather-dependent. We build schedule slack in rather than rushing a wet install.',
    ],
    ['cedar-lane-deck'],
    true,
  ),

  build(
    10,
    'repair-and-restoration',
    'Repair & Restoration',
    'Fixing what went wrong',
    'wrench',
    'Water damage, settling, failed past work and general disrepair — assessed honestly and put right.',
    'Somebody has to fix it properly.',
    'A lot of our work starts with a phone call that begins "somebody already tried to fix this." Failed repairs, water that found a path, a floor that has been soft for two years. Restoration work needs diagnosis before it needs materials, and we would rather tell you the real cause than sell you a cosmetic patch.',
    [
      'Water-damage repair once the source has been resolved',
      'Subfloor and joist repair',
      'Rot remediation in trim, sills and framing',
      'Correcting failed or unfinished previous work',
      'Drywall, plaster and ceiling repairs',
      'Door, window and hardware repair',
      'General handyman-scale repair lists in one visit',
    ],
    [
      'Homes with a problem nobody has been able to explain',
      'Recently purchased houses with inherited issues',
      'Anyone holding a long list of small unfinished things',
    ],
    [
      'We do not do emergency water extraction or mould remediation — those need a specialist, and we will tell you to call one.',
      'Repair scope can grow once things are opened up. We price the known work and flag the unknowns instead of burying them.',
    ],
    ['rental-turnover-duplex'],
  ),

  build(
    11,
    'rental-property-turnovers',
    'Rental Property Turnovers',
    'Fast, durable, back on the market',
    'key-round',
    'Between-tenant work on a schedule that respects vacancy costs — durable finishes, one point of contact, predictable timelines.',
    'Every vacant day costs you money.',
    'Turnover work is a different discipline from a family renovation. The finishes need to survive tenants, the schedule matters more than the mood board, and you need someone who will walk the unit, send you a list, and get it done without three weeks of back-and-forth.',
    [
      'Full-unit paint and drywall repair',
      'Durable flooring replacement',
      'Cabinet, counter and hardware refresh',
      'Fixture and appliance replacement',
      'Door, lock and hardware work',
      'Punch-list repairs from move-out inspections',
      'Photo-documented condition reporting',
    ],
    [
      'Landlords and property managers with recurring turnover work',
      'Units that need a durable reset rather than a premium remodel',
      'Owners managing property from out of town',
    ],
    [
      'Turnover pricing depends heavily on unit condition at move-out. We walk the unit before quoting.',
      'Tight vacancy windows need materials confirmed in advance — we will ask you to make selections early.',
    ],
    ['rental-turnover-duplex'],
  ),

  build(
    12,
    'custom-renovation-projects',
    'Custom Renovation Projects',
    'The one that does not fit a category',
    'compass',
    'Unusual spaces, odd problems and ideas that need someone willing to think about them before quoting them.',
    'Tell us the strange one.',
    'Some of the best work starts as "I do not even know if this is possible." A closet that should be an office. An attic landing with wasted volume. A garage bay the family wants back. If it involves reshaping space in a house, it is worth a conversation — and if it is not something we should take on, we will say so and point you at someone who should.',
    [
      'Space-planning conversations before anything is committed',
      'Conversions of underused rooms',
      'Custom built-in and millwork solutions',
      'Multi-room phased renovation planning',
      'Coordination with designers, architects and specialty trades',
      'Staged work that fits a real household budget over time',
    ],
    [
      'Homeowners with an idea and no clear starting point',
      'Houses with wasted or awkward space',
      'Projects that several contractors have declined to think about',
    ],
    [
      'Custom work needs more planning time up front. That is a feature, not a delay.',
      'If a project needs an architect or engineer, we will tell you before taking your money.',
    ],
    ['oakridge-basement', 'brookfield-living-room'],
  ),
];

export const sampleServiceSummaries = sampleServices.map(
  ({ id, slug, name, tagline, summary, icon, image, displayOrder, isFeatured }) => ({
    id,
    slug,
    name,
    tagline,
    summary,
    icon,
    image,
    displayOrder,
    isFeatured,
  }),
);

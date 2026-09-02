using KellumsSecondChance.Server.Domain.Entities;
using KellumsSecondChance.Server.Domain.Enums;

namespace KellumsSecondChance.Server.Data.Seed;

/// <summary>
/// ============================================================================
///  DEMONSTRATION CONTENT
/// ============================================================================
///
///  ⚠ NONE OF THIS IS REAL BUSINESS DATA.
///
///  • Services are CANDIDATE offerings. Somebody at Kellum’s must review the
///    list and remove anything the business does not actually do.
///  • Projects are WRITTEN EXAMPLES, not records of completed jobs. Every one is
///    flagged IsSampleContent so the site labels the gallery honestly.
///  • Testimonials are ILLUSTRATIVE. Every one is flagged IsSampleContent and is
///    excluded from review structured data.
///  • Service areas are PLACEHOLDER GEOGRAPHY with deliberately generic names.
///  • FAQ items whose answer depends on an unset business policy are seeded with
///    a null answer and a ReviewNote, and are withheld from the public FAQ and
///    from FAQ structured data until answered. See SampleContent.Support.cs.
///
///  This mirrors kellumssecondchance.client/src/content/sampleContent/* so the
///  site looks identical whether it is served from the database or the client's
///  offline fallback. Change one, change the other.
/// ============================================================================
/// </summary>
public static class SampleContent
{
    private const int LandscapeWidth = 1600;
    private const int LandscapeHeight = 1067;
    private const int PortraitWidth = 1000;
    private const int PortraitHeight = 1250;

    public static List<RenovationService> Services() =>
    [
        Service(1, "kitchen-remodeling", "Kitchen Remodeling", "The room everyone actually lives in", "chef-hat",
            "From a cabinet-and-counter refresh to moving walls and rebuilding the whole layout — kitchens that work the way you cook.",
            "The kitchen you keep meaning to fix.",
            "Most kitchens do not fail all at once. The drawer stops closing, the counter gets a burn mark, the layout starts fighting you every time two people are in there — and one day you realise you have been working around your kitchen for six years. We rebuild kitchens so they stop being a compromise: better flow, better storage, surfaces you are not afraid to use.",
            [
                "Cabinet installation — new, refaced, or reconfigured",
                "Countertop templating, fabrication coordination and installation",
                "Tile backsplashes and feature walls",
                "Sink, faucet and appliance set-and-connect",
                "Lighting layout, including under-cabinet and island pendants",
                "Flooring, trim, drywall and paint to finish the room out",
                "Coordination with licensed electrical and plumbing trades where the work requires it",
            ],
            [
                "Kitchens with a layout that no longer fits how the household cooks",
                "Cabinets that are structurally fine but visually done",
                "Homeowners who want one crew handling the whole room, not five",
            ],
            [
                "Moving plumbing or gas lines changes both the timeline and the permitting picture — we will tell you that at the walkthrough, not halfway through.",
                "Counter fabrication is measured after cabinets are set, so there is a built-in gap between install days. We plan a working temporary setup around it.",
            ],
            "A remodelled kitchen with new cabinetry, stone counters and an island.", isFeatured: true),

        Service(2, "bathroom-renovations", "Bathroom Renovations", "Small room, zero margin for sloppy work", "shower-head",
            "Tile, waterproofing, vanities and fixtures done properly — because a bathroom is where shortcuts show up first and cost the most.",
            "A bathroom is the least forgiving room in the house.",
            "Every bathroom mistake eventually becomes a water problem. That is why the parts of a bathroom renovation nobody photographs — the waterproofing, the slope to the drain, the blocking behind the grab bar — are the parts we care most about. The tile is the easy part. Doing what is behind it correctly is the job.",
            [
                "Full demolition and haul-away",
                "Shower and tub surrounds with proper waterproofing",
                "Floor and wall tile, including heated-floor underlayment when specified",
                "Vanities, mirrors, lighting and hardware",
                "Fixture installation and trim-out",
                "Ventilation improvements",
                "Accessibility work such as blocking for grab bars, curbless entries and comfort-height fixtures",
            ],
            [
                "Bathrooms with grout failure, soft floors, or any sign of past water damage",
                "Dated but structurally sound rooms that need a full visual reset",
                "Households planning to age in place",
            ],
            [
                "If we open a wall and find rot or an old leak, we stop and show you before we go further. Surprises behind tile are common in older homes.",
                "A single-bathroom home needs a plan for the days the room is out of service. We will build that into the schedule with you.",
            ],
            "A renovated bathroom with a tiled shower enclosure and a new vanity.", isFeatured: true),

        Service(3, "basement-finishing", "Basement Finishing", "The square footage you already paid for", "layers",
            "Turning cold, unfinished storage into a real room — framing, insulation, egress, lighting and finishes that feel like the rest of the house.",
            "You already own this space. Let us make it liveable.",
            "A basement is the cheapest square footage a homeowner will ever add, because the walls, roof and slab already exist. The work is in making it feel like it belongs to the house above it: dry, warm, properly lit, and finished to the same standard as the main floor — not an obvious afterthought with a drop ceiling.",
            [
                "Moisture assessment before any framing goes up",
                "Framing, insulation and vapour management",
                "Drywall, taping and finishing",
                "Egress and code-required safety considerations",
                "Lighting design for low ceilings",
                "Flooring suited to below-grade conditions",
                "Built-ins, bars, media walls and storage",
                "Bathroom or laundry rough-in coordination",
            ],
            [
                "Dry basements with adequate ceiling height",
                "Families who need another bedroom, office, or place for teenagers to exist",
                "Homeowners weighing finishing versus moving",
            ],
            [
                "We will not frame over an active moisture problem. If the basement takes on water, that gets solved first — sometimes by someone other than us.",
                "Ceiling height, existing ductwork and beam locations shape what is realistic. We map that at the walkthrough.",
            ],
            "A finished basement with recessed lighting and built-in storage.", isFeatured: true),

        Service(4, "interior-renovations", "Interior Renovations", "Whole rooms, reworked", "home",
            "Living rooms, bedrooms, dining rooms and the awkward spaces in between — reconfigured, refinished and brought back to life.",
            "Not every renovation has a category.",
            "Sometimes the problem is not one room, it is the way three rooms meet. A wall that should not be there. A dining room nobody uses. A hallway that eats light. Interior renovation work is where we reshape how a house actually functions, and it is often the work that changes daily life the most.",
            [
                "Non-structural wall removal and openings (with engineering input when a wall is load-bearing)",
                "Room reconfiguration and layout changes",
                "Ceiling repairs, including removing dated textures",
                "Fireplace surrounds and feature walls",
                "Built-in shelving, benches and storage",
                "Complete drywall, trim, flooring and paint",
            ],
            [
                "Houses where the floor plan fights the family",
                "Rooms that have been \"temporarily\" unfinished for years",
                "Homeowners who want a coherent look across a whole floor rather than one nice room",
            ],
            [
                "Load-bearing walls need a structural engineer and a permit. We bring that up early because it changes both cost and schedule.",
                "Matching existing trim and flooring profiles in older homes is sometimes impossible; we will show you options rather than quietly substituting.",
            ],
            "A renovated living room with a rebuilt fireplace and new flooring."),

        Service(5, "flooring", "Flooring", "Where the whole room starts", "grid-3x3",
            "Hardwood, engineered, luxury vinyl plank and tile — installed flat, tight and with transitions that do not trip you.",
            "Flat, tight, and quiet underfoot.",
            "Good flooring is mostly invisible work: subfloor prep, moisture checks, acclimation, layout planning so you do not end up with a two-inch sliver plank at the most visible wall in the room. Anybody can lay a floor. Making it stay flat, silent and square is the part that takes experience.",
            [
                "Subfloor assessment, levelling and repair",
                "Hardwood and engineered hardwood installation",
                "Luxury vinyl plank and tile",
                "Ceramic, porcelain and stone tile",
                "Stair treads, risers and nosing",
                "Baseboard, quarter round and transition detailing",
                "Removal and disposal of existing flooring",
            ],
            [
                "Homes with squeaks, soft spots or visible height changes between rooms",
                "Whole-floor replacements where consistency matters",
                "Rental properties needing durable, fast-turnaround surfaces",
            ],
            [
                "Existing floors sometimes hide subfloor damage. We check before quoting where we can, but some of it only appears on demolition day.",
                "Below-grade and high-moisture rooms rule out certain materials. We will steer you away from products that will not survive there.",
            ],
            "New hardwood flooring installed wall to wall with fresh baseboard."),

        Service(6, "drywall-and-painting", "Drywall & Painting", "The finish everyone sees", "paint-roller",
            "Hanging, taping, patching and painting — including repairs that make the finished work look complete rather than touched up.",
            "The surface people actually look at.",
            "Drywall is where careless work is most obvious. Light rakes across a wall and shows every seam, every nail pop, every patch that was floated too tight. We take the extra passes, because a beautiful kitchen with a wavy wall behind it still reads as a cheap job.",
            [
                "New drywall hanging, taping and finishing",
                "Patch and repair work, including water-damage repairs after the source is fixed",
                "Texture removal and smooth-wall conversions",
                "Skim coating",
                "Interior painting — walls, ceilings, trim and doors",
                "Caulking and detail work",
                "Surface preparation and priming",
            ],
            [
                "Rooms with cracked, damaged or dated textured surfaces",
                "Anyone who has tried patching a ceiling and would like to stop",
                "Projects that need a professional finish level, not a rental-grade one",
            ],
            [
                "Water-damaged drywall means finding the leak first. Painting over a stain does not fix anything.",
                "Colour looks different in your house than on the chip. We encourage sample patches before committing a whole floor.",
            ],
            "Smooth new drywall and freshly painted trim in a renovated room."),

        Service(7, "carpentry-and-trim", "Carpentry & Trim", "The details that make a project feel finished", "ruler",
            "Baseboard, casing, crown, wainscoting, built-ins and stair work — tight joints and clean reveals.",
            "This is where craftsmanship is visible.",
            "Trim carpentry is the part of a renovation people run their hand along. Mitres that stay closed through a season of humidity, reveals that are consistent from one door to the next, scribes that follow a wall that has not been plumb since 1948. It is slow work and it is worth it.",
            [
                "Baseboard, door and window casing",
                "Crown moulding and ceiling detail",
                "Wainscoting, board-and-batten and panelled walls",
                "Built-in shelving, benches, mudroom lockers and window seats",
                "Stair treads, risers, skirt boards and railings",
                "Interior door hanging and hardware",
                "Custom pieces built for the space rather than bought to fit it",
            ],
            [
                "Character homes where existing profiles need matching",
                "Rooms that feel plain and cannot be fixed with paint",
                "Storage problems that furniture will not solve",
            ],
            [
                "Reproducing a discontinued historic profile may require custom milling, which adds lead time.",
                "Old houses move. We build with that in mind, but seasonal gapping in solid wood is normal, not a defect.",
            ],
            "Custom wall panelling and painted trim carpentry."),

        Service(8, "doors-and-windows", "Doors & Windows", "Openings that seal, swing and last", "door-open",
            "Replacement and new openings — installed square, insulated properly and trimmed out to match the room.",
            "A door should not need a shoulder.",
            "Windows and doors are where a house meets the weather, and where bad installation shows up as a draft, a stuck sash or a rotten sill ten years later. Getting them plumb, level, square and properly sealed matters more than the sticker on the glass.",
            [
                "Interior and exterior door replacement",
                "Window replacement in existing openings",
                "New rough openings where the structure allows",
                "Patio and sliding door installation",
                "Weatherproofing, flashing and insulation detailing",
                "Interior and exterior trim, casing and finishing",
                "Hardware installation and adjustment",
            ],
            [
                "Drafty, painted-shut or failing units",
                "Rooms that need more daylight",
                "Entryways that have never closed properly",
            ],
            [
                "Cutting a new opening in an exterior wall is structural work and needs permitting.",
                "Window lead times vary by manufacturer and can be long. We order early and schedule around confirmed delivery, not promised delivery.",
            ],
            "New windows and trim in a renovated living space."),

        Service(9, "decks-and-exteriors", "Decks & Exterior Improvements", "Outside deserves the same standard", "trees",
            "Deck rebuilds, railings, stairs, siding repair and exterior trim — built for weather, not for photos.",
            "Built to survive a decade of weather.",
            "Exterior work gets judged by winter. Fasteners that will not bleed, framing that drains, flashing where two materials meet, railings that do not wobble when someone leans on them at a party. We build outside the way we would build for our own families.",
            [
                "Deck rebuilds and new deck construction",
                "Railing, stair and baluster work",
                "Decking board replacement over sound framing",
                "Pergolas, privacy screens and built-in benches",
                "Exterior trim, fascia and soffit repair",
                "Siding repair and targeted replacement",
                "Exterior door and threshold work",
            ],
            [
                "Decks with soft boards, wobbly rails or visible rot",
                "Outdoor spaces that go unused because they are unpleasant",
                "Homes with exterior trim that has started to fail",
            ],
            [
                "Deck framing condition is not fully knowable until boards come off. We quote in stages when there is doubt rather than guessing high.",
                "Exterior work is weather-dependent. We build schedule slack in rather than rushing a wet install.",
            ],
            "A rebuilt deck with new boards, railings and balusters.", isFeatured: true),

        Service(10, "repair-and-restoration", "Repair & Restoration", "Fixing what went wrong", "wrench",
            "Water damage, settling, failed past work and general disrepair — assessed honestly and put right.",
            "Somebody has to fix it properly.",
            "A lot of our work starts with a phone call that begins \"somebody already tried to fix this.\" Failed repairs, water that found a path, a floor that has been soft for two years. Restoration work needs diagnosis before it needs materials, and we would rather tell you the real cause than sell you a cosmetic patch.",
            [
                "Water-damage repair once the source has been resolved",
                "Subfloor and joist repair",
                "Rot remediation in trim, sills and framing",
                "Correcting failed or unfinished previous work",
                "Drywall, plaster and ceiling repairs",
                "Door, window and hardware repair",
                "General handyman-scale repair lists in one visit",
            ],
            [
                "Homes with a problem nobody has been able to explain",
                "Recently purchased houses with inherited issues",
                "Anyone holding a long list of small unfinished things",
            ],
            [
                "We do not do emergency water extraction or mould remediation — those need a specialist, and we will tell you to call one.",
                "Repair scope can grow once things are opened up. We price the known work and flag the unknowns instead of burying them.",
            ],
            "A repaired and refinished laundry area with new cabinetry."),

        Service(11, "rental-property-turnovers", "Rental Property Turnovers", "Fast, durable, back on the market", "key-round",
            "Between-tenant work on a schedule that respects vacancy costs — durable finishes, one point of contact, predictable timelines.",
            "Every vacant day costs you money.",
            "Turnover work is a different discipline from a family renovation. The finishes need to survive tenants, the schedule matters more than the mood board, and you need someone who will walk the unit, send you a list, and get it done without three weeks of back-and-forth.",
            [
                "Full-unit paint and drywall repair",
                "Durable flooring replacement",
                "Cabinet, counter and hardware refresh",
                "Fixture and appliance replacement",
                "Door, lock and hardware work",
                "Punch-list repairs from move-out inspections",
                "Photo-documented condition reporting",
            ],
            [
                "Landlords and property managers with recurring turnover work",
                "Units that need a durable reset rather than a premium remodel",
                "Owners managing property from out of town",
            ],
            [
                "Turnover pricing depends heavily on unit condition at move-out. We walk the unit before quoting.",
                "Tight vacancy windows need materials confirmed in advance — we will ask you to make selections early.",
            ],
            "A turned-over rental unit with new flooring and clean finishes."),

        Service(12, "custom-renovation-projects", "Custom Renovation Projects", "The one that does not fit a category", "compass",
            "Unusual spaces, odd problems and ideas that need someone willing to think about them before quoting them.",
            "Tell us the strange one.",
            "Some of the best work starts as \"I do not even know if this is possible.\" A closet that should be an office. An attic landing with wasted volume. A garage bay the family wants back. If it involves reshaping space in a house, it is worth a conversation — and if it is not something we should take on, we will say so and point you at someone who should.",
            [
                "Space-planning conversations before anything is committed",
                "Conversions of underused rooms",
                "Custom built-in and millwork solutions",
                "Multi-room phased renovation planning",
                "Coordination with designers, architects and specialty trades",
                "Staged work that fits a real household budget over time",
            ],
            [
                "Homeowners with an idea and no clear starting point",
                "Houses with wasted or awkward space",
                "Projects that several contractors have declined to think about",
            ],
            [
                "Custom work needs more planning time up front. That is a feature, not a delay.",
                "If a project needs an architect or engineer, we will tell you before taking your money.",
            ],
            "A custom renovation with bespoke cabinetry and detailing."),
    ];

    private static RenovationService Service(
        int order,
        string slug,
        string name,
        string tagline,
        string icon,
        string summary,
        string headline,
        string introduction,
        List<string> includes,
        List<string> bestFor,
        List<string> considerations,
        string imageAlt,
        bool isFeatured = false) => new()
        {
            Slug = slug,
            Name = name,
            Tagline = tagline,
            Icon = icon,
            Summary = summary,
            Headline = headline,
            Introduction = introduction,
            Includes = includes,
            BestFor = bestFor,
            Considerations = considerations,
            ImagePath = $"/media/services/{slug}.svg",
            ImageWidth = LandscapeWidth,
            ImageHeight = LandscapeHeight,
            ImageAlt = imageAlt,
            DisplayOrder = order,
            IsFeatured = isFeatured,
            IsActive = true,
            MetaTitle = $"{name} | Kellum’s Second Chance Renovations",
            MetaDescription = summary,
        };

    /* ------------------------------------------------------------ projects */

    public static List<(RenovationProject Project, string[] ServiceSlugs)> Projects() =>
    [
        (Project(1, "maple-street-kitchen", "The Kitchen That Stopped Working", "Kitchen Remodeling", "kitchen-remodeling",
            "Maple Street", new DateOnly(2025, 4, 18), "Approximately five weeks", "Single-family home", true,
            "A closed-off galley kitchen with failing cabinets became an open, working room with an island the whole family ends up standing around.",
            "The kitchen had been laid out for one cook and one appliance at a time. Two people could not pass each other. The cabinet boxes had swollen at the base from a dishwasher leak nobody had caught, the counter had a burn mark the family had covered with a cutting board for four years, and a half-wall blocked every bit of afternoon light from reaching the sink.",
            "The homeowners did not want a showpiece. They wanted to be able to cook dinner while a teenager did homework in the same room. That meant opening the half-wall, moving the primary prep zone to an island, and getting real storage where they actually reach for things.",
            "We removed the half-wall, reframed the opening and rebuilt the cabinet run along the exterior wall. New base and upper cabinetry, quartz counters, a full-height tile backsplash and an island sized to seat three. Under-cabinet lighting replaced the single ceiling fixture, and the flooring was carried through from the adjoining dining room so the two rooms finally read as one space.",
            "The room now takes four people without anyone apologising. The family reports that the island is where everyone ends up, which is the outcome they asked for.",
            [
                "Half-wall removed and opening reframed",
                "Full cabinetry replacement with quartz counters",
                "Island seating for three",
                "Flooring carried through to the dining room",
            ],
            [
                Image(ProjectImageKind.Cover, "cover", "A renovated kitchen with dark cabinetry, a large island and pendant lighting.", 0, null, null),
                Image(ProjectImageKind.Before, "before", "The original kitchen with dated cabinets, a damaged counter and a half-wall blocking daylight.", 1, "Swollen cabinet bases and a counter the family had been covering up.", "main"),
                Image(ProjectImageKind.After, "after", "The rebuilt kitchen with new cabinetry, quartz counters and an island.", 2, "The same view with the half-wall gone.", "main"),
                Image(ProjectImageKind.Gallery, "gallery-1", "New hardwood flooring carried from the kitchen into the dining room.", 3, "Flooring runs unbroken between the two rooms.", null, portrait: true),
                Image(ProjectImageKind.Gallery, "gallery-2", "Painted trim and panelling detail beside the new cabinet run.", 4, null, null),
            ]),
            ["kitchen-remodeling", "flooring", "carpentry-and-trim", "drywall-and-painting"]),

        (Project(2, "harborview-primary-bath", "Twenty Years of Slow Water Damage", "Bathroom Renovations", "bathroom-renovations",
            "Harborview", new DateOnly(2025, 6, 9), "Approximately four weeks", "Single-family home", true,
            "Failed grout had been quietly letting water into the subfloor for years. The room was taken back to framing and rebuilt to stay dry.",
            "The homeowners called about replacing a vanity. During the walkthrough the floor flexed near the shower curb — never a good sign. Grout at the base of the surround had failed long ago, and water had been travelling into the subfloor on every shower since. The vanity was the least of the problem.",
            "Once we showed them what was under the tile, the conversation changed from cosmetic to structural. They wanted it done once and done right: a shower that would not leak again, a floor that felt solid, and a finished space that finally matched the rest of a house they had recently updated.",
            "Full demolition to framing. Damaged subfloor and two joist sections were repaired, the shower was rebuilt with a proper sloped base and a bonded waterproofing membrane, and the whole room was re-tiled. A floating vanity with a solid surface top, a frameless glass enclosure, new ventilation and blocking installed behind the walls for future grab bars.",
            "A part of the house the homeowners can stop worrying about. The blocking behind the tile means accessibility hardware can be added later without opening anything back up.",
            [
                "Subfloor and joist repair after long-term water intrusion",
                "Shower rebuilt with bonded waterproofing membrane",
                "Frameless glass enclosure and floating vanity",
                "Blocking installed for future accessibility hardware",
            ],
            [
                Image(ProjectImageKind.Cover, "cover", "A renovated bathroom with a glass-enclosed tiled shower and a floating vanity.", 0, null, null),
                Image(ProjectImageKind.Before, "before", "The original bathroom with failing grout, a dated vanity and a worn tub surround.", 1, "Grout failure at the curb had been going on for years.", "main"),
                Image(ProjectImageKind.After, "after", "The rebuilt bathroom with a tiled walk-in shower, glass enclosure and floating vanity.", 2, "Rebuilt from the framing out.", "main"),
                Image(ProjectImageKind.Gallery, "gallery-1", "New painted trim and panelling beside the vanity wall.", 3, null, null, portrait: true),
                Image(ProjectImageKind.Gallery, "gallery-2", "New tile flooring running to a fresh baseboard.", 4, null, null),
            ]),
            ["bathroom-renovations", "repair-and-restoration", "carpentry-and-trim"]),

        (Project(3, "oakridge-basement", "Nine Hundred Square Feet of Storage", "Basement Finishing", "basement-finishing",
            "Oakridge", new DateOnly(2025, 2, 27), "Approximately seven weeks", "Single-family home", true,
            "An unfinished basement used for boxes and a treadmill became the room the family spends most evenings in.",
            "Bare block walls, exposed joists, one bare bulb and a slab that got cold enough in February that nobody went down there. The family had outgrown their main floor but did not want to move. The obvious answer was already in the house — it was just being used to store things nobody had opened in six years.",
            "A finished part of the house rather than a basement with furniture in it. Warm, properly lit despite low ceilings, with enough built-in storage that the boxes had somewhere to go.",
            "We started with a moisture assessment and confirmed the basement was dry. Framing and insulation went in against the block, ductwork was reworked to preserve height, and lighting was laid out for a low ceiling — recessed cans on a tight grid rather than a few bright fixtures. A shiplap media wall, built-in base cabinetry along one side, and flooring rated for below-grade use.",
            "The family got a second living space without moving house, and the storage they lost was replaced by built-ins that hold considerably more.",
            [
                "Moisture assessment completed before any framing",
                "Ductwork reworked to preserve ceiling height",
                "Recessed lighting laid out for a low ceiling",
                "Built-in storage and shiplap media wall",
            ],
            [
                Image(ProjectImageKind.Cover, "cover", "A finished basement with recessed lighting, built-in cabinetry and a media wall.", 0, null, null),
                Image(ProjectImageKind.Before, "before", "An unfinished basement with bare block walls, exposed joists and a single bulb.", 1, "Block walls, exposed joists, one bulb.", "main"),
                Image(ProjectImageKind.After, "after", "The finished basement with recessed lighting, built-ins and new flooring.", 2, "The same room, finished to match the house above it.", "main"),
                Image(ProjectImageKind.Gallery, "gallery-1", "A renovated living area with a rebuilt feature wall and new flooring.", 3, null, null, portrait: true),
                Image(ProjectImageKind.Gallery, "gallery-2", "Below-grade rated flooring installed wall to wall.", 4, null, null),
            ]),
            ["basement-finishing", "flooring", "drywall-and-painting", "custom-renovation-projects"]),

        (Project(4, "brookfield-living-room", "The Wall That Was In The Way", "Interior Renovations", "interior-renovations",
            "Brookfield", new DateOnly(2024, 11, 14), "Approximately eight weeks", "Single-family home", true,
            "Three cramped rooms became one, with a rebuilt fireplace surround, new trim throughout and daylight that finally reaches the back of the house.",
            "A 1950s floor plan chopped the main floor into a formal living room nobody sat in, a dining room used as a dumping ground, and a dark middle hallway. The fireplace surround had been \"updated\" at some point with materials that had not aged well, and the trim had been painted so many times the profiles had disappeared.",
            "Open the main floor without gutting the character of the house. Keep the fireplace as the anchor, get light from the front windows all the way to the back, and put trim back that looks like it belongs in a house of this age.",
            "The dividing wall was load-bearing, so a structural engineer specified a beam and we permitted the work. With the wall gone, we rebuilt the fireplace surround, ran new hardwood across the whole floor, and installed new baseboard, casing and crown milled to match the original profiles still present in the upstairs bedrooms. Windows were replaced in their existing openings.",
            "One room instead of three, with the original character intact. The homeowners say they use the front of the house for the first time since they bought it.",
            [
                "Load-bearing wall removed with engineered beam and permit",
                "Trim profiles matched to the home's original millwork",
                "New hardwood across the full main floor",
                "Windows replaced in existing openings",
            ],
            [
                Image(ProjectImageKind.Cover, "cover", "A renovated living room with a rebuilt fireplace, large windows and hardwood floors.", 0, null, null),
                Image(ProjectImageKind.Before, "before", "A dark, divided living room with dated trim and a worn fireplace surround.", 1, "Three rooms, none of them used.", "main"),
                Image(ProjectImageKind.After, "after", "The opened living space with a rebuilt fireplace, new trim and hardwood floors.", 2, "One room, with the beam doing the work the wall used to.", "main"),
                Image(ProjectImageKind.Gallery, "gallery-1", "New crown moulding and panelling matched to the home's original profiles.", 3, "Profiles milled to match the upstairs originals.", null, portrait: true),
                Image(ProjectImageKind.Gallery, "gallery-2", "New hardwood flooring running the length of the main floor.", 4, null, null),
            ]),
            ["interior-renovations", "carpentry-and-trim", "flooring", "doors-and-windows", "drywall-and-painting"]),

        (Project(5, "cedar-lane-deck", "A Deck Nobody Trusted", "Decks & Exteriors", "decks-and-exteriors",
            "Cedar Lane", new DateOnly(2025, 7, 22), "Approximately two weeks", "Single-family home", false,
            "Soft boards and a railing that moved when you leaned on it. Rebuilt on sound framing with proper drainage and hardware that will not bleed.",
            "The homeowners had stopped using the deck. Two boards near the door had gone soft, the railing flexed under a hand, and the fasteners had rust-bled dark streaks down every board. It looked worse than it was, but the parts that were actually dangerous were not the parts they were worried about.",
            "They expected to be told the whole thing had to come out. They wanted honesty more than they wanted a sales pitch.",
            "We pulled boards and inspected the framing, which was largely sound — the joists were fine, three had localised rot at the ledger end, and the posts were solid. We replaced the damaged framing members, re-flashed the ledger, installed new decking with hidden fasteners, and rebuilt the railing and stairs properly. The homeowners kept the framing they had already paid for once.",
            "A deck that is safe and gets used again, at meaningfully less than a full teardown would have cost.",
            [
                "Framing inspected and retained where sound",
                "Ledger re-flashed to stop water at the house",
                "Hidden fasteners — no rust bleed",
                "Railing and stairs rebuilt to be genuinely solid",
            ],
            [
                Image(ProjectImageKind.Cover, "cover", "A rebuilt rear deck with new decking boards, railings and balusters.", 0, null, null),
                Image(ProjectImageKind.Before, "before", "A worn deck with soft boards, rust-stained fasteners and a loose railing.", 1, "Rust bleed and boards that had gone soft near the door.", "main"),
                Image(ProjectImageKind.After, "after", "The rebuilt deck with new boards, a solid railing and clean hardware.", 2, "Same framing where it was sound, everything else new.", "main"),
                Image(ProjectImageKind.Gallery, "gallery-1", "New exterior trim and railing detail at the stair.", 3, null, null, portrait: true),
            ]),
            ["decks-and-exteriors", "carpentry-and-trim", "repair-and-restoration"]),

        (Project(6, "rental-turnover-duplex", "Eleven Days Between Tenants", "Rental Property Turnovers", "rental-property-turnovers",
            "Duplex unit", new DateOnly(2025, 5, 30), "Eleven days", "Rental — duplex unit", false,
            "A full turnover on a hard deadline: paint, flooring, a kitchen refresh and a long punch list, finished before the vacancy started costing real money.",
            "A four-year tenancy had ended and the unit showed it: worn carpet throughout, wall damage in every room, a kitchen with cabinet doors that no longer closed, and a move-out inspection list twenty-two items long. The owner had a signed lease starting in under two weeks.",
            "Durable, not precious. Every choice had to survive the next tenancy and be available off the shelf — nothing on a four-week lead time.",
            "Carpet came out and luxury vinyl plank went in throughout. Full drywall repair and repaint. The kitchen cabinets were structurally sound, so we refaced rather than replaced, added new hardware and a new counter. Fixtures, blinds, locks and the full punch list were handled in the same visit, with photo documentation for the owner at every stage.",
            "The unit was ready with three days to spare, and the owner had a photographic record of the condition it was handed over in.",
            [
                "Completed inside an eleven-day vacancy window",
                "Cabinets refaced rather than replaced to save cost and time",
                "Durable luxury vinyl plank throughout",
                "Photo-documented condition report at handover",
            ],
            [
                Image(ProjectImageKind.Cover, "cover", "A refreshed rental unit laundry and utility area with new cabinetry and flooring.", 0, null, null),
                Image(ProjectImageKind.Before, "before", "A worn rental unit with damaged walls, dated cabinets and failing flooring.", 1, "Four years of tenancy and a twenty-two item punch list.", "main"),
                Image(ProjectImageKind.After, "after", "The refreshed unit with new flooring, repainted walls and refaced cabinetry.", 2, "Durable finishes, off-the-shelf materials, eleven days.", "main"),
                Image(ProjectImageKind.Gallery, "gallery-1", "New luxury vinyl plank flooring installed throughout the unit.", 3, null, null, portrait: true),
                Image(ProjectImageKind.Gallery, "gallery-2", "The refreshed kitchen with refaced cabinets and a new counter.", 4, null, null),
            ]),
            ["rental-property-turnovers", "flooring", "drywall-and-painting", "kitchen-remodeling", "repair-and-restoration"]),
    ];

    private static RenovationProject Project(
        int order,
        string slug,
        string title,
        string categoryName,
        string categorySlug,
        string? location,
        DateOnly completedOn,
        string durationLabel,
        string propertyType,
        bool isFeatured,
        string summary,
        string challenge,
        string vision,
        string transformation,
        string outcome,
        List<string> highlights,
        List<(ProjectImageKind Kind, string File, string Alt, int Order, string? Caption, string? PairKey, bool Portrait)> images)
    {
        var project = new RenovationProject
        {
            Slug = slug,
            Title = title,
            CategoryName = categoryName,
            CategorySlug = categorySlug,
            Location = location,
            Summary = summary,
            Challenge = challenge,
            Vision = vision,
            Transformation = transformation,
            Outcome = outcome,
            CompletedOn = completedOn,
            DurationLabel = durationLabel,
            PropertyType = propertyType,
            Highlights = highlights,
            IsFeatured = isFeatured,
            IsActive = true,
            IsSampleContent = true,
            DisplayOrder = order,
            MetaTitle = $"{title} | Kellum’s Second Chance Renovations",
            MetaDescription = summary,
        };

        foreach (var image in images)
        {
            project.Images.Add(new RenovationProjectImage
            {
                Path = $"/media/projects/{slug}/{image.File}.svg",
                Width = image.Portrait ? PortraitWidth : LandscapeWidth,
                Height = image.Portrait ? PortraitHeight : LandscapeHeight,
                AltText = image.Alt,
                Caption = image.Caption,
                Kind = image.Kind,
                DisplayOrder = image.Order,
                PairKey = image.PairKey,
            });
        }

        return project;
    }

    private static (ProjectImageKind, string, string, int, string?, string?, bool) Image(
        ProjectImageKind kind,
        string file,
        string alt,
        int order,
        string? caption,
        string? pairKey,
        bool portrait = false) => (kind, file, alt, order, caption, pairKey, portrait);
}

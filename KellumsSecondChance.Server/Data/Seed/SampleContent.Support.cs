using KellumsSecondChance.Server.Domain.Entities;
using KellumsSecondChance.Server.Domain.Enums;

namespace KellumsSecondChance.Server.Data.Seed;

public static partial class SampleContentSupport
{
    /// <summary>
    /// ⚠ ILLUSTRATIVE REVIEWS — NOT REAL CUSTOMER STATEMENTS.
    ///
    /// Every record is IsSampleContent = true. The UI labels these wherever they
    /// appear and the client omits review structured data entirely while any
    /// displayed review is sample content. Delete these as real reviews arrive.
    /// </summary>
    public static List<CustomerTestimonial> Testimonials() =>
    [
        Testimonial(1, 5,
            "They found water damage under our shower that two other contractors had walked right past. Instead of quietly covering it up, they pulled us in, showed us the subfloor, and explained what it would take. That is the moment we knew we had picked the right crew.",
            "Bathroom Renovations", new DateOnly(2025, 6, 20), isFeatured: true),

        Testimonial(2, 5,
            "What I noticed most was the cleanup. Every single evening the floors were swept, the tools were stacked, and the plastic was back up. Six weeks of work and we never once felt like we had lost our house.",
            "Kitchen Remodeling", new DateOnly(2025, 4, 29), isFeatured: true),

        Testimonial(3, 5,
            "We expected to be told the whole deck had to come out. They pulled boards, checked the framing, and told us most of it was fine. It cost us less than we had budgeted, which is not something I have ever said about a contractor before.",
            "Decks & Exteriors", new DateOnly(2025, 8, 1), isFeatured: true),

        Testimonial(4, 5,
            "Our basement had been a storage room for eleven years. It is now where the kids do homework and we watch films. I keep going down there just because I can.",
            "Basement Finishing", new DateOnly(2025, 3, 11)),

        Testimonial(5, 5,
            "The trim work is the part I show people. The mitres are still tight a year later and the profiles actually match what is upstairs. Whoever ran that saw knew exactly what they were doing.",
            "Carpentry & Trim", new DateOnly(2025, 1, 16)),

        Testimonial(6, 4,
            "A material delay pushed us back about a week, which was frustrating. But they told me the day they found out rather than the day it mattered, and they had a plan. I would still hire them again without hesitating.",
            "Interior Renovations", new DateOnly(2024, 12, 4)),

        Testimonial(7, 5,
            "I manage six units and turnovers are usually a three-week headache of chasing people. They walked the unit, sent me a list, and it was done in eleven days with photos of everything.",
            "Rental Property Turnovers", new DateOnly(2025, 6, 2)),

        Testimonial(8, 5,
            "They walked our house and told us one of the three things on our list was not worth doing yet. Turning down work to give us honest advice is why we called them back six months later for the big project.",
            "Repair & Restoration", new DateOnly(2025, 2, 8), isFeatured: true),
    ];

    /// <summary>
    /// Attributed to "Example review" rather than an invented person, so the
    /// attribution line itself can never read as a real customer.
    /// </summary>
    private static CustomerTestimonial Testimonial(
        int order,
        byte rating,
        string quote,
        string category,
        DateOnly reviewedOn,
        bool isFeatured = false) => new()
        {
            FirstName = "Example review",
            LastInitial = null,
            Location = null,
            Rating = rating,
            Quote = quote,
            ProjectCategory = category,
            ReviewedOn = reviewedOn,
            IsFeatured = isFeatured,
            IsActive = true,
            IsSampleContent = true,
            Source = TestimonialSource.Direct,
            DisplayOrder = order,
        };

    /// <summary>
    /// ⚠ PLACEHOLDER GEOGRAPHY. Names are deliberately generic so nobody mistakes
    /// them for confirmed coverage. Replace before launch.
    /// </summary>
    public static List<ServiceArea> ServiceAreas() =>
    [
        new()
        {
            Name = "Primary service city",
            Kind = ServiceAreaKind.City,
            IsPrimary = true,
            Note = "Placeholder — replace with the main city Kellum’s serves.",
            DisplayOrder = 1,
            IsActive = true,
            IsSampleContent = true,
        },
        new()
        {
            Name = "Surrounding county",
            Kind = ServiceAreaKind.County,
            IsPrimary = true,
            Note = "Placeholder — replace with the county or counties covered.",
            DisplayOrder = 2,
            IsActive = true,
            IsSampleContent = true,
        },
        new()
        {
            Name = "Neighbouring towns",
            Kind = ServiceAreaKind.Region,
            IsPrimary = false,
            Note = "Placeholder — list the surrounding towns Kellum’s travels to.",
            DisplayOrder = 3,
            IsActive = true,
            IsSampleContent = true,
        },
    ];

    /// <summary>
    /// FAQ content.
    ///
    /// Questions whose answer depends on an unset business policy are seeded with
    /// a null answer and a ReviewNote. They are NeedsReview, so they never reach
    /// the public FAQ or its structured data — the same treatment a null phone
    /// number gets. Answering them in /admin/faqs publishes them.
    /// </summary>
    public static List<FaqItem> Faqs()
    {
        var order = 0;

        // `answer: null` means there is no honest answer without a business policy
        // that has not been set. Those items are NeedsReview: withheld from the
        // public FAQ and from the FAQ structured data, visible only in /admin/faqs.
        FaqItem Faq(
            string categorySlug,
            string category,
            string question,
            string? answer,
            string? reviewNote = null) => new()
        {
            Question = question,
            Answer = answer ?? string.Empty,
            Category = category,
            CategorySlug = categorySlug,
            DisplayOrder = ++order,
            IsActive = true,
            NeedsReview = answer is null,
            ReviewNote = reviewNote,
        };

        return
        [
            Faq("getting-started", "Getting Started",
                "I am not sure what I actually want yet. Is it too early to call?",
                "No — that is genuinely one of the better times to call. A lot of our conversations start with \"the kitchen is bad but I do not know what to do about it.\" Part of our job is walking the space and helping you separate what is possible from what is worth doing. You do not need a plan before you talk to us."),
            Faq("getting-started", "Getting Started",
                "How do I know if my project is too small for you?",
                "Ask. Small, well-defined jobs are often the easiest thing to schedule, and plenty of larger projects started as a small one. If a project is not a fit for us, we will say so and, where we can, point you toward someone better suited."),
            Faq("getting-started", "Getting Started",
                "Do you work on older homes?",
                "Yes. Older homes take more care — nothing is plumb, profiles are discontinued, and there is usually a previous repair to work around — but that is much of what renovation work is. We will tell you where an older house makes something harder or more expensive before you commit."),
            Faq("getting-started", "Getting Started",
                "What information helps most on a first call?",
                "Roughly what room, roughly what is wrong with it, and roughly when you would like it done. Photos help enormously. If you already have a budget range in mind, sharing it early saves everyone time — it lets us tell you honestly whether the scope and the number line up."),

            Faq("estimates", "Estimates",
                "What happens after I submit an estimate request?",
                "We read it, and we get back to you to arrange a time to see the space. Renovation work cannot be priced accurately from a form — we need to look at what is actually there. The form exists so that when we do speak, we already understand what you are trying to solve."),
            Faq("estimates", "Estimates",
                "Do you charge for an estimate?",
                null,
                "The supplied logo prints \"FREE ESTIMATES\" — so the answer is very likely yes. Confirm that, and confirm whether detailed design work or a full measured plan is charged separately, then answer this and publish it."),
            Faq("estimates", "Estimates",
                "Why is my estimate a range instead of one number?",
                "Because some things are genuinely unknown until a wall or a floor is open. We would rather give you an honest range with the variables named than a single confident number that changes the moment we start. Where the scope is fully knowable, you will get a fixed figure."),
            Faq("estimates", "Estimates",
                "How long is an estimate good for?",
                null,
                "Decide how long a written estimate stays valid before it has to be re-priced."),

            Faq("scheduling", "Scheduling",
                "How far out are you booking?",
                "It varies with the season and the size of the project. We will give you a realistic answer when we talk rather than an optimistic one — a start date we can actually hold is worth more to you than an early one we cannot."),
            Faq("scheduling", "Scheduling",
                "Will the same people be in my house every day?",
                "Renovation work involves different trades at different stages, so the faces change as the project moves through demolition, rough-in and finish work. What stays constant is who you talk to. You will not have to explain your project again to whoever turns up."),
            Faq("scheduling", "Scheduling",
                "What hours do you work?",
                "Normal working hours, and we will confirm the specific daily window before we start so you can plan around it. If something needs an early start or a weekend, we ask first."),

            Faq("the-process", "The Renovation Process",
                "What does the process actually look like?",
                "Five stages: you tell us what needs a second chance, we walk the space, we build a plan and a price, we do the work, and we finish properly. Each stage ends with you knowing what happens next. There is a fuller breakdown on the homepage."),
            Faq("the-process", "The Renovation Process",
                "Do you handle permits?",
                "For work that requires them, permitting is part of the plan and we will tell you at the estimate stage whether your project needs one. Structural changes, new openings in exterior walls and some mechanical work typically do. We will not start permit-required work without one."),
            Faq("the-process", "The Renovation Process",
                "Do you use subcontractors?",
                "For licensed trades — electrical, plumbing, HVAC, structural engineering — yes, because that work should be done by people who do it every day and carry the right licence. We coordinate them and remain your single point of contact."),
            Faq("the-process", "The Renovation Process",
                "How do you communicate during a project?",
                "You get a point of contact and an agreed way of reaching them. We tell you about problems on the day we find them, not at the end. Most complaints homeowners have about renovations are communication problems rather than craftsmanship problems, and we take that seriously."),

            Faq("living-in-the-home", "Living in the Home During Work",
                "Can we stay in the house during the work?",
                "For most projects, yes. We plan containment, dust control and the daily working area around the fact that people live there. For whole-floor or single-bathroom projects there may be days that are genuinely disruptive, and we will flag those in advance so you can plan."),
            Faq("living-in-the-home", "Living in the Home During Work",
                "How do you handle dust?",
                "Containment barriers, floor protection on the path in and out, and cleanup at the end of every working day. Renovation dust is impossible to eliminate entirely, but a site that gets swept nightly is a completely different experience from one that does not."),
            Faq("living-in-the-home", "Living in the Home During Work",
                "What about pets and kids?",
                "Tell us at the walkthrough. Knowing there is a dog who bolts for open doors, or a child asleep at midday, changes how we set up the site. It is much easier to plan around than to react to."),
            Faq("living-in-the-home", "Living in the Home During Work",
                "Will we lose our kitchen or bathroom completely?",
                "For a full remodel of a single-bathroom home or a kitchen gut, there will be a period without it. We will tell you how long, help you set up a temporary alternative where that is practical, and sequence the work to shorten that window as much as the job allows."),

            Faq("changes", "Project Changes",
                "What happens if we want to change something mid-project?",
                "It is normal — seeing a space open often changes what you want. We price the change, tell you what it does to the schedule, and get your agreement in writing before doing it. Nothing gets added to your bill that you have not agreed to."),
            Faq("changes", "Project Changes",
                "What if you find something unexpected behind a wall?",
                "We stop, we show you, and we explain the options and what each one costs. Hidden damage is common in renovation work, especially in older homes. What should never happen is finding out about it on the final invoice."),

            Faq("payments", "Payments",
                "How does payment work?",
                null,
                "Publish the payment structure: deposit amount, progress-payment milestones, and final payment terms."),
            Faq("payments", "Payments",
                "What payment methods do you take?",
                null,
                "List the accepted payment methods."),
            Faq("payments", "Payments",
                "Do you require a deposit?",
                null,
                "Confirm whether a deposit is required, how much, and exactly what it covers."),

            Faq("materials", "Materials & Selections",
                "Do we choose the materials, or do you?",
                "You choose, and we help. We will tell you where a cheaper product performs just as well, and where spending more genuinely buys you something. Below-grade rooms and wet areas rule some materials out entirely, and we will steer you away from those before you fall in love with them."),
            Faq("materials", "Materials & Selections",
                "Can we supply our own materials?",
                "Often, yes — talk to us early. The thing to know is that homeowner-supplied materials shift responsibility for quantity, condition and lead time onto you, and a shortfall mid-install stops the job. We will be clear about which items are sensible to supply yourself."),
            Faq("materials", "Materials & Selections",
                "How do you deal with material lead times?",
                "We order early and schedule against confirmed delivery dates rather than promised ones. Some products — windows and custom cabinetry in particular — can have long lead times, and we would rather build that into the plan than pretend it away."),

            Faq("completion", "Finishing Up",
                "How do you decide when a project is finished?",
                "We walk it with you and build a punch list together. Anything on that list gets done before we call it complete. \"Finished\" means finished to your satisfaction, not to ours."),
            Faq("completion", "Finishing Up",
                "What if something is wrong after you leave?",
                "Tell us. Get in touch and we will come out and look at it — we would far rather hear about a problem than have you live with it. Any formal warranty terms that apply to your project are set out in your written agreement, so you are never relying on something you read on a website.",
                "Confirm the formal warranty terms so they can be stated here as well as in the customer agreement."),
            Faq("completion", "Finishing Up",
                "Do you clean up at the end?",
                "Yes. Debris removed, surfaces cleaned, protection taken up, and the room handed back ready to use. A room that needs a deep clean before you can move back in is not a finished room."),
        ];
    }
}

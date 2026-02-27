import type { Mention } from "@prisma/client";

interface DraftSet {
  concise: string;
  detailed: string;
  question_first: string;
}

function theirContext(audience: string | null): string {
  const map: Record<string, string> = {
    dj: "getting booked at clubs and events",
    producer: "landing placements and collabs",
    band: "booking shows and getting on festivals",
    singer: "getting noticed by producers and venues",
    manager: "pitching your artists",
    venue: "finding the right acts",
  };
  return map[audience || ""] || "getting more gigs";
}

function myStory(audience: string | null): string {
  const map: Record<string, string> = {
    dj: "I used to just send a SoundCloud link and hope for the best, but having an actual EPK with my mixes, bio, and press photos in one place made a huge difference when reaching out to promoters",
    producer: "I know some producers who put their credits, collabs, and beats all in one EPK — makes it way easier when labels or artists want to check you out quickly",
    band: "we spent ages emailing venues with a messy Google Doc before we got our EPK together — once we had a proper one with our bio, live videos, and press shots, we started hearing back way more",
    singer: "having everything in one place — your vocals, covers, original tracks, press photos — makes it so much easier when someone asks \"send me your stuff\"",
    manager: "a solid EPK saves so much time when you're pitching — instead of assembling different docs for every venue, you just send one link",
    venue: "from what I've seen, the best submissions come with a clean EPK that has everything upfront — bio, music, videos, rider — so you don't have to dig through emails",
  };
  return map[audience || ""] || "we had the same question when our band was starting out — putting together a proper EPK honestly changed how venues responded to us";
}

export function draftHeuristic(mention: Mention): DraftSet {
  const context = theirContext(mention.audience);
  const story = myStory(mention.audience);

  const isQuestion =
    mention.intent === "need_help" || mention.intent === "recommendation_request";
  const isComparing = mention.intent === "comparison";

  // --- Variant 1: Short & casual (fellow musician comment) ---
  let concise: string;
  if (isQuestion) {
    concise = `Hey! ${story}. My band ended up using BookedKit for ours and it's been solid, but honestly the most important thing is just having all your stuff in one place that's easy to share. Makes ${context} so much smoother.`;
  } else if (isComparing) {
    concise = `We went through this same debate — tried a PDF first, then a website, then landed on a dedicated EPK tool. The PDF was annoying to update every time we had new photos or press. We use BookedKit now and it does the job, but really any setup you'll actually keep updated is the right one.`;
  } else {
    concise = `Totally relate to this. ${story}. The biggest thing I'd say is don't overthink it — get the basics together and start sending it out. You can always improve it as you go.`;
  }

  // --- Variant 2: Longer personal story ---
  let detailed: string;
  if (isQuestion) {
    detailed = `${story}.\n\nWhat really helped us was thinking about it from the venue/promoter side — they get tons of submissions, so they want to see who you are, hear your music, and know how to book you, all without digging through emails.\n\nThe things that actually mattered for us: a short bio that tells your story (not a novel), good press photos (even phone photos with decent lighting work), links to your music, and a booking contact. We keep ours on BookedKit which makes it easy to update and share, but even a clean one-page site works.\n\nThe main thing is just having something ready to send when the opportunity comes up.`;
  } else if (isComparing) {
    detailed = `We tried a few different approaches before settling on what works:\n\n- **PDF**: Looked nice but was a pain to update. Every new show or press mention meant re-exporting the whole thing.\n- **Website page**: More flexible but we kept forgetting to update it, and it was hard to tell if anyone actually looked at it.\n- **Dedicated EPK tool**: This is what we ended up going with (BookedKit specifically). It's purpose-built so updating is quick and we can see when someone views it.\n\nHonestly though, the format matters less than actually keeping it current. A promoter told me once that outdated EPKs are worse than no EPK — so whatever you pick, make sure it's something you'll actually maintain.`;
  } else {
    detailed = `${story}.\n\nA couple things we learned the hard way:\n\n- Keep the bio short — nobody reads a full page. A few sentences about who you are and what you sound like.\n- Photos matter more than you think. We got a friend to take some decent shots at a gig and it made a huge difference.\n- Make your music easy to find — embed or link directly, don't make people search for you.\n- Have a clear booking contact. Sounds obvious but we forgot this at first.\n\nWe keep everything on BookedKit now which keeps it organized, but the real game changer was just having something professional-looking ready to go when opportunities came up.`;
  }

  // --- Variant 3: Engage first (NO BookedKit mention) ---
  let question_first: string;
  if (isQuestion) {
    question_first = `What kind of ${mention.audience === "dj" ? "gigs are you going for" : mention.audience === "band" ? "venues are you trying to book" : "opportunities are you targeting"}? I ask because the approach can be pretty different depending on whether you're ${mention.audience === "dj" ? "trying to get club residencies vs. festival slots" : mention.audience === "band" ? "playing local bars vs. touring or doing festivals" : "going for live bookings vs. pitching to labels"}. Happy to share what's worked for us once I know more about your situation.`;
  } else if (isComparing) {
    question_first = `What's been the main frustration with your current setup? For us it was constantly having to re-send updated versions every time something changed. Knowing what's bugging you most would help narrow down what actually matters.`;
  } else {
    question_first = `Are you putting this together for the first time or revamping an existing one? And who are you mainly sending it to — venues, festivals, labels? That context makes a big difference in what to prioritize. We went through this recently and I'm happy to share what we figured out.`;
  }

  return { concise, detailed, question_first };
}

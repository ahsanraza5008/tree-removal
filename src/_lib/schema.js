// JSON-LD builder. One business entity (@id #business) is defined identically on every page;
// each page adds its own WebPage, BreadcrumbList, Service and FAQPage nodes that reference it.
// Rules: no reviews, no ratings, no invented address/geo for the business. All internal URLs are
// absolute and use the site's trailing-slash format (/, /services/, /florida/, /florida/naples/).
const business = require("../_data/business.json");
const services = require("../_data/services.js");

const SITE = require("./site.js").origin;
const abs = path => SITE + path; // path always starts with "/" and ends with "/" (or "/#fragment")
const ID = {
  business: abs("/#business"),
  website: abs("/#website"),
  logo: abs("/#logo"),
};

// Tree care has no dedicated schema.org type. HomeAndConstructionBusiness (a LocalBusiness subtype
// for trades that work on homes and property) is the closest Google-supported type; additionalType
// pins the trade to the Wikipedia concept of an arborist.
function businessNode() {
  return {
    "@type": "HomeAndConstructionBusiness",
    "@id": ID.business,
    name: business.name,
    additionalType: "https://en.wikipedia.org/wiki/Arborist",
    url: abs("/"),
    telephone: business.phoneHref,
    logo: { "@type": "ImageObject", "@id": ID.logo, url: abs("/apple-touch-icon.png"), width: 180, height: 180 },
    image: abs("/apple-touch-icon.png"),
    description: "Tree removal, emergency tree removal, stump grinding, tree trimming, storm damage cleanup and land clearing across the United States, with a 24/7 emergency line.",
    areaServed: { "@type": "Country", name: "United States" },
    knowsAbout: services.map(s => s.name),
    openingHoursSpecification: {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
      opens: "00:00",
      closes: "23:59",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: business.phoneHref,
      contactType: "customer service",
      areaServed: "US",
      availableLanguage: "English",
      hoursAvailable: {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        opens: "00:00",
        closes: "23:59",
      },
    },
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Tree services",
      itemListElement: services.map(s => ({ "@type": "Offer", itemOffered: serviceRef(s) })),
    },
  };
}

const websiteNode = () => ({
  "@type": "WebSite",
  "@id": ID.website,
  url: abs("/"),
  name: business.name,
  publisher: { "@id": ID.business },
  inLanguage: "en-US",
});

function webPage(type, path, name, description, extra = {}) {
  return {
    "@type": type,
    "@id": abs(path) + "#webpage",
    url: abs(path),
    name,
    description,
    isPartOf: { "@id": ID.website },
    about: { "@id": ID.business },
    inLanguage: "en-US",
    ...extra,
  };
}

function breadcrumb(path, items) {
  return {
    "@type": "BreadcrumbList",
    "@id": abs(path) + "#breadcrumb",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: abs(it.url) })),
  };
}

function faqPage(path, faqs) {
  if (!faqs || !faqs.length) return null;
  return {
    "@type": "FAQPage",
    "@id": abs(path) + "#faq",
    mainEntity: faqs.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
}

// Self-contained reference to a catalogue service (same @id/url as on /services/), so every
// page's graph stands on its own.
function serviceRef(s) {
  return { "@type": "Service", "@id": abs(`/services/#${s.id}`), name: s.name, serviceType: SERVICE_TYPE[s.id], url: abs(`/services/#${s.id}`) };
}

// The six catalogue services, defined in full on /services/ with stable @ids.
const SERVICE_TYPE = {
  "tree-removal": "Tree removal",
  "emergency-tree-removal": "Emergency tree removal",
  "stump-grinding": "Stump grinding",
  "tree-trimming": "Tree trimming and pruning",
  "storm-damage-cleanup": "Storm damage cleanup",
  "land-clearing": "Land clearing",
};
const catalogueService = s => ({
  "@type": "Service",
  "@id": abs(`/services/#${s.id}`),
  name: s.name,
  serviceType: SERVICE_TYPE[s.id],
  description: s.line,
  url: abs(`/services/#${s.id}`),
  provider: { "@id": ID.business },
  areaServed: { "@type": "Country", name: "United States" },
});

// A location-scoped tree removal service (state and city pages).
function localService(path, name, description, place) {
  // reuse the page's meta description without its closing call-to-action sentence
  description = String(description).replace(/\s+(Call|Find|Lines open)[^.]*\.?$/, "").trim();
  return {
    "@type": "Service",
    "@id": abs(path) + "#service",
    name,
    serviceType: "Tree removal",
    description,
    url: abs(path),
    provider: { "@id": ID.business },
    areaServed: place,
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: `Tree services in ${place.name}`,
      itemListElement: services.map(s => ({ "@type": "Offer", itemOffered: serviceRef(s) })),
    },
  };
}

const HOME = { name: "Home", url: "/" };
const AREAS = { name: "Service Areas", url: "/service-areas/" };

function build(kind, d) {
  const nodes = [businessNode(), websiteNode()];
  const p = d.url;
  switch (kind) {
    case "home":
      nodes.push(webPage("WebPage", p, d.title, d.desc), faqPage(p, d.faqs));
      break;
    case "services":
      nodes.push(
        webPage("WebPage", p, d.title, d.desc, { breadcrumb: { "@id": abs(p) + "#breadcrumb" }, mainEntity: services.map(s => ({ "@id": abs(`/services/#${s.id}`) })) }),
        breadcrumb(p, [HOME, { name: "Services", url: p }]),
        ...services.map(catalogueService),
        faqPage(p, d.faqs),
      );
      break;
    case "areas":
      nodes.push(
        webPage("CollectionPage", p, d.title, d.desc, { breadcrumb: { "@id": abs(p) + "#breadcrumb" }, mainEntity: { "@id": abs(p) + "#states" } }),
        breadcrumb(p, [HOME, AREAS]),
        { "@type": "ItemList", "@id": abs(p) + "#states", name: "Tree removal service areas by state",
          itemListElement: d.states.map((s, i) => ({ "@type": "ListItem", position: i + 1, name: `Tree removal in ${s.name}`, url: abs(`/${s.slug}/`) })) },
      );
      break;
    case "about":
      nodes.push(webPage("AboutPage", p, d.title, d.desc, { breadcrumb: { "@id": abs(p) + "#breadcrumb" } }), breadcrumb(p, [HOME, { name: "About", url: p }]));
      break;
    case "contact":
      nodes.push(webPage("ContactPage", p, d.title, d.desc, { breadcrumb: { "@id": abs(p) + "#breadcrumb" } }), breadcrumb(p, [HOME, { name: "Contact", url: p }]));
      break;
    case "state": {
      const s = d.state;
      const place = { "@type": "State", name: s.name, containedInPlace: { "@type": "Country", name: "United States" } };
      nodes.push(
        webPage("WebPage", p, d.title, d.desc, { breadcrumb: { "@id": abs(p) + "#breadcrumb" }, mainEntity: { "@id": abs(p) + "#service" } }),
        breadcrumb(p, [HOME, AREAS, { name: s.name, url: p }]),
        localService(p, `Tree removal in ${s.name}`, d.desc, place),
        faqPage(p, d.faqs),
      );
      break;
    }
    case "city": {
      const c = d.city;
      const place = {
        "@type": "City",
        name: `${c.city}, ${c.stateCode}`,
        geo: { "@type": "GeoCoordinates", latitude: c.lat, longitude: c.lng },
        containedInPlace: { "@type": "State", name: c.stateName, url: abs(`/${c.stateSlug}/`) },
      };
      nodes.push(
        webPage("WebPage", p, d.title, d.desc, { breadcrumb: { "@id": abs(p) + "#breadcrumb" }, mainEntity: { "@id": abs(p) + "#service" } }),
        breadcrumb(p, [HOME, AREAS, { name: c.stateName, url: `/${c.stateSlug}/` }, { name: c.city, url: p }]),
        localService(p, `Tree removal in ${c.city}, ${c.stateCode}`, d.desc, place),
        faqPage(p, d.faqs),
      );
      break;
    }
    default:
      nodes.push(webPage("WebPage", p, d.title, d.desc));
  }
  const json = JSON.stringify({ "@context": "https://schema.org", "@graph": nodes.filter(Boolean) });
  // keep "</script>" from ever closing the tag early
  return `<script type="application/ld+json">${json.replace(/</g, "\\u003c")}</script>`;
}

module.exports = { build, SITE };

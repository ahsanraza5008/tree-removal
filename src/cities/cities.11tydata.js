// O(n) computed fields for city pages only. nearbyCities is pre-computed offline (scripts/build-cities.js).
const { capped, fitted, pick, fill, cityTokens } = require("../_lib/spin.js");
const contexts = require("../_data/stateContexts.js");
const cs = require("../_data/citySpintax.js");

const ctxByCode = Object.fromEntries(contexts.map(c => [c.stateCode, c]));
const tokens = city => cityTokens(city, ctxByCode[city.stateCode]);
// titles, descriptions and H1 use the disambiguated label so same-name towns stay unique
const metaTokens = city => ({ ...tokens(city), city: city.label || city.city });

module.exports = {
  eleventyComputed: {
    stateCtx: data => ctxByCode[data.city.stateCode] || {},
    T: data => tokens(data.city),
    metaTitle: data => capped(cs.metaTitle, metaTokens(data.city), 60, "title"),
    metaDescription: data => capped(cs.metaDescription, metaTokens(data.city), 155, "desc"),
    h1: data => fitted(cs.h1, metaTokens(data.city), 70, "h1"),
    // resolved once; the visible FAQ and the FAQPage schema both read this array
    faqs: data => { const T = tokens(data.city); return cs.faq.map((f, i) => ({ q: fill(f.q, T), a: pick(f.a, T, "faq" + (i + 1)) })); },
  },
};

const { pick, fill, capped, stateTokens } = require("../_lib/spin.js");
const contexts = require("../_data/stateContexts.js");
const sp = require("../_data/stateSpintax.js");
const states = require("../_data/states.json");

const ctxFor = code => contexts.find(c => c.stateCode === code) || {};

module.exports = {
  eleventyComputed: {
    stateCtx: data => ctxFor(data.state.code),
    T: data => stateTokens(data.state, ctxFor(data.state.code), states.findIndex(s => s.code === data.state.code)),
    metaTitle: data => capped(sp.metaTitle, stateTokens(data.state, ctxFor(data.state.code), states.findIndex(s => s.code === data.state.code)), 60, "title"),
    faqs: data => {
      const T = stateTokens(data.state, ctxFor(data.state.code), states.findIndex(s => s.code === data.state.code));
      return sp.faq.map((f, i) => ({ q: fill(f.q, T), a: pick(f.a, T, "faq" + (i + 1)) }));
    },
    metaDescription: data => capped(sp.metaDescription, stateTokens(data.state, ctxFor(data.state.code), states.findIndex(s => s.code === data.state.code)), 155, "desc"),
  },
};

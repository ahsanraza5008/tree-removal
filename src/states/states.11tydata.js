const { pick, capped, stateTokens } = require("../../lib/spin.js");
const contexts = require("../_data/stateContexts.js");
const sp = require("../_data/stateSpintax.js");
const states = require("../_data/states.json");

const ctxFor = code => contexts.find(c => c.stateCode === code) || {};

module.exports = {
  eleventyComputed: {
    stateCtx: data => ctxFor(data.state.code),
    T: data => stateTokens(data.state, ctxFor(data.state.code), states.findIndex(s => s.code === data.state.code)),
    metaTitle: data => capped(sp.metaTitle, stateTokens(data.state, ctxFor(data.state.code), states.findIndex(s => s.code === data.state.code)), 60, "title"),
    metaDescription: data => capped(sp.metaDescription, stateTokens(data.state, ctxFor(data.state.code), states.findIndex(s => s.code === data.state.code)), 155, "desc"),
  },
};

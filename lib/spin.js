// Shared spintax helpers used by .eleventy.js filters and the state/city computed data.
const business = require("../src/_data/business.json");

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Replace %tokens% with values from the token object T
function fill(str, T) {
  return String(str).replace(/%([a-zA-Z.]+)%/g, (m, k) => (T && T[k] != null ? T[k] : m));
}

// Pick one variant from an array.
// City pages: index = (city.v + keyOffset) % n. city.v is pre-computed (scripts/build-cities.js)
// so neighbouring cities never share a slot, therefore never share a paragraph.
function pick(arr, T, salt) {
  if (!Array.isArray(arr)) return fill(arr || "", T);
  if (!arr.length) return "";
  const key = (salt || "") + String(arr[0]).slice(0, 48) + (T && T.st ? T.st : "");
  const i = ((T ? T.v : 0) + hash(key)) % arr.length;
  return fill(arr[i], T);
}

// Fixed variant list with a hard length cap; falls through to the next variant that fits.
function capped(variants, T, max, salt) {
  const n = variants.length;
  const start = ((T.v || 0) + hash(salt + (T.st || ""))) % n;
  let best = null;
  for (let k = 0; k < n; k++) {
    const t = fill(variants[(start + k) % n], T);
    if (t.length <= max) return t;
    if (!best || t.length < best.length) best = t;
  }
  return best.slice(0, max).replace(/\s+\S*$/, "");
}

// Like capped(), but never trims: returns the first variant that fits, else the shortest whole one.
function fitted(variants, T, max, salt) {
  const n = variants.length;
  const start = ((T.v || 0) + hash(salt + (T.st || ""))) % n;
  let best = null;
  for (let k = 0; k < n; k++) {
    const t = fill(variants[(start + k) % n], T);
    if (t.length <= max) return t;
    if (!best || t.length < best.length) best = t;
  }
  return best;
}

function ctxTokens(c = {}) {
  const out = {};
  for (const k of Object.keys(c)) if (k !== "stateCode") out["ctx." + k] = c[k];
  return out;
}

function cityTokens(city, ctx) {
  if (!city) return { v: 0 };
  return {
    v: city.v || 0, st: city.stateCode,
    city: city.city, county: city.countyLabel, state: city.stateName, ST: city.stateCode,
    kw: business.primaryKeyword, phone: business.phone,
    servicesLink: '<a href="/services/">tree removal services</a>',
    ...ctxTokens(ctx),
  };
}

function stateTokens(state, ctx, index) {
  return {
    v: index || 0, st: state.code,
    state: state.name, ST: state.code, count: (state.cityCount || 0).toLocaleString("en-US"),
    kw: business.primaryKeyword, phone: business.phone,
    ...ctxTokens(ctx),
  };
}

module.exports = { hash, fill, pick, capped, fitted, cityTokens, stateTokens };

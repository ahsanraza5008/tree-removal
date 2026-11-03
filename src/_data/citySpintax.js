// All city-page spintax lives here (merged from src/_lib/city-spintax/*), never inline in city.njk.
// 15 variants per element (business.citySpintaxVariants), except by request:
//   metaTitle 4 fixed patterns, metaDescription 5, h1 5.
module.exports = {
  ...require("../_lib/city-spintax/hero.js"),
  ...require("../_lib/city-spintax/body.js"),
  ...require("../_lib/city-spintax/trust.js"),
  ...require("../_lib/city-spintax/local.js"),
  ...require("../_lib/city-spintax/headings.js"),
};

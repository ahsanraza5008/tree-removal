// All city-page spintax lives here (merged from lib/city-spintax/*), never inline in city.njk.
// 15 variants per element (business.citySpintaxVariants), except by request:
//   metaTitle 4 fixed patterns, metaDescription 5, h1 5.
module.exports = {
  ...require("../../lib/city-spintax/hero.js"),
  ...require("../../lib/city-spintax/body.js"),
  ...require("../../lib/city-spintax/trust.js"),
  ...require("../../lib/city-spintax/local.js"),
};

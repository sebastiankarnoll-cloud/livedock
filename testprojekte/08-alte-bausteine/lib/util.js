// Small CLI helper. Uses two outdated packages on purpose (see EXPECTED.md).
const _ = require("lodash");
const minimist = require("minimist");

const args = minimist(process.argv.slice(2));
console.log(_.capitalize(String(args.name ?? "world")));

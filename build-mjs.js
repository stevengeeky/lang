// node build-mjs.js
// lang.mjs is scripts/lang.js with an export block on the end, nothing else.
var fs = require("fs"), path = require("path");

var src = fs.readFileSync(path.join(__dirname, "scripts", "lang.js"), "utf8");
var names = ["split", "split_delims", "replace", "replace_delims", "matchSection", "match", "matches", "tokenize", "conform_matches_string"];

fs.writeFileSync(path.join(__dirname, "lang.mjs"), src + "\nexport { " + names.join(", ") + " };\n");
console.log("wrote lang.mjs");

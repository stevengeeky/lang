# lang

An extension of regex which makes it easy to match, replace, and split complex expressions like strings with escape characters and embedded brackets, match around these types of expressions, or delimit these types of expressions with other complex expressions.

Vanilla JS, no dependencies. Open `index.html` for a live demo: paste a string, type the patterns, and see what each function finds.

## Using it

```html
<script src="scripts/lang.js"></script>   <!-- puts split, replace, matchSection, ... on window -->
```

```js
import { split, matchSection } from "./lang.mjs";   // ES module
const { split } = require("lang");                   // node (npm install <path to this repo>)
```

Typings are in `lang.d.ts`. Tests: `node test/run.js` (or `npm test`). `npm run build` regenerates `lang.mjs` from `scripts/lang.js`.

## The rules every function follows

* A backslash and the character after it are one opaque unit: `\"` never ends a string, `\(` never opens a bracket, `\,` never splits. (`replace` without an `ignore` pattern is plain `String.prototype.replace` and does not do this.)
* `ignore` is a regex for text to look past, usually quoted strings: `/'.*?'|".*?"/g`, or `/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g` to allow escaped quotes inside them.
* `start` and `end` are the bracket patterns, e.g. `/\(/g` and `/\)/g`. They nest to any depth. They must be different patterns. A string whose brackets do not balance has no section.
* Matches are looked for in the stretches *between* ignored strings and sections, so a match can never begin inside one or reach across one.
* A regex without the `g` flag replaces only the first match, like `String.prototype.replace`; everything else finds all matches either way. A regex that matches the empty string matches nothing.

## API

### `split(string, regex, ignore)`

Split `string` by `regex` while ignoring delimiters inside matches of `ignore`. A trailing empty piece is dropped.

```js
split("a,'b,c',d", /,/g, /'.*?'/g)   // ["a", "'b,c'", "d"]
split("a\\,b,c", /,/g)               // ["a\\,b", "c"]
```

### `split_delims(string, regex, start, end, ignore)`

Split `string` by `regex` while ignoring delimiters inside `start`…`end` sections and inside matches of `ignore`.

```js
split_delims("f(g(1,2),3),4", /,/g, /\(/g, /\)/g)                       // ["f(g(1,2),3)", "4"]
split_delims("a,('b)',c),\"(\",d", /,/g, /\(/g, /\)/g, /'.*?'|".*?"/g)  // ["a", "('b)',c)", "\"(\"", "d"]
```

### `replace(string, regex, replacement, ignore)`

Replace matches of `regex` in `string` with `replacement` while ignoring matches inside `ignore`. `replacement` is anything `String.prototype.replace` accepts (`$1`, `$&`, a function).

```js
replace("x = 'x' + x", /x/g, "y", /'.*?'/g)   // "y = 'x' + y"
```

### `replace_delims(string, regex, replacement, start, end, ignore)`

Replace matches of `regex` while ignoring `start`…`end` sections and matches of `ignore`.

```js
replace_delims("x + (x * x) + x", /x/g, "y", /\(/g, /\)/g)             // "y + (x * x) + y"
replace_delims("x '(' x (x) x", /x/g, "y", /\(/g, /\)/g, /'.*?'/g)    // "y '(' y (x) y"
```

### `matchSection(string, start, end, ignore)`

The first `start`…`end` section of `string`, outermost, with brackets inside `ignore` matches not counted. Returns `{ index, value, start, end }` where `start` and `end` are the `{ index, value }` of the two bracket tokens, or `{ index: -1, value: "" }` if there is no balanced section.

```js
matchSection("a(b(c)d)e", /\(/g, /\)/g)
// { index: 1, value: "(b(c)d)", start: { index: 1, value: "(" }, end: { index: 7, value: ")" } }

matchSection("(a '(' b)", /\(/g, /\)/g, /'.*?'/g).value   // "(a '(' b)"
matchSection("(a(b)", /\(/g, /\)/g).index                 // -1
```

### `match(string, regex)` and `matches(string, regex)`

The first match of `regex` as `{ index, value }` (index `-1` if none), and every non-overlapping match as an array of them.

```js
matches("a1b22", /\d+/g)   // [{ index: 1, value: "1" }, { index: 3, value: "22" }]
```

### `tokenize(string, rules, opts)`

Cut `string` into `{ type, value, index }` tokens. Each rule is `{ type, match }` (a regex) or `{ type, start, end, ignore }` (a whole nested section). At each position the rules are tried in order and the first one that matches wins. Whitespace between tokens is skipped (`opts.skip`, default `/\s+/`, `null` for none); anything no rule matches becomes a one-character `"unknown"` token.

```js
tokenize("f (a (b) ')') = 42", [
    { type: "group", start: /\(/, end: /\)/, ignore: /'.*?'/g },
    { type: "num",   match: /\d+/ },
    { type: "id",    match: /\w+/ },
    { type: "op",    match: /=/ }
])
// [ { type: "id", value: "f", index: 0 },
//   { type: "group", value: "(a (b) ')')", index: 2 },
//   { type: "op", value: "=", index: 14 },
//   { type: "num", value: "42", index: 16 } ]
```

// node test/run.js
// Loads scripts/lang.js the way a browser would (as globals in a fresh
// context) and runs every case below.  Exits non-zero on any failure.

var fs = require("fs"), path = require("path"), vm = require("vm");

var src = fs.readFileSync(path.join(__dirname, "..", "scripts", "lang.js"), "utf8");
var L = {};
vm.runInNewContext(src, L, { filename: "scripts/lang.js" });

var passed = 0, failed = 0, only = process.argv[2];

function test(name, fn) {
    if (only && name.indexOf(only) == -1)
        return;
    try {
        fn();
        passed++;
    }
    catch (e) {
        failed++;
        console.log("FAIL  " + name + "\n      " + (e && e.stack ? e.stack.split("\n").slice(0, 2).join("\n      ") : e));
    }
}

function eq(got, want, note) {
    var g = JSON.stringify(got), w = JSON.stringify(want);
    if (g !== w)
        throw new Error((note ? note + ": " : "") + "expected " + w + "\n      got      " + g);
}

// shorthand: the {index, value} pairs of a match list
function iv(ms) {
    var r = [];
    for (var i = 0; i < ms.length; i++)
        r.push([ms[i].index, ms[i].value]);
    return r;
}

var STR = /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g;   // a quoted string, escapes allowed
var SIMPLE_STR = /'.*?'|".*?"/g;                      // the README's own ignore pattern

// ---------------------------------------------------------------- match / matches

test("match: first match and its real index", function() {
    eq(L.match("abc", /b/), { index: 1, value: "b" });
    eq(L.match("abc", /b/g), { index: 1, value: "b" });
});

test("match: no match is index -1", function() {
    eq(L.match("abc", /z/), { index: -1, value: "" });
    eq(L.match("", /z/), { index: -1, value: "" });
});

test("match: index is where the regex matched, not where the text first occurs", function() {
    // 'b' occurs at 1, but the regex only matches the 'b' followed by 'c' at 4
    eq(L.match("ab abc", /b(?=c)/), { index: 4, value: "b" });
});

test("match: missing regex is index -1", function() {
    eq(L.match("abc", null), { index: -1, value: "" });
});

test("matches: every non-overlapping match, global or not", function() {
    eq(iv(L.matches("a1b22c333", /\d+/g)), [[1, "1"], [3, "22"], [6, "333"]]);
    eq(iv(L.matches("a1b22c333", /\d+/)), [[1, "1"], [3, "22"], [6, "333"]]);
});

test("matches: empty input, no matches", function() {
    eq(L.matches("", /a/g), []);
    eq(L.matches("bbb", /a/g), []);
    eq(L.matches("abc", null), []);
});

test("matches: a regex that can match nothing does not hang", function() {
    eq(iv(L.matches("abc", /x*/g)), []);
    eq(iv(L.matches("aXXb", /X*/g)), [[1, "XX"]]);
});

test("matches: unicode text keeps correct indices", function() {
    eq(iv(L.matches("héllo wörld", /ö|é/g)), [[1, "é"], [7, "ö"]]);
    eq(iv(L.matches("a😀b😀", /😀/g)), [[1, "😀"], [4, "😀"]]);
});

test("matches: repeated identical text at different positions", function() {
    eq(iv(L.matches("x,x,x", /x/g)), [[0, "x"], [2, "x"], [4, "x"]]);
});

test("conform_matches_string: rewrites values from the string", function() {
    var ms = [{ index: 2, value: "??" }];
    eq(L.conform_matches_string(ms, "abcdef")[0].value, "cd");
});

// ---------------------------------------------------------------- split

test("split: plain split", function() {
    eq(L.split("a,b,c", /,/g), ["a", "b", "c"]);
});

test("split: trailing empty piece is dropped, leading one is kept", function() {
    eq(L.split("a,b,", /,/g), ["a", "b"]);
    eq(L.split(",a", /,/g), ["", "a"]);
});

test("split: empty input", function() {
    eq(L.split("", /,/g), []);
});

test("split: no delimiter present", function() {
    eq(L.split("abc", /,/g), ["abc"]);
});

test("split: ignores delimiters inside quoted strings", function() {
    eq(L.split("a,'b,c',d", /,/g, SIMPLE_STR), ["a", "'b,c'", "d"]);
    eq(L.split('f("x,y"), g', /,/g, SIMPLE_STR), ['f("x,y")', " g"]);
});

test("split: an escaped quote does not end the string", function() {
    eq(L.split("a,'b\\',c',d", /,/g, STR), ["a", "'b\\',c'", "d"]);
    eq(L.split("a,'b\\',c',d", /,/g, SIMPLE_STR), ["a", "'b\\',c'", "d"]);
});

test("split: an escaped delimiter is not a delimiter", function() {
    eq(L.split("a\\,b,c", /,/g), ["a\\,b", "c"]);
});

test("split: case-insensitive flag survives the ignore pattern", function() {
    eq(L.split("a AND b and c", /and/gi, SIMPLE_STR), ["a ", " b ", " c"]);
});

test("split: multi-character and regex delimiters", function() {
    eq(L.split("a  b\tc", /\s+/g), ["a", "b", "c"]);
    eq(L.split("a::b::c", /::/g), ["a", "b", "c"]);
});

test("split: unicode delimiter and content", function() {
    eq(L.split("α→β→γ", /→/g), ["α", "β", "γ"]);
    eq(L.split("😀,'😀,x',b", /,/g, SIMPLE_STR), ["😀", "'😀,x'", "b"]);
});

test("split: greedy vs minimal ignore pattern", function() {
    // greedy '.*' swallows everything between the first and last quote
    eq(L.split("'a',b,'c',d", /,/g, /'.*'/g), ["'a',b,'c'", "d"]);
    eq(L.split("'a',b,'c',d", /,/g, /'.*?'/g), ["'a'", "b", "'c'", "d"]);
});

// ---------------------------------------------------------------- matchSection

test("matchSection: simplest bracket pair", function() {
    var m = L.matchSection("f(x)", /\(/g, /\)/g);
    eq([m.index, m.value], [1, "(x)"]);
    eq([m.start.index, m.start.value, m.end.index, m.end.value], [1, "(", 3, ")"]);
});

test("matchSection: nested brackets give the outermost section", function() {
    var m = L.matchSection("a(b(c)d)e", /\(/g, /\)/g);
    eq([m.index, m.value], [1, "(b(c)d)"]);
});

test("matchSection: only the first section", function() {
    var m = L.matchSection("(a)(b)", /\(/g, /\)/g);
    eq([m.index, m.value], [0, "(a)"]);
});

test("matchSection: mismatched brackets give no match", function() {
    eq(L.matchSection("(a(b)", /\(/g, /\)/g).index, -1);
    eq(L.matchSection("(a)b)", /\(/g, /\)/g).index, -1);
    eq(L.matchSection(")(", /\(/g, /\)/g).index, -1);
});

test("matchSection: no brackets, empty input", function() {
    eq(L.matchSection("abc", /\(/g, /\)/g).index, -1);
    eq(L.matchSection("", /\(/g, /\)/g).index, -1);
});

test("matchSection: brackets inside strings are ignored", function() {
    var t = "This is (some '( )))))' \"(moar parenthesis ((( ((() ) ( )\" (test) text) ')' hello";
    var m = L.matchSection(t, /\(/g, /\)/g, SIMPLE_STR);
    eq([m.index, m.value], [8, "(some '( )))))' \"(moar parenthesis ((( ((() ) ( )\" (test) text)"]);
});

test("matchSection: escaped bracket is not a bracket", function() {
    var m = L.matchSection("(a\\)b)", /\(/g, /\)/g);
    eq([m.index, m.value], [0, "(a\\)b)"]);
});

test("matchSection: escaped quote inside an ignored string", function() {
    var m = L.matchSection("(\"a\\\")\" b)", /\(/g, /\)/g, STR);
    eq([m.index, m.value], [0, "(\"a\\\")\" b)"]);
});

test("matchSection: multi-character delimiters", function() {
    var m = L.matchSection("x begin a begin b end c end y", /begin/g, /end/g);
    eq([m.index, m.value], [2, "begin a begin b end c end"]);
});

test("matchSection: non-global patterns work the same", function() {
    var m = L.matchSection("a(b(c)d)e", /\(/, /\)/);
    eq([m.index, m.value], [1, "(b(c)d)"]);
});

test("matchSection: unicode brackets", function() {
    var m = L.matchSection("«a «b» c» d", /«/g, /»/g);
    eq([m.index, m.value], [0, "«a «b» c»"]);
});

// ---------------------------------------------------------------- split_delims

test("split_delims: does not split inside brackets", function() {
    eq(L.split_delims("a,(b,c),d", /,/g, /\(/g, /\)/g), ["a", "(b,c)", "d"]);
});

test("split_delims: nested brackets", function() {
    eq(L.split_delims("f(g(1,2),3),4", /,/g, /\(/g, /\)/g), ["f(g(1,2),3)", "4"]);
});

test("split_delims: strings inside brackets and brackets inside strings", function() {
    eq(L.split_delims("a,('b)',c),\"(\",d", /,/g, /\(/g, /\)/g, SIMPLE_STR), ["a", "('b)',c)", "\"(\"", "d"]);
});

test("split_delims: no sections at all", function() {
    eq(L.split_delims("a,b", /,/g, /\(/g, /\)/g), ["a", "b"]);
    eq(L.split_delims("", /,/g, /\(/g, /\)/g), []);
});

test("split_delims: escaped delimiter", function() {
    eq(L.split_delims("a\\,b,(c,d)", /,/g, /\(/g, /\)/g), ["a\\,b", "(c,d)"]);
});

// ---------------------------------------------------------------- replace

test("replace: plain replace, global or first", function() {
    eq(L.replace("a-b-c", /-/g, "+"), "a+b+c");
    eq(L.replace("a-b-c", /-/, "+"), "a+b-c");
});

test("replace: ignores matches inside strings", function() {
    eq(L.replace("x = 'x' + x", /x/g, "y", SIMPLE_STR), "y = 'x' + y");
});

test("replace: escaped quote does not end the string", function() {
    eq(L.replace("x = 'a\\'x' + x", /x/g, "y", STR), "y = 'a\\'x' + y");
});

test("replace: capture groups in the replacement", function() {
    eq(L.replace("a1 'b2' c3", /([a-z])(\d)/g, "$2$1", SIMPLE_STR), "1a 'b2' 3c");
});

test("replace: empty input and no matches", function() {
    eq(L.replace("", /x/g, "y", SIMPLE_STR), "");
    eq(L.replace("abc", /x/g, "y", SIMPLE_STR), "abc");
});

test("replace: unicode", function() {
    eq(L.replace("ö 'ö' ö", /ö/g, "o", SIMPLE_STR), "o 'ö' o");
});

// ---------------------------------------------------------------- replace_delims

test("replace_delims: leaves bracketed sections alone", function() {
    eq(L.replace_delims("x + (x * x) + x", /x/g, "y", /\(/g, /\)/g), "y + (x * x) + y");
});

test("replace_delims: nested sections, several sections", function() {
    eq(L.replace_delims("x(x(x))x(x)x", /x/g, "y", /\(/g, /\)/g), "y(x(x))y(x)y");
});

test("replace_delims: strings and brackets together", function() {
    eq(L.replace_delims("x 'x' (x) x", /x/g, "y", /\(/g, /\)/g, SIMPLE_STR), "y 'x' (x) y");
});

test("replace_delims: bracket inside a string does not open a section", function() {
    eq(L.replace_delims("x '(' x (x) x", /x/g, "y", /\(/g, /\)/g, SIMPLE_STR), "y '(' y (x) y");
});

test("replace_delims: no sections, empty input", function() {
    eq(L.replace_delims("x x", /x/g, "y", /\(/g, /\)/g), "y y");
    eq(L.replace_delims("", /x/g, "y", /\(/g, /\)/g), "");
});

test("replace_delims: case-insensitive flag survives the ignore pattern", function() {
    eq(L.replace_delims("X 'X' (X)", /x/gi, "y", /\(/g, /\)/g, SIMPLE_STR), "y 'X' (X)");
});

test("replace_delims: the replaced text is the original, not a placeholder", function() {
    eq(L.replace_delims("ab(c)", /\S+/g, "[$&]", /\(/g, /\)/g), "[ab](c)");
});

// ---------------------------------------------------------------- tokenize

test("tokenize: rules tried in order at each position, whitespace skipped", function() {
    var toks = L.tokenize("let x = 42", [
        { type: "kw", match: /let/ },
        { type: "id", match: /[a-z]+/ },
        { type: "num", match: /\d+/ },
        { type: "op", match: /=/ }
    ]);
    eq(toks, [
        { type: "kw", value: "let", index: 0 },
        { type: "id", value: "x", index: 4 },
        { type: "op", value: "=", index: 6 },
        { type: "num", value: "42", index: 8 }
    ]);
});

test("tokenize: strings with escapes as one token", function() {
    var toks = L.tokenize("a \"b \\\" c\" d", [
        { type: "str", match: /"(?:[^"\\]|\\.)*"/ },
        { type: "id", match: /\w+/ }
    ]);
    eq(toks.map(function(t) { return t.type + ":" + t.value; }), ["id:a", "str:\"b \\\" c\"", "id:d"]);
});

test("tokenize: a start/end rule takes a whole nested section", function() {
    var toks = L.tokenize("f (a (b) ')') g", [
        { type: "group", start: /\(/, end: /\)/, ignore: SIMPLE_STR },
        { type: "id", match: /\w+/ }
    ]);
    eq(toks.map(function(t) { return t.type + ":" + t.value; }), ["id:f", "group:(a (b) ')')", "id:g"]);
});

test("tokenize: unmatched characters come back as 'unknown' tokens", function() {
    var toks = L.tokenize("a $ b", [{ type: "id", match: /\w+/ }]);
    eq(toks, [
        { type: "id", value: "a", index: 0 },
        { type: "unknown", value: "$", index: 2 },
        { type: "id", value: "b", index: 4 }
    ]);
});

test("tokenize: custom skip pattern, empty input, unicode", function() {
    eq(L.tokenize("", [{ type: "id", match: /\w+/ }]), []);
    eq(L.tokenize("a;b", [{ type: "id", match: /\w+/ }], { skip: /;/ }), [
        { type: "id", value: "a", index: 0 },
        { type: "id", value: "b", index: 2 }
    ]);
    eq(L.tokenize("π 😀", [{ type: "sym", match: /\S/u }]), [
        { type: "sym", value: "π", index: 0 },
        { type: "sym", value: "😀", index: 2 }
    ]);
});

test("tokenize: a rule matching nothing at a position is skipped, never loops", function() {
    var toks = L.tokenize("ab", [{ type: "empty", match: /x*/ }, { type: "id", match: /\w+/ }]);
    eq(toks, [{ type: "id", value: "ab", index: 0 }]);
});

test("tokenize: an unclosed section falls through to the next rule", function() {
    var toks = L.tokenize("(a", [
        { type: "group", start: /\(/, end: /\)/ },
        { type: "id", match: /\w+/ }
    ]);
    eq(toks, [{ type: "unknown", value: "(", index: 0 }, { type: "id", value: "a", index: 1 }]);
});

// ---------------------------------------------------------------- the module builds

test("lang.mjs is scripts/lang.js plus an export block", function() {
    var mjs = fs.readFileSync(path.join(__dirname, "..", "lang.mjs"), "utf8");
    if (mjs.indexOf(src) != 0)
        throw new Error("lang.mjs is out of date: run `npm run build`");
    if (!/^export \{/m.test(mjs))
        throw new Error("lang.mjs has no export block");
});

test("require() gives the same functions as the browser globals", function() {
    var cjs = require(path.join(__dirname, "..", "scripts", "lang.js"));
    var names = ["split", "split_delims", "replace", "replace_delims", "matchSection", "match", "matches", "tokenize"];
    for (var i = 0; i < names.length; i++)
        if (typeof cjs[names[i]] != "function")
            throw new Error("module.exports." + names[i] + " missing");
    eq(cjs.split("a,b", /,/g), ["a", "b"]);
});

console.log(passed + " passed, " + failed + " failed");
process.exit(failed ? 1 : 0);

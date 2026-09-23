// The demo page: paste a string, type the patterns, see what lang finds.

var STR = /'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g;    // the ignore pattern used for tokenize's sections

var fields = ["input", "mode", "regex", "flags", "replacement", "start", "end", "ignore", "rules"];
var rows = {
    matches:        ["regex"],
    split:          ["regex", "ignore"],
    split_delims:   ["regex", "start", "end", "ignore"],
    replace:        ["regex", "replacement", "ignore"],
    replace_delims: ["regex", "replacement", "start", "end", "ignore"],
    matchSection:   ["start", "end", "ignore"],
    tokenize:       ["rules"]
};

var el = {};

window.onload = function() {
    for (var i in fields) {
        el[fields[i]] = document.getElementById(fields[i]);
        el[fields[i]].oninput = el[fields[i]].onchange = update;
    }
    update();
};

function $(id) {
    return document.getElementById(id);
}

function rx(id, flags) {
    var src = el[id].value;
    if (src == "")
        return null;
    return new RegExp(src, flags === undefined ? "g" : flags);
}

function update() {
    var mode = el.mode.value, s = el.input.value;
    
    for (var m in rows)
        for (var i in rows[m])
            $("row-" + rows[m][i]).style.display = "none";
    for (var i in rows[mode])
        $("row-" + rows[mode][i]).style.display = "";
    
    $("error").textContent = "";
    $("legend").textContent = "";
    
    try {
        var res, spans = [];
        switch (mode) {
            case "matches":
                res = matches(s, rx("regex", el.flags.value));
                spans = res;
                break;
            case "split":
                res = split(s, rx("regex", el.flags.value), rx("ignore"));
                spans = pieceSpans(s, res);
                break;
            case "split_delims":
                res = split_delims(s, rx("regex", el.flags.value), rx("start"), rx("end"), rx("ignore"));
                spans = pieceSpans(s, res);
                break;
            case "replace":
                spans = replacedSpans(s, function(rep) { return replace(s, rx("regex", el.flags.value), rep, rx("ignore")); });
                res = replace(s, rx("regex", el.flags.value), el.replacement.value, rx("ignore"));
                break;
            case "replace_delims":
                spans = replacedSpans(s, function(rep) { return replace_delims(s, rx("regex", el.flags.value), rep, rx("start"), rx("end"), rx("ignore")); });
                res = replace_delims(s, rx("regex", el.flags.value), el.replacement.value, rx("start"), rx("end"), rx("ignore"));
                break;
            case "matchSection":
                res = matchSection(s, rx("start"), rx("end"), rx("ignore"));
                if (~res.index)
                    spans = [{ index:res.index, value:res.value, cls:"sec", start:res.start, end:res.end }];
                break;
            case "tokenize":
                res = tokenize(s, parseRules(el.rules.value));
                spans = tokenSpans(res);
                break;
        }
        
        highlight(s, spans);
        $("result").textContent = typeof res == "string" ? res : JSON.stringify(res, null, 2);
    }
    catch (e) {
        $("error").textContent = e.message;
        highlight(s, []);
        $("result").textContent = "";
    }
}

// Where each piece of a split sits in the string: pieces are in order, so
// search forward from the end of the previous one
function pieceSpans(s, pieces) {
    var spans = [], pos = 0;
    for (var i in pieces) {
        var at = s.indexOf(pieces[i], pos);
        spans.push({ index:at, value:pieces[i], cls:i % 2 ? "m odd" : "m" });
        pos = at + pieces[i].length;
    }
    return spans;
}

// Run the replace with a marker around each match, then read the marker
// positions back out to find what was replaced
function replacedSpans(s, run) {
    var marked = run(function(m) { return "\u0001" + m + "\u0002"; });
    var spans = [], lost = 0, open = -1;
    for (var i = 0; i < marked.length; i++) {
        if (marked[i] == "\u0001") {
            open = i - lost;
            lost++;
        }
        else if (marked[i] == "\u0002") {
            lost++;
            spans.push({ index:open, value:s.substring(open, i - lost + 1), cls:"cut" });
        }
    }
    return spans;
}

var TYPE_COLORS = ["rgba(50, 200, 50, .35)", "rgba(50, 50, 255, .2)", "rgba(255, 180, 0, .4)", "rgba(200, 50, 200, .25)", "rgba(0, 200, 200, .3)"];

function tokenSpans(toks) {
    var spans = [], types = {}, n = 0, legend = $("legend");
    for (var i in toks) {
        var t = toks[i];
        if (!(t.type in types)) {
            types[t.type] = t.type == "unknown" ? "rgba(200, 50, 50, .35)" : TYPE_COLORS[n++ % TYPE_COLORS.length];
            var sw = document.createElement("span");
            sw.style.background = types[t.type];
            sw.textContent = t.type;
            legend.appendChild(sw);
        }
        spans.push({ index:t.index, value:t.value, cls:"tok", color:types[t.type] });
    }
    return spans;
}

// type /regex/flags   or   type /start/ /end/
function parseRules(text) {
    var rules = [], lines = text.split("\n");
    for (var i in lines) {
        var line = lines[i].replace(/^\s+|\s+$/g, "");
        if (line == "")
            continue;
        var m = line.match(/^(\S+)\s+\/((?:[^\/\\]|\\.)+)\/([a-z]*)(?:\s+\/((?:[^\/\\]|\\.)+)\/)?$/);
        if (!m)
            throw new Error("rule " + (+i + 1) + " should look like: type /regex/flags  or  type /start/ /end/");
        if (m[4] !== undefined)
            rules.push({ type:m[1], start:new RegExp(m[2]), end:new RegExp(m[4]), ignore:STR });
        else
            rules.push({ type:m[1], match:new RegExp(m[2], m[3].replace(/[gy]/g, "")) });
    }
    return rules;
}

// Rebuild the string in #out with a span around every marked stretch
function highlight(s, spans) {
    var out = $("out"), prev = 0;
    out.textContent = "";
    spans = spans.slice().sort(function(a, b) { return a.index - b.index; });
    
    for (var i in spans) {
        var sp = spans[i];
        if (sp.index < prev)
            continue;
        out.appendChild(document.createTextNode(s.substring(prev, sp.index)));
        
        var span = document.createElement("span");
        span.className = sp.cls || "m";
        if (sp.color)
            span.style.background = sp.color;
        
        if (sp.start) {     // a section: its start and end tokens in bold
            var b1 = document.createElement("b"), b2 = document.createElement("b");
            b1.textContent = sp.start.value;
            b2.textContent = sp.end.value;
            span.appendChild(b1);
            span.appendChild(document.createTextNode(s.substring(sp.start.index + sp.start.value.length, sp.end.index)));
            span.appendChild(b2);
        }
        else
            span.textContent = sp.value;
        
        out.appendChild(span);
        prev = sp.index + sp.value.length;
    }
    out.appendChild(document.createTextNode(s.substring(prev)));
}

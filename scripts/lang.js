// A placeholder character used to blank out text that a pattern must not see
// (escaped characters, ignored strings, matched sections).  Same length as
// what it replaces, so every index still points into the original string.
var temp_delim = String.fromCharCode(9883);
// An escape character and whatever it escapes
var __escaped_chars = /\\[\s\S]/g;

function conform_matches_string(mas, s) {
    for (var i in mas) {
        var m = mas[i];
        mas[i].value = s.substring(m.index, m.index + m.value.length);
    }
    return mas;
}

function replace_delims(s, r, rep, a, b, ex) {
    var temp = s, m, res = "", prev = 0, mas;
    var inf = __esc(temp);
    temp = inf.value;
    
    var spans = [];
    while (~(m = matchSection( temp, a, b, ex )).index) {
        spans.push(m);
        temp = temp.substring(0, m.index) + iterate(temp_delim, m.value.length) + temp.substring(m.index + m.value.length);
    }
    
    if (ex)
        spans = spans.concat(matches(temp, ex));
    
    mas = __between(temp, r, spans);
    if (!r.global)
        mas = mas.slice(0, 1);
    
    for (var i in mas) {
        var m = mas[i];
        res += s.substring(prev, m.index) + s.substring(m.index, m.index + m.value.length).replace(__noglobal(r), rep);
        prev = m.index + m.value.length;
    }
    
    res += s.substring(prev);
    return res;
}

function replace(s, r, rep, ex) {
    if (!ex)
        return s.replace(r, rep);
    
    var temp = __esc(s).value;
    var mas = __between(temp, r, matches(temp, ex)), res = "", prev = 0;
    if (!r.global)
        mas = mas.slice(0, 1);
    
    for (var i in mas) {
        var m = mas[i];
        res += s.substring(prev, m.index) + s.substring(m.index, m.index + m.value.length).replace(__noglobal(r), rep);
        prev = m.index + m.value.length;
    }
    res += s.substring(prev);
    return res;
}

function split_delims(s, r, a, b, ex) {
    var temp = s, m, res = [], mas;
    var inf = __esc(temp);
    temp = inf.value;
    
    var spans = [];
    while (~(m = matchSection( temp, a, b, ex )).index) {
        spans.push(m);
        temp = temp.substring(0, m.index) + iterate(temp_delim, m.value.length) + temp.substring(m.index + m.value.length);
    }
    
    if (ex)
        spans = spans.concat(matches(temp, ex));
    
    mas = __between(temp, r, spans);
    
    var prev = 0;
    for (var i in mas) {
        var m = mas[i];
        res.push(s.substring(prev, m.index));
        prev = m.index + m.value.length;
    }
    
    var end = s.substring(prev);
    if (end.replace(/ |\t|\n/g, "") != "")
        res.push(end);
    return res;
}

function split(s, r, ex) {
    var temp = s;
    var inf = __esc(temp);
    temp = inf.value;
    
    var res = [], mas;
    mas = __between(temp, r, ex ? matches(temp, ex) : []);
    
    var prev = 0;
    for (var i in mas) {
        var m = mas[i];
        res.push(s.substring(prev, m.index));
        prev = m.index + m.value.length;
    }
    
    var end = s.substring(prev);
    if (end.replace(/ |\t|\n/g, "") != "")
        res.push(end);
    return res;
}

function matchSection(s, a, b, ex) {
    var inf = __esc(s);
    var temp = inf.value;
    
    var spans = ex ? matches(temp, ex) : [];
    var msa = __between(temp, a, spans), msb = __between(temp, b, spans);
    
    if (msa.length != msb.length || msa.length == 0)
        return { index:-1, value:"" };
    
    var endsect = __matchEndSection(msa, msb);
    if (!~endsect.index)
        return { index:-1, value:"" };
    
    conform_matches_string(msa, s);
    conform_matches_string(msb, s);
    return __makeSection(s, msa, msb, endsect);
}

function __makeSection(s, mas, mbs, mend) {
    var resp = mas[0];
    return {
        index:resp.index,
        value:s.substring(resp.index, mend.index + mend.value.length),
        start:resp,
        end:mend
    }
}

// Walk the start and end matches in order, counting depth from the first
// start match; the end match that brings the depth back to zero closes the
// section.  A section cannot begin with an end match.
function __matchEndSection(as, bs) {
    var none = { index:-1, value:"" }, depth = 0, ai = 0, bi = 0;
    if (bs[0].index < as[0].index)
        return none;
    
    while (ai < as.length || bi < bs.length) {
        if (bi == bs.length || (ai < as.length && as[ai].index <= bs[bi].index)) {
            depth++;
            ai++;
        }
        else {
            depth--;
            if (depth == 0)
                return bs[bi];
            bi++;
        }
    }
    return none;
}

// Matches of r in s that lie between the given spans ({index, value}, sorted
// or not, non-overlapping).  Each stretch between spans is matched on its own,
// so a match can never begin inside a span or reach across one.
function __between(s, r, spans) {
    var list = [], prev = 0;
    spans = spans.slice().sort(function(x, y) { return x.index - y.index; });
    spans.push({ index:s.length, value:"" });
    
    for (var i in spans) {
        var sp = spans[i];
        var ms = matches(s.substring(prev, sp.index), r);
        for (var j in ms) {
            ms[j].index += prev;
            list.push(ms[j]);
        }
        prev = sp.index + sp.value.length;
    }
    return list;
}

function __getlegit(ms, ex) {
    var list = [];
    for (var i in ms) {
        var m = ms[i];
        if (m.value.replace(ex, "") != "")
            list.push(m);
    }
    return list;
}

function _count(s, r) {
    return matches(s, r).length;
}

function matches(s, r) {
    if (!r)
        return [];
    var g = __global(r), m, res = [];
    g.lastIndex = 0;
    while ((m = g.exec(s))) {
        if (m[0].length == 0) {     // a pattern that can match nothing must still move on
            g.lastIndex++;
            continue;
        }
        res.push({ index:m.index, value:m[0] });
    }
    return res;
}

function match(s, r) {
    if (!r)
        return { index:-1, value:"" };
    var ind = -1, v = "", ml = s.match(__noglobal(r));
    if (ml) {
        v = ml[0];
        ind = ml.index;
    }
    return {
        index:ind,
        value:v
    };
}

function __global(r) {
    return new RegExp(r.source, r.flags.indexOf("g") == -1 ? r.flags + "g" : r.flags);
}
function __noglobal(r) {
    return new RegExp(r.source, r.flags.replace(/[gy]/g, ""));
}

function __esc(s) {
    var oms = matches(s, __escaped_chars);
    for (var i in oms) {
        var m = oms[i];
        s = s.substring(0, m.index) + iterate(temp_delim, m.value.length) + s.substring(m.index + m.value.length);
    }
    return {
        value:s,
        matches:oms
    };
}
function __unesc(s, oms) {
    for (var i in oms) {
        var m = oms[i];
        s = s.substring(0, m.index) + m.value + s.substring(m.index + m.value.length);
    }
    return s;
}

function iterate(s, t) {
    var r = "";
    for (var i = 0; i < t; i++)
        r += s;
    return r;
}

// node
if (typeof module != "undefined" && module.exports)
    module.exports = {
        split:split, split_delims:split_delims,
        replace:replace, replace_delims:replace_delims,
        matchSection:matchSection, match:match, matches:matches,
        conform_matches_string:conform_matches_string
    };

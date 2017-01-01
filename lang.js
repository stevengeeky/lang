function conform_matches_string(mas, s) {
    for (var i in mas) {
        var m = mas[i];
        mas[i].value = s.substring(m.index, m.value.length);
    }
    return mas;
}

function replace_delims(s, r, rep, a, b, ex) {
    var temp = s, m, res = "", prev = 0, mas;
    while (~(m = matchSection( temp, a, b, ex )).index)
        temp = temp.substring(0, m.index) + iterate(temp_delim, m.value.length) + temp.substring(m.index + m.value.length);
    
    if (!ex) {
        mas = matches(temp, r);
        for (var i in mas) {
            var m = mas[i];
            res += s.substring(prev, m.index) + m.value.replace(r, rep);
            prev = m.index + m.value.length;
        }
    }
    else {
        mas = matches(temp, new RegExp( ex.source + "|" + r.source ));
        for (var i in mas) {
            var m = mas[i];
            if (m.value.replace(ex, "") == "")
                res += s.substring(prev, m.index + m.value.length);
            else
                res += s.substring(prev, m.index) + m.value.replace(r, rep);
            prev = m.index + m.value.length;
        }
    }
    
    res += s.substring(prev);
    return res;
}

function replace(s, r, rep, ex) {
    if (!ex)
        return s.replace(r, rep);
    
    var mas = matches(s, ex), res = "", prev = 0;
    for (var i in mas) {
        var m = mas[i];
        res += s.substring(prev, m.index).replace(r, rep) + m.value;
        prev = m.index + m.value.length;
    }
    res += s.substring(prev);
    return res;
}

function split_delims(s, r, a, b, ex) {
    var temp = s, m, res = [], mas;
    var inf = __esc(temp);
    temp = inf.value;
    
    while (~(m = matchSection( temp, a, b, ex )).index)
        temp = temp.substring(0, m.index) + iterate(temp_delim, m.value.length) + temp.substring(m.index + m.value.length);
    
    if (!ex)
        mas = matches(temp, r);
    else
        mas = __getlegit( matches(temp, new RegExp( ex.source + "|" + r.source )), ex );
    
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
    if (!ex)
        mas = matches(temp, r);
    else
        mas = __getlegit( matches(temp, new RegExp( ex.source + "|" + r.source )), ex );
    
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
    s = inf.value;
    
    if (!ex) {
        var ca = _count(s, a);
        if (ca != _count(s, b) || ca == 0)
            return { index:-1, value:"" };
        
        var msa = matches(s, a), msb = matches(s, b);
        var endsect = __matchEndSection(s, msa, msb);
        
        s = __unesc(s, inf.matches);
        return __makeSection(s, msa, msb, endsect);
    }
    else {
        var ra = new RegExp(ex.source + "|" + a.source);
        var rb = new RegExp(ex.source + "|" + b.source);
        var mas = matches(s, ra), mbs = matches(s, rb);
        
        var las = __getlegit(mas, ex), lbs = __getlegit(mbs, ex);
        
        if (las.length != lbs.length || las.length == 0 || lbs.length == 0)
            return { index:-1, value:"" };
        
        var endsect = __matchEndSection(s, las, lbs);
        
        s = __unesc(s, inf.matches);
        return __makeSection(s, las, lbs, endsect);
    }
}

function __makeSection(s, mas, mbs, mend) {
    var resp = mas[0].index < mbs[0].index ? mas[0] : mbs[0];
    return {
        index:resp.index,
        value:s.substring(resp.index, mend.index + mend.value.length),
        start:resp,
        end:mend
    }
}

function __matchEndSection(s, as, bs) {
    var end = { index:-1, value:"" }, ac = 0, bc = 0, ai = 0, bi = 0;
    var decided = false;
    while (!decided) {
        if (ai == as.length) {
            bc++;
            end = bs[bi];
            bi++;
        }
        else if (bi == bs.length) {
            ac++;
            end = as[ai];
            ai++;
        }
        else if (as[ai].index < bs[bi].index) {
            ac++;
            end = as[ai];
            ai++;
        }
        else {
            bc++;
            end = bs[bi];
            bi++;
        }
        
        decided = (ac == bc) || as.length == 0 && bs.length == 0;
    }
    return end;
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
    var ma = s.match(r);
    if (!ma)
        return 0;
    return ma.length;
}

function matches(s, r) {
    if (!r)
        return [];
    var m, res = [], gind = 0;
    while (~(m = match(s, r)).index) {
        s = s.substring(m.index + m.value.length);
        m.index += gind;
        res.push(m);
        gind = m.index + m.value.length;
    }
    return res;
}

function match(s, r) {
    if (!r)
        return { index:-1, value:"" };
    var ind = -1, v = "", ml = s.match(r);
    if (ml) {
        v = ml[0];
        ind = s.indexOf(v);
    }
    return {
        index:ind,
        value:v
    };
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
//
//}).call(window);
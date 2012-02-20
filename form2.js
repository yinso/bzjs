/* 
   extensible form system. 
   
   each of the form field have the following attributes: 
   
   isa, getValue, setValue 
   
 */ 

function getOneValue(f, filter) {
    filter = filter || function (f) { return f; } 
    if (filter(f)) {
	return f.value; 
    } else {
	return undefined; 
    }
}

function getListValue(lst, filter) {
    var out = bzj.filter(bzj.map1(function (elt) {
	return getOneValue(elt, filter); 
    }, bzj.$slice(lst)), function (x) { return x; }); 
    if (out.length == 0) 
	return undefined; 
    if (out.length == 1) 
	return out[0]; 
    else 
	return out; 
}

function getSelectValue(f) {
    return getListValue(f.options, function (elt) { 
	return elt.selected; 
    }); 
}

function getCheckedValue(f) {
    return getListValue(f, function (elt) { return elt.checked; }); 
}

function getNames(lst) {
    var out = {};
    for (var i = 0; i < lst.length; ++i) {
	var elt = lst[i]; 
	out[elt.name] = elt.name; 
    }
    return bzj.keys(out); 
}

function groupByNames(lst) {
    var out = {}; 
    for (var i = 0; i < lst.length; ++i) {
	var name = lst[i].name; 
	if (out[name]) {
	    if (!bzj.isa(out[name], Array)) {
		out[name] = [ out[name] ]; 
	    }
	    out[name].push(lst[i]); 
	} else {
	    out[name] = lst[i]; 
	} 
    }
    return out; 
}

function getNamedListValues(lst) {
    // see if we have multiple names! 
    var names = getNames(lst); 
    if (names.length == 1) {
	// we just need to determine what type it is! 
	return getListValue(lst, bzj.memberof(lst[0].type, ['radio', 'checkbox']) 
			    ? function (e) { return e.checked; } : function (e) { return e; }); 
    } else { 
	var elts = groupByNames(lst), out = {}; 
	for (var name in elts) { 
	    out[name] = getValue(elts[name]); 
	}
	return out; 
    }
}

function getValue(f) {
    if (bzj.streq(f.tagName, 'form')) {
	return getNamedListValues(f.elements); 
    } else if (f.type) {
	if (bzj.streq(f.tagName, 'select')) {
	    return getSelectValue(f); 
	} else {
	    return getOneValue(f); 
	}
    } else if (f.length) {
	return getNamedListValues(f); 
    } else {
	return undefined; 
    }
}

// this is almost there - but not quite. 
// a couple of things... we are doing more work than necessary. 
// we want to handle a non form collection to ensure that it would work... 
// hmm!!! 
// form.elements already have named collections - just use it (get the names first). 
// the only thing that should have an object should be on top! 
// and then we need to filter out the values for the buttons... i.e. if we are getting 
// values for individual buttons we can return them, but as soon as we are getting them 
// in collections they should be filtered out. 



function isButton(f) {
    return bzj.memberof(f.type, ['submit', 'reset', 'button', 'image']); 
}

function isSelect(f) {
    return bzj.memberof(f.type, ['select-multiple', 'select-one']);
}

function isForm(f) {
    return f.nodeType == bzj.node.TYPE.ELEMENT 
	&& f.tagName.toLowerCase() == 'form'; 
}

function isField(f) {
    return f.nodeType == bzj.node.TYPE.ELEMENT 
	&& bzj.memberof(f.type, ['text', 'textarea', 'hidden', 'password' , 'file' 
				 , 'checkbox', 'radio'
				 , 'select-multiple', 'select-one'
				 , 'button', 'submit' , 'reset' , 'image']);
}

function isChecked(f) {
    return bzj.memberof(f.type, ['radio', 'checkbox']); 
}

function fVal(f) {
    if (f.$$widget$$) 
	return f.$$widget$$.value(); 
    else 
	return f.value; 
}

function singleVal(f, filter) {
    if (!f) {
	return undefined; 
    } if (!filter || filter(f)) {
	return fVal(f); 
    } else { 
	return undefined; 
    }
}

function groupVal(g, filter) {
    return bzj.filter(bzj.map1(function (e) {
	return singleVal(e, filter); 
    }, bzj.$slice(g)), bzj.identity); 
}

function selectVal(s) {
    // bzj.debug.log('selectVal'); 
    return groupVal(s.options, function (e) { return e.selected == true; }); 
}

function checkVal(fs) {
    return groupVal(fs, function (e) { return e.checked == true; }); 
}

function groupByNames(lst) {
    var out = {}; 
    for (var i = 0; i < lst.length; ++i) {
	var name = lst[i].name; 
	if (out[name]) {
	    if (!bzj.isa(out[name], Array)) 
		out[name] = [ out[name] ]; 
	    out[name].push(lst[i]); 
	} else {
	    out[name] = lst[i]; 
	}
    }
    return out; 
}

function fieldVal(f) {
    // bzj.debug.log('fieldVal: ', f.length, ', ', isSelect(f), ' => ' , f.type, ' => ', f.nameo); 
    if (isSelect(f)) {
	return selectVal(f); 
    } else if (f.length) {
	if (isChecked(f[0])) {
	    return checkVal(f); 
	} else {
	    return groupVal(f); 
	} 
    } else {
	return singleVal(f); 
    }
}

function namedVal(lst, button) {
    var test = button ? bzj.identity 
	: function (f) {
	    return !isButton(f) || (f.length && !isButton(f[0])); 
	}; 
    var out = {}, i = 0, lastKey; 
    bzj.each(function(name, group) {
	if (test(group)) {
	    out[name] = fieldVal(group); 
	    i++; 
	    lastKey = name; 
	}
    }, groupByNames(lst)); 
    
    switch (i) {
    case 0: return undefined; 
    case 1: return out[lastKey]; 
    default: return out; 
    }
}

function formVal(lst, button) {
    var test = button ? bzj.identity 
	: function (f) { 
	    // this function has a bug  - it will not check the type correctly if 
	    // the field array has buttons but isn't the first one 
	    // this occurs when different field types share the same field name - 
	    // for now this bug will be considered out of scope, i.e. the way to fix 
	    // the issue is for the form not to have the same field name used by different 
	    // field types (especially button with anything else).
	    return !isButton(f) || (f.length && !isButton(f[0])); 
	}; 
    var out = {}, i = 0, lastKey; 
    bzj.each(function(name, group) {
	if (test(group)) {
	    out[name] = fieldVal(group); 
	    i++; 
	    lastKey = name; 
	}
    }, groupByNames(lst)); 
    return out; 
}

function val(f) {
    if (f.elements) { // we want to filter out the buttons! 
	return formVal(f.elements, false); 
    } else if (f.length && !isSelect(f)) {
	return namedVal(f); 
    } else {
	return fieldVal(f);
    }
}

// time to work on setVal! 
// setVal works backwards a bit... I think... 
// setting individual field. 
function setSingleVal(f, v) {
    f.value = v; 
}

function setExistVal(lst, v, setter, unsetter) {
    v = bzj.array2hash(bzj.isa(v, Array) ? v : [ v ]); 
    for (var i = 0; i < lst.length; ++i) {
	if (v[lst[i].value]) {
	    setter(lst[i]); 
	} else {
	    unsetter(lst[i]); 
	}
    }
}

function setCheckVal(group, v) {
    return setExistVal(group, v, function (e) { e.checked = true; }
		       , function (e) { e.checked = false; } ); 
}

function setSelectVal(s, v) {
    bzj.debug.log('setSelectVal'); 
    return setExistVal(s.options, v, function (e) { e.selected = true; }
		       , function (e) { e.selected = false; }); 
}

function setElementVal(f, v) {
    if (isSelect(f)) {
	setSelectVal(f, v); 
    } else {
	setSingleVal(f, v); 
    }
}

function setListVal(lst, v) {
    v = bzj.isa(v, Array) ? v : [ v ]; 
    for (var i = 0; i < Math.min(lst.length, v.length); ++i) {
	setElementVal(lst[i], v[i]); 
    }
}

function setFieldGroupVal(f, v) {
    if (isChecked(f[0])) {
	setCheckVal(f, v); 
    } else {
	setListVal(f, v); 
    }
}

function setFieldVal(f, v) {
    if (bzj.isa(f, Array)) {
	setFieldGroupVal(f, v); 
    } else {
	setElementVal(f, v); 
    }
}

function setNamedVal(lst, v) {
    var elts = groupByNames(lst); 
    // count to see how many we have... if we only have 1 we have a group! 
    var keys = bzj.keys(elts); 
    if (keys.length == 1) {
	setFieldVal(lst, v); 
    } else {
	for (var name in v) {
	    if (elts[name]) {
		setFieldVal(elts[name], v[name]); 
	    }
	}
    }
}

function setVal(f, v) {
    if (f.elements) {
	setNamedVal(f.elements, v); 
    } else if (f.length) {
	setNamedVal(f, v); 
    } else {
	setFieldVal(f, v); 
    }
}

var FormUtil = { 
    value : function (f, v) {
	if (v) {
	    return setVal(f, v); 
	} else {
	    return val(f); 
	}
    }
    
    , focus : function (elt) {
	if (isForm(elt) || isField(elt)) { // form or field. 
	    elt.focus(); 
	} else if (bzj.node.isa(elt)) { // a node but not form nor field 
	    var elts = bzj.$('input,select,textarea,button,form', elt); 
	    if (elts.length) 
		elts[0].focus(); 
	} else if (elt.length && isField(elt[0])) { // a collection of form fields... 
	    elt[0].focus(); 
	} else {
	    throw new Error ('FormUtil.focus: unknown elt: ' + elt); 
	}
    }
    
    , hasForm : function (elt) {
	var elts = bzj.$('form,input,select,textarea', elt); 
	if (elts.length > 0) {
	    if (isForm(elts[0])) {
		return elts[0]; 
	    } else {
		return elts; 
	    }
	} else { 
	    return undefined; 
	}
    }
}; 

// a form like object should focus on having the elements array that holds
var ElementsLike = bzj.Class ( {
    $base : bzj.$A 
    
    , add1 : function (elt) {
	this[this.length++] = elt; 
	if (this[elt.name]) {
	    if (!bzj.isa(this[elt.name], Array)) {
		this[elt.name] = [ this[elt.name] ]; 
	    }
	    this[elt.name].push(elt); 
	} else {
	    this[elt.name] = elt; 
	}
    }
}); 

var FormLike = bzj.Class( { 
    init : function () {
	this.elements = new ElementsLike(); 
    }
    
    , setup : function(options) {
	this.elements.concat(options.elements || []); 
    }
    
    , focus : function () {
	this.elements[0].focus(); 
    }
    
    , value : function () {
	return FormUtil.value(this); 
    }
}); 

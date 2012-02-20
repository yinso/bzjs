/*

simplified selector. 

// how do we do the chaining method??? 

//*/
(function () {
    
    
    // Result - the values returned by the Selector API... 
    var Result = bzj.Class({
	$base : bzj.$A 
    } , { 

    } , { 
	join : function () {
	    var out = new Result(); 
	    for (var i = 0; i < arguments.length; ++i) {
		out.concat(arguments[i]); 
	    }
	    return out; 
	}
    }); 
    
    //Returns true if it is a DOM node
    var isNode = function(o){
	return (
	    typeof Node === "object" ? o instanceof Node : 
		typeof o === "object" && typeof o.nodeType === "number" && typeof o.nodeName==="string"
	);
    };
    
    //Returns true if it is a DOM element    
    // safari does not respond to HTMLDocument... 
    
    var isOldElement = function (o) {
	return typeof o === 'object'
	    && (o.nodeType == bzj.node.TYPE.ELEMENT 
		|| o.nodeType == bzj.node.TYPE.DOCUMENT) 
	    && typeof o.nodeName == 'string'; 
    }; 

    var isElement = function(o){
	return isOldElement(o); // I don't understand why safari does not work!!! 
	if (bzj.browser.safari) {
	    return isOldElement(o); 
	}
	var is = typeof HTMLElement === 'object'
	    ? o instanceof HTMLElement || o instanceof HTMLDocument  
	    : isOldElement(o); 
	return is; 
    };
    
    /* some selections are applied as filters!! 
     * the challenge is that if we do not keep track of intermediate states
     * these filters will be hard to deal with... 
     * what does it mean? 
     * it means that we need to utilize multiple result sets 
     * and then combine them in the end! 
     * i.e. join or append. 
     * 
     */ 
    
    // IE does not have getElementsByClassName function... 
    // http://robertnyman.com/2008/05/27/the-ultimate-getelementsbyclassname-anno-2008/
    function selectByClass (Class, elt, result) {
	if (elt.getElementsByClassName) {
	    result.concat(bzj.$slice(elt.getElementsByClassName(Class))); 
	} else {
	    var elts = elt.getElementsByTagName('*'); 
	    for (var i in elts) {
		if (bzj.node.Class.has(elts[i], Class)) {
		    result.push(elts[i]); 
		}
	    } 
	}
    }
    
    function selectElement ( element , nothing , result , criteria ) {
	criteria = criteria || function (elt) { return true ; } ; 
	if (criteria (element)) {
	    result.push (element); 
	}
    }
    
    function selectAll ( selector , parent , result ) {
	result.concat(parent.getElementsByTagName('*')); 
    }
    
    function selectMultiple(selector, parent , result ) {
	// multiple selectors!!! 
	bzj.each(function (i, selector) {
	    Selector(selector, parent, result); 
	}, selector.split(/\s*\,\s*/)); 
    }

    function selectByElement(selector, parent, result) {
	/* Node selector: Selector('tag'); */ 
	result.concat(parent.getElementsByTagName(selector)); 
    }

    function selectByID (id, elt, result) {
	result.push(elt.getElementById(id));
    }
    
    function selectByElementClass(selector, parent, result) {
	// there should be 2 things passed in... 1 - a list of 
	var temp = new Result(); 
	selectByElement(selector[0], parent, temp); 
	bzj.each ( function (i, elt) {
	    selectByElement(elt, null, result
			    , function (elt) {
				return bzj.node.Class.has(elt, selector[1]); 
			    }); 
	}, temp);
    }
    
    function selectByElementID(selector, parent, result) {
	return selectByID(selector[1], parent, result); 
    }
    
    /* this is another combinator selector... hmm... it requires the concept of filter */ 
    function selectByChild(selector, parent, result) {
	/* ul>em 
	   ul > em 
	   basically it selects the direct children and does not consider descendents 
	   of children 
	   // */ 
	// this requires the ability to just match an individual element to see if 
	// it satsfies a particular criteria!... 
    }
    
    function selectByHierarchy(selector, parent, result) {
	/* div div - select */ 
    }
    
    // this is a basic sets of selector right now... we should eventually make this
    // extensible... 
    // the selector will return an array-like object, which can be chained... 
    /* 
       [object] - return itself 
       [string] - selectors (the rest are strings) 
       (these are the 4 basic selectors provided via DOM) 
       * - return all elements 
       .class - return by class name 
       #id - return by id 
       tag - return by element tag name 
       
       (these are filter selectors)
       
       tag.class - elements with the tag name AND the class! 
       tag#id - elements with the tag name AND the ID! 
       
       [attr=val] ===> *[attr=val] - filters elements with the attribute equal value. 
       
       tag[attr=val] = apply [attr=val] to the tag elements. 
       
       :pseudo = custom filters that applies @ the level of [attr=val]. 
       
       '>' ==> 'parent>child' = apply the child selector to only the CHILDREN of parent 
       
       ' ' ==> 'ancestor descendent' = apply the descendent to the ancestor filter. 
       
       (these are combining selectors) 
       
       
       
       */ 
    var Selector = function(selector, elt , result) {
	elt = elt || document; 
	result = result || new Result(); 
	if (selector.nodeType) { // passing in an element... 
	    selectElement (selector, elt, result); 
	} else if (selector == '*') { // special case... when passing in a *.  
	    selectAll(selector, elt, result); 
	} else {
	    var match; 
	    if (match = /\s*\,\s*/.exec(selector)) {
		selectMultiple(selector, elt, result); 
	    } else {
		if (match = /\s+/.exec(selector)) {
		    // this one deals with hierarchial selections... 
		} else if (match = /^\#([\w-_]+)$/.exec(selector)) {
		    // #id 
		    selectByID ( match[1], elt, result); 
		} else if (match = /^(\w+)$/.exec(selector)) { 	  
		    // element 
		    selectByElement(match[1], elt, result); 
		} else if (match = /^\.([\w-_]+)$/.exec(selector)) {
		    // .class
		    selectByClass(match[1], elt, result); 
		} else if (match = /^(\w+)\.([\w-_]+)$/.exec(selector)) {
		    // elt.class 
		    selectByElementClass([ match[1], match[2] ], elt, result); 
		} else if (match = /^(\w+)\#([\w-_]+)$/.exec(selector)) {
		    // elt#id - redundant 
		    selectByElementID([ match[1], match[2]], elt, result); 
		}
	    }
	}
	return result; 
    }; 
    
    // skipped over the *val*... ??? 
    Selector.extend = function (key, val) {
	Result.prototype[key] = val; 
    }; 
    
    if (bzj.event) {
	bzj.each (function (key, val) {
	    if (val === true) {
		Selector.extend(key, function(callback) {
		    this.each(function (elt) {
			bzj.event[key](elt, callback); 
		    }); 
		}); 
	    }
	} , bzj.event.TYPES); 
    }
    
    bzj.extend(bzj, { $ : Selector
		    }); 
    bzj.$A.isa = function (v) {
	return v instanceof ArrayLike; 
    }; 
})(); 

  
(function () {
/**********************************************************************
  this is a combinable, extensable selector API. 
  
  A selector API has the following portion. 
  
  1 - group operator 
  - there is only one gropu selector and this is hard coded
  ',' -> group selector joins two separate selections into one. 
  
  2 - combinator operators 
  - these "inserts" redirections into the selection process. 
  ' ' -> descendent selector - this is the default
  '>' -> child selector - this ensure the next selector only operates on the children of the current element 
  '+' -> next sibling selector - this ensure the next selector will operate only on the next sibling. 
  
  3 - descendent selectors 
  - these selectors select the descendent and returns the descendents. 
  - all element selectors returns an array, except descByID.
  
  4 - element selectors 
  - these selectors "filters" the current element to see if it fits the criteria.  If so - return the same element
  otherwise return null. 
  - given that the descendent selectors are "expensive" to build, element selectors are the 
  logical place for extensions. 
  
  the true place for extensions are the pseudo selectors - they start with : - and depending 
  on what the colon is trying to do it is either 
  
**********************************************************************/

// requirements. 
// base.js 
// node.js
// event.js 

/**********************************************************************
 * basic element level filters
 **********************************************************************/

function byElt(test) {
    return function (elt) {
	if (test(elt)) 
	    return elt; 
	return null; 
    }; 
}

function hasClass(klass) {
    return byElt(function (elt) {
	return bzj.node.Class.has(elt, klass); 
    }); 
}

function hasID(id) {
    return byElt(function (elt) {
	return elt.id == id; 
    }); 
}

function isTag(tag) {
    tag = tag.toLowerCase();
    return byElt(function (elt) {
	return elt.nodeType == bzj.node.TYPE.ELEMENT
	    && elt.tagName.toLowerCase() == tag; 
	// return elt.tagName.toLowerCase() == tag; 
    }); 
}

function attr(name, test) {
    test = test || function (v) { return v; }
    return byElt(function (elt) {
	return test(elt[name]); 
    }); 
}
    
    // CompAttrRegistry
    // stores a list of functions that are used for comparing attribute values 
    // this is the registry to extend if we want to add additional custom attribute comparisons
    // 
    var CompAttrRegistry = 
	bzj.singleton(bzj.registry
		      , {} 
		      , {
			  // = : equal
			  '=' : function (x, y) { return x == y; }
			  
			  // *= : contains 
			  , '*=' : function (x, y) { return x.indexOf(y) != -1; }
			  
			  // ~= : match against one of the values of a string that is space delimited 
			  // (this is the type of value that tag.class is, though I am not aware of another one)
			  , '~=' : function (x, y) {  //
			      var obj = bzj.array2hash(bzj.split(bzj.trim(x)));
			      return obj[y] ? true : false; 
			  } 
			  
			  // |= : matches against value that is hyphen delimited. 
			  , '|=' : function (x, y) {
			      var obj = bzj.array2hash(bzj.split(bzj.trim(x), '-'));
			      return obj[y] ? true : false;
			  }
			  
			  // != : matches if the value does not exist or value does not match
			  , '!=' : function (x, y) {
			      if (!x) return true;
			      return x != y; 
			  }
			  
			  // ^= : matches if the beginning of the value matches 
			  , '^=' : function (x , y) {
			      return x.indexOf(y) == 0; 
			  }
			  
			  // $= : matches if the end of the value matches... 
			  , '$=' : function (x, y) {
			      // this could be a bit expensive... 
			      return CompAttrRegistry.ref('^=')(x.split('').reverse().join('')
								, y.split('').reverse().join(''));
			  }
			  
		      }); 
		      
function compAttr(name, val, comp) {
    comp = comp || '=' ; // the default comparison.
    comp = CompAttrRegistry.ref(comp || '=') || CompAttrRegistry.ref('='); 
    return attr(name, function (v) {
	return comp(v, val); 
    });
}

/**********************************************************************
 * DOM navigation selectors (children, firstChild, parent, etc). 
 **********************************************************************/

function children(elt) {
    return bzj.$slice(elt.childNodes);
}

function firstChild(elt) {
    return elt.firstChild; 
}

function lastChild(elt) {
    return elt.lastChild; 
}

function parent(elt) {
    return elt.parentNode; 
}

function nthChild(n) {
    if (elt.childNodes.length >= n) {
	return elt.childNodes[n - 1]; 
    }
    return null; 
}

function ancestors(elt) {
    var out = [], parent; 
    while (parent = elt.parentNode) {
	out.push(parent);
	elt = parent; 
    }
    return out; 
}

function previousSibling(elt) {
    return elt.previousSibling; 
}

function previousSiblings(elt) {
    var out = [], sibling; 
    while (sibling = elt.previousSibling) {
	out.push(sibling);
	elt = sibling; 
    }
    return out; 
}

function nextSibling(elt) {
    return elt.nextSibling; 
}

function nextSiblings(elt) {
    var out = [], sibling; 
    while (sibling = elt.nextSibling) {
	out.push(sibling);
	elt = sibling; 
    }
    return out; 
}

function siblings(elt) {
    return previousSiblings(elt).concat(nextSiblings(elt)); 
}

/**********************************************************************
 * descendent-specific filters (the reason we have these is because 
 * they are optimized by DOM). 
 **********************************************************************/

function descByClass(klass) {
    return function (elt) {
	if (elt.getElementsByClassName) {
	    return bzj.$slice(elt.getElementsByClassName(klass));
	} else {
	    return bzj.map1(hasClass(klass), 
			    bzj.$slice(elt.getElementsByTagName('*')));
	}
    }; 
}

function descByID (id) {
    return function (elt) {
	if (elt.ownerDocument) {
	    var e = elt.ownerDocument.getElementById(id);
	    return e; 
	} else {
	    return null; 
	}
    };
}

function descByTag (tag) {
    return function (elt) {
	// what do I have here??? huh??? 
	bzj.debug.log('descByTag: ', tag, ' => ');  // what am I getting here? 
	return bzj.$slice(elt.getElementsByTagName(tag));
    };
}

    var descendents = descByTag('*'); // wild card *. 

/**********************************************************************
 * all the base selectors are captured in the Selectors object! 
 * this is the place to add to if one need to add primitive selectors 
 * 
 * css selector string will be compiled down to these primitive selectors.
 **********************************************************************/

var BaseRegistry =
    bzj.singleton(bzj.registry 
		  , {} 
		  , {
		      hasClass : hasClass 
		      , hasID : hasID 
		      , attr : attr 
		      , compAttr : compAttr 
		      , isTag : isTag 
		      , parent : parent 
		      , children : children 
		      , firstChild : firstChild
		      , lastChild : lastChild 
		      , nthChild : nthChild 
		      , previousSibling : previousSibling 
		      , nextSibling : nextSibling 
		      , ancestors : ancestors 
		      , previousSiblings : previousSiblings 
		      , nextSiblings : nextSiblings 
		      , siblings : siblings 
		      , descByClass : descByClass 
		      , descByID : descByID 
		      , descByTag : descByTag
		      , descendents : descendents 
		  } ); 

/**********************************************************************
 * selector combinators (higher order selectors). 
 * 
 * these are the combinators that ties together the primitive selectors 
 * to return a higher order selector that can be cached for future use. 
 **********************************************************************/

// eltIf - a combinator that runs the filter only if the elt is present. 
function eltIf(filter) {
    return function(elt) {
	if (elt) 
	    return filter(elt);
	return null; 
    }
}

// chain2 - combine 2 selector/filter together.  note that each selectors are 
// wrapped by eltIf to ensure that each can handle the null case.
// also the chain will be guaranteed to return an array. 
function chain2(s1, s2) {
    return function (elt) {
	var out = eltIf(s1)(elt); 
	if (!out) 
	    return null; 
	return bzj.map1(eltIf(s2), bzj.isArray(out) ? out : [ out ]); 
    }
}

// chain - a general case of chain2 (handle variable length arguments). 
function chain(s1, s2) {
    if (arguments.length == 1) 
	return eltIf(s1); 
    else if (arguments.length == 2) 
	return chain2(s1, s2); 
    else {
	var args = bzj.$slice(arguments);
	args.shift(); 
	return chain2(s1, chain.apply(null, args)); 
    }
}

/**********************************************************************
 * result combinators - these are the final combinators that ensures 
 * the results returned are according to what we want! 
 **********************************************************************/

// filterResult - this is the top-level selector combinator that filters and flatten 
// the results returned by the inner filter. 
// combine all of the selectors prior to call this function. 
function filterResult(filter) {
    return function (elt) {
	elt = elt || document.body; 
	var out = filter(elt); 
	if (!out) {
	    return []; 
	} else if (bzj.isa(out, Array)) {
	    return bzj.filter(bzj.flatten(out), function (x) { return x; }); 
	} else { 
	    return [ out ] ; 
	}
    }
}

// makeSelector - make the selector by chaining the filters. 
function makeSelector(filters) {
    return filterResult(chain.apply(null, filters)); 
}

// makeMultipleSelector - chains the filters and then group them together. 
function makeMultipleSelector(filters) {
    return filterResult(function (elt) {
	return bzj.map1(function (filter) {
	    return filter(elt); 
	}, filters); 
    }); 
}

// toSelector - convert a spec (which is converted from the selector's text representation)
// into actual selector function. 
// a spec is an array that contains the function name as well as the parameters that 
// we can use to build up the selectors. 
// for example - ['children'] -> results in running the children() selector. 
// ['isTag', 'p'] ==> isTag('p'); 
// ['compAttr', 'href', 'http://', '~'] => compAttr('href', 'http://', '~'); 
// etc.  
function toSelector(spec) {
    if (bzj.isArray(spec)) {
	bzj.assert.run(function () { return spec.length > 0; }
		       , "buildSelector: invalid spec - empty array");
	var proc = spec.shift(); 
	var selector = BaseRegistry.ref(proc); 
	bzj.assert.run(function () { return selector; }
		       , "buildSelector: unknown procedure: " + proc); 
	if (spec.length) {
	    return selector.apply(null, spec); 
	} else {
	    return selector; 
	}
    } else {
	var selector = BaseRegistry.ref(proc); 
	bzj.assert.run(function () { return selector; }
		       , "buildSelector: unknown procedure: " + spec); 
	return selector; 
    }
}

// buildSelector
// take a chain of specs and convert each spec into selector and then chain them together.
// if there are multiple chains of specs, then makeMultipleSelector will be called 
// to ensure they are grouped together. 
function buildSelector(specs) {
    bzj.assert.run(function() { return specs; } , "buildSelector - empty spec!"); 
    if (arguments.length == 1) {
	return makeSelector(bzj.map1(toSelector, specs)); 
    } else {
	return makeMultipleSelector(bzj.map1(function (specs) {
	    return chain.apply(null, bzj.map1(toSelector, specs)); 
	}, bzj.$slice(arguments)));
    }
}

/*
 * the above are enough to construct the selectors from a series of specs.
 * the code below are focused on converting the selector in string format into the specs
 * and into an actual selector function. 
 */

/**********************************************************************
 * working with Atomic Selector
 * an atomic selector is one that should not be further divided from semantics perspective.
 * 
 * examples are - tag , tag.class, tag#id , tag[attr=value], etc. 
 * 
 * one way to think about them is that they cannot be written with spaces in between.
 * (potentially in the future we might allow spaces to be escaped in value 
 * of tag[attr=value] but that's in the future). 
 * 
 * although the atomic selectors are atomic from user's perspective, they do not 
 * map to a single primitive selector (the code below demonstrates that).
 * 
 * for example - tag#id is a combo of isTag(tag) and hasID(id)
 * 
 * furthermore - due to the way the selector combinator works, they can impact the 
 * subsequent mode that the atomic selector are in.
 * 
 * example - div table maps to descByTag(div) descByTag(table), 
 * but - div > table maps to descByTag(div) children() isTag(table). 
 * and - div + table maps to descByTag(div) nextSibling() isTag(table). 
 * 
 * so it's clear that the mapping depends on the operator itself, and that 
 * currently we have 2 modes - one mode is a descendent mode (it is the 
 * default mode since the descendent mode is the easiest way to write in css) 
 * and the other mode is the element mode.
 * 
 * so - descByTag is the descendent mode, and isTag is the element mode. 
 * 
 * most likely there will not be any other modes.  but the modes are also 
 * exposed 
 **********************************************************************/

var ModeRegistry = 
    bzj.singleton(bzj.registry 
		  , {
		      // register function is used to add a new type with the modes of descendent & element.
		      register : function ( type , modes ) {
			  // the modes just have descendent & element and each value must exist as a selector. 
			  bzj.assert.run(function () {
			      return modes.descendent && modes.element
				  && BaseRegistry.ref(modes.descendent) 
				  && BaseRegistry.ref(modes.element); 
			  }, 'ModeRegistry.register - invalid modes: ' + JSON.stringify(modes));
			  this.$super.register(type, modes); 
		      }
		      
		      // use this function to retrieve the actual selector mapping. 
		      , map : function ( type , mode ) {
			  var me = this; 
			  bzj.assert.run(function () {
			      return me.ref(type); 
			  }, 'ModeRegistry - invalid type: ' + type); 
			  return this.ref(type)[mode]; 
		      }
		  }
		  , { tag : { descendent : 'descByTag' , element : 'isTag' }
		      , klass : { descendent : 'descByClass' , element : 'hasClass' }
		      , id : { descendent : 'descByID' , element : 'hasID' } 
		    }); 

/**********************************************************************
 * matching the individual selectors. 
 * 
 * below are pairs of regexp and converter function.
 * the regexp matches the individual selector string, and the corresponding 
 * converter then takes the the matched values and then convert them into specs.
 * 
 * note that the regex has paren-captures that are passed into the converters.
 * 
 * and note that corresponding converters takes in the captures, as well 
 * as an acc (accumulator) and the mode.  We discussed the mode above already.
 * and the acc holds all of the existing parsed spec.  do the necessary processing
 * and add to it. 
 * 
 **********************************************************************/
var allRE = /^(\*)$/; // * 

function convertAll (all , acc, mode) {
    acc.push(['descendents']); 
}

var tagRE = /^(\w+)$/;// tag 

function convertTag(tag , acc, mode) {
    acc.push([ModeRegistry.map('tag', mode), tag]); 
}

var classRE = /^\.([\w-_]+)$/; // .class 

function convertClass(klass , acc , mode) {
    acc.push([ModeRegistry.map('klass', mode), klass]); 
}

var idRE = /^\#([\w-_]+)$/; // #id

function convertID(id , acc , mode) {
    acc.push([ModeRegistry.map('id', mode), id]); 
}

    var attrRE = /^\[([\w-_]+)\]$/; // [attr]
    
    function convertAttr(attr, acc, mode) {
	if (acc.length == 0) { // means this is the first element
	    convertAll ('*', acc, mode); 
	}
	acc.push(['attr', attr]); 
    }
    
    var compAttrRE = /^\[([\w-_]+)(\*=|\|=|~=|\$=|\!=|\^=|=)([^\]]+)\]$/; // [attr]
    
    function convertCompAttr(attr, op, value, acc, mode) {
	if (acc.length == 0) { // means this is the first element
	    convertAll ('*', acc, mode); 
	}
	acc.push(['compAttr', attr, value, op]); 
    }
    
    // convert the RE & converters into tag-based RE & converters 
    
    function convertToTaggedRE(re) {
	var source = re.source; 
	var start = source.substring(0,1) == '^' ? '^' : ''; 
	var end = source.substring(source.length - 1) == '$' ? '$' : '';
	var middle = source.substring(start ? 1 : 0, end ? source.length - 1 : source.length) ;
	return new RegExp(start + "(\\w+)" + middle + end); 
    }
    
    function convertToTaggedConverter(converter) {
	return function () {
	    var args = bzj.$slice(arguments); 
	    bzj.assert.run(function () { 
		return args.length >= 3; 
	    }, "tagged converter - not enough arguments: " + args.length); 
	    var tag = args[0]; 
	    var acc = args[args.length - 2];
	    var mode = args[args.length - 1]; 
	    convertTag(tag, acc, mode); 
	    args.shift(); 
	    args.pop(); 
	    args.push('element'); // ensure the mode becomes element! 
	    converter.apply(null, args); 
	}
    }
    
    var tagClassRE = convertToTaggedRE(classRE); 
    // alert(tagClassRE); 
    var convertTagClass = convertToTaggedConverter(convertClass); 
    
    var tagIDRE = convertToTaggedRE(idRE); 
    var convertTagID = convertToTaggedConverter(convertID); 
    
    var tagAttrRE = convertToTaggedRE(attrRE); 
    var convertTagAttr = convertToTaggedConverter(convertAttr); 
    
    var tagCompAttrRE = convertToTaggedRE(compAttrRE); 
    var convertTagCompAttr = convertToTaggedConverter(convertCompAttr); 

/* 
    // special :blah events... this is the next area of extension... 
    // anyhow - this is not highly important right now... 
    // :checked => :checked 
    var customRE = /^\:([\w-_]+)$/; 
    
    function convertCustom(custom, acc, mode) {
	// we want to use this custom to look up the appropriate function! 
	// each custom does exactly the same thing as each one of these functions.
	
    }
    
    function checked(acc, mode) {
	
    }
// */ 

/**********************************************************************
 * AtomicSelector holds all the converters as well as a registery for 
 * managing the converters. 
 **********************************************************************/

var ArrayRegExpRegistry = bzj.Class( { 
    $base : bzj.arrayRegistry 
    
    // register additional atomic selectors, this is most likely the place that 
    // will get extended (along with custom selectors). 
    , register : function (regex, value) {
	bzj.assert.run(function () { 
	    return bzj.isa(regex, RegExp);
	}, "RegExpRegistry.register: " + regex + " is not regex.");
	this.$super.register(regex, value); 
    }
    
    , compKey : function (i, regex) {
	return this._key(i).source === regex.source; 
    }
    
} ); 

var AtomicRegistry = 
    bzj.singleton(ArrayRegExpRegistry 
		  , { 
		      // convert the selector into spec.  This is the workorse function. 
		      toSpec : function (selector, acc, mode) {
			  acc = acc || []; 
			  mode = mode || 'descendent'; 
			  for (var i = 0; i < this.registry_.length; ++i) {
			      var match = this._key(i), convert = this._value(i); 
			      var matched = match.exec(selector); 
			      if (matched) {
				  matched.shift(); 
				  matched.push(acc); 
				  matched.push(mode); 
				  return convert.apply(null, matched); 
			      }
			  }
			  throw new Error('selectorToUnitSpec: invalid selector: ' + selector); 
		      }
		  }
		  , [ [ allRE , convertAll ] 
		      , [ tagRE , convertTag ] 
		      , [ classRE , convertClass ] 
		      , [ idRE , convertID ] 
		      , [ attrRE , convertAttr ] 
		      , [ compAttrRE , convertCompAttr ] 
		      , [ tagClassRE , convertTagClass ] 
		      , [ tagIDRE , convertTagID ] 
		      , [ tagAttrRE , convertTagAttr ] 
		      , [ tagCompAttrRE , convertTagCompAttr ] ]
		 ); 

/**********************************************************************
 * Combinators - for combining multiple selectors together. 
 * 
 * the operators are basically single character tokens like ' ', '>', or '+'. 
 * 
 * the combinators must be a function that takes in 2 args: 
 * a string & an accumulator. 
 * 
 * below are the default combinators.  note they mostly has to do with changing 
 * the mode, as well as adding transition filter.  The default (descendents) have 
 * no such transition filter or changing of the mode since it is the default. 
 **********************************************************************/

function combineDescendent(s, acc) {
    AtomicRegistry.toSpec(s, acc); 
}

function combineChildren(s, acc) {
    acc.push(['children']); 
    AtomicRegistry.toSpec(s, acc, 'element'); 
}

function combineNextSibling(s, acc) {
    acc.push(['nextSibling']); 
    AtomicRegistry.toSpec(s, acc, 'element'); 
}

// is there a way to create a specific instance & then overwrite the version? 

var CombinatorRegistry = 
    bzj.singleton(bzj.registry
		  , { 
		      register : function (operator, combinator) {
			  bzj.assert.run(function () {
			      return typeof(operator) === 'string' && operator.length == 1; 
			  }, "CombinatorRegistry operator must be one character only; passed in '" 
					 + operator + "'"); 
			  this.$super.register(operator, combinator); 
			  // this.registry_[operator] = combinator; 
		      }
		      
		      , regex : function () {
			  return new RegExp("\\s*([" 
					    + this.keys().join() 
					    + "])\\s*"); 
		      }
		      
		      // the combinator needs to be true delimiters, i.e. the deilmited tokens 
		      // should never have two delimiters right next to each other! 
		      , assertCombinatorAsDelim : function (tokens) {
			  bzj.assert.run(function () {
			      return tokens.length % 2 == 1; 
			  }, "tokenize: tokens length cannot be even numbers"); 
			  for (var i = 0; i < tokens.length; ++i) {
			      if (this.ref(tokens[i]) && (i % 2 == 0)) {
				  throw new Error('assertCombinatorAsDelimiter failed: [' + tokens.join(',') + ']'); 
			      }
			  }
		      }
		      
		      , tokenize : function tokenizeSelector(s) {
			  var me = this; 
			  return bzj.map1(function (str) { 
			      var tokens = bzj.filter(bzj.split(str, me.regex())
						      , function (x) { return x !== ''; }); 
			      me.assertCombinatorAsDelim(tokens); 
			      return tokens; 
			  } , bzj.split(s, /\s*\,\s*/)); 
		      }
		      
		      , tokensToSpecs : function (tokens) {
			  var acc = []; 
			  for (var i = 0; i < tokens.length; ++i) {
			      if (i == 0) {
				  AtomicRegistry.toSpec(tokens[i], acc); 
			      } else {
				  var delim = tokens[i - 1];
				  var combinator = this.ref(tokens[i - 1]); 
				  combinator(tokens[i], acc); 
			      }
			      ++i;
			  }
			  return acc; 
		      }
		  }
		  
		  , { ' ' :  combineDescendent 
		      , '>' : combineChildren 
		      , '+' : combineNextSibling
		    }
		 ); 

function convertSelector(s) {
    var specs = bzj.map1(function (tokens) {
	return CombinatorRegistry.tokensToSpecs(tokens); 
    } , CombinatorRegistry.tokenize(s)); 
    return buildSelector.apply(null, specs); 
}

var SelectorRegistry = 
    bzj.singleton(bzj.registry 
		  , { register : function (selector) {
		      if (!this.registry_[selector]) {
			  this.registry_[selector] = convertSelector(selector); 
		      }
		  }
		    }); 

/**********************************************************************
 * Result - an ArrayLike structure that we can extend without having to 
 * worry about polluting the global space. 
 **********************************************************************/

var Result = bzj.Class({ 
    
    $base : bzj.$A 
    
} , {

} , {
    extend : function (obj) {
	bzj.extend(Result.prototype, obj); 
    }
    
}); 


/**********************************************************************
 * Selector - the top level object that we will be using to interface
 * with everything! 
 **********************************************************************/

function Selector(criteria, element) {
    element = element || document.body; 
    bzj.assert.run(function () {
	return bzj.node.isa(element); 
    }, 'bzj.selector: invalid context - not a DOM node.'); 
    if (typeof criteria === 'string') {
	SelectorRegistry.register(criteria); 
	var selector = SelectorRegistry.ref(criteria); 
	return new Result(bzj.unique(selector(element))); 
    } else if (bzj.isa(criteria, Array) 
	       || bzj.isa(criteria, bzj.$A)) {
	return new Result(criteria); 
    } else {
	return new Result([ criteria ] ); 
    }
}

bzj.extend(Selector, { 
    
    result : Result 
    
    , registry : SelectorRegistry 
    
    , atomic : AtomicRegistry 
    
    , combinator : CombinatorRegistry 
    
    , mode : ModeRegistry 
    
    , base : BaseRegistry 
    
    , attr : CompAttrRegistry
    
    , extend : function (key, val) {
	var obj = {}; 
	obj[key] = val;
	Result.extend(obj); 
    }
    
}); 
    
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
	
	Selector.extend('bind', function (type, callback, test) {
	    this.each(function (elt) {
		bzj.event.bind(elt, type, callback, test); 
	    }); 
	}); 
	    
	Selector.extend('unbind' , function (type, callback) {
	    this.each(function (elt) {
		bzj.event.unbind(elt, type, callback); 
	    }); 
	}); 
	    
	Selector.extend('trigger',  function (type) {
	    this.each(function (elt) {
		bzj.event.trigger(elt, type); 
	    }); 
	}) ; 
    }
    
    bzj.extend(bzj, { $ : Selector }); 
    
})(); 

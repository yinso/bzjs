/* there are a couple of things to do with DOM. 
 * 
 * 1 - select the appropriate node. this should be taken care of by the selector API, which is 
 *     being flushed out (and want to make sure that it is extensible).
 *     
 * 1.5 - another type of selection is the text-selection.  this is handled by the selection API, 
 *       which attempts to simplify selection and ranges (and introduce IE's concept of bookmark
 *       to other browsers). 
 *     - NOTE - in IE there is a control range as well as a text range, which obviously
 *       makes more sense to collapse them together as a single range.
 *     - we will figure out how to do something like that as we go forward... 
 * 
 * 2 - manipulate the node(s). 
 *     
 *     creating, adding, replacing, and converting, the nodes. 
 * 
 * 3 - events & custom events. 
 *
 * so we have just about everything above in limited fashion (i.e. alpha software). 
 * and let's see if we can organize them together... 
 * 
 * the selector API is based on jQuery's design. our goal is to make it into a customizable
 * and extensible selector.  coupled with the event API it should handle most of the programmatic
 * needs.  
 * 
 * Honestly I shouldn't have to do this and can just rely on jQuery... but I got a bit ambitious... 
 * oh well... 
 * 
 * there should also be a *core* module, which is actually smaller than I have imagined if 
 * I 
 */
(function () {
    /**********************************************************************
     * TYPE - constants about node types... 
     **********************************************************************/
    var TYPE = {
	ELEMENT : 1
	, ATTRIBUTE : 2 
	, TEXT : 3 
	, CDATA : 4 
	, ENTITYREF : 5 
	, ENTITY : 6 
	, PI : 7 
	, COMMENT : 8 
	, DOCUMENT : 9 
	, DOCTYPE : 10 
	, FRAGMENT : 11 
	, NOTATION : 12 
    }; 
    
    /* 
     * member
     *
     */
    
    
    /* 
     * isNode 
     *
     */
    // /* 
    function isLegacyNode(e) {
	return typeof e == 'object' 
	    && typeof e.nodeType == 'number';  
    }
    
    var isNode = document.all ? isLegacyNode 
	: function (e) {
	    // the legacy code is required test because  
	    // chrome & safari will produce nodes that are not instanceof Node. 
	    return e instanceof Node || isLegacyNode(e); 
	}; 
    
    /*
     * element class management. 
     */ 
    
    var Class = {
	toObject : function (value) {
	    if (typeof value === 'string') {
		return bzj.array2hash(bzj.split(bzj.trim(value)));
	    } else {
		return {}; 
	    } 
	}
	
	, toClass : function (elt, attr) {
	    attr = attr || 'className'; 
	    return Class.toObject(elt[attr]); 
	}
	
	, toString : function  (obj) {
	    // just add the keys together as a single string... 
	    var cls = []; 
	    bzj.each ( function (k, v) { 
		clas.push (k); 
	    }, obj); 
	    return cls.join(' '); 
	}
	
	, setClass : function (elt, obj, attr) {
	    attr = attr || 'className'; 
	    if (typeof obj === 'string') {
		elt[attr] = obj; 
	    } else if (typeof obj === 'object') { 
		elt[attr] = Class.toString(obj); 
	    } // otherwise do nothing! 
	}
	
	, add : function (elt, klass) {
	    var cls = Class.toClass(elt); 
	    cls[klass] = klass; 
	    Class.setClass(elt, cls); 
	}
	
	, remove : function (elt, klass) {
	    var cls = Class.toClass(elt);
	    delete cls.klass; 
	    Class.setClass(elt, cls); 
	}
	
	, toggle : function (elt, klass) {
	    var cls = Class.toClass(elt);
	    if (cls[klass]) {
		delete cls.klass;
	    } else {
		cls[klass] = klass; 
	    } 
	    Class.setClass(elt, cls); 
	}
	
	, has : function (elt, klass) {
	    var cls = Class.toClass(elt);
	    return cls[klass] ? true : false; 
	}
    }; 
    
    /*
     * makeNode 
     * a simplified function to makeNode. 
     */
    function makeNode (tag , attrs) {
	attrs = attrs || {}; 
	var doc = bzj.attr(attrs , 'document' , document , true); 
	var parent = bzj.attr(attrs, 'parent' , null , true); 
	var before = bzj.attr(attrs, 'before', null , true); 
	var after = bzj.attr(attrs, 'after', null, true); 
	var pos = bzj.attr(attrs, 'pos', null , true); 
	var children = bzj.attr(attrs, 'children', null, true); 
	var html = bzj.attr(attrs, 'html', null, true); 
	var text = bzj.attr(attrs, 'text', null, true); 
	var className = bzj.attr(attrs, 'classes', null, true); 
	var elt = null;  
	if (/^\s*\</.exec(tag)) { 
	    // if this is an html fragment - create it and then get the first child node 
	    // note that this does not work with fragments, nor does this guarantee that the 
	    // first element is an element... 
	    var tmp = doc.createElement('div'); 
	    tmp.innerHTML = tag.replace(/<script(.|\s)*?\/script>/g, '')
	    elt = tmp.childNodes[0]; 
	} else {
	    bzj.debug.log('bzj.node.make: ', tag); 
	    elt = doc.createElement(tag); 
	}
	setupNodeChildren(elt, children, html, text); 
	if (className) {
	    Class.setClass(elt, className); 
	}
	bzj.extend(elt, attrs); 
	return insertNodeAt(elt, parent , before , after , pos); 
    }; 
    
    var setupNodeChildren = function (elt, children, html, text) {
	if (children) {
	    // this is going to be a list of nodes... we need to add them appropriately
	    // 
	    if (bzj.isArray(children)) {
		var child;
		while (child = children.shift()) {
		    elt.appendChild(child); 
		}
	    } else {
		elt.appendChild(children); 
	    }
	} else if (html) {
	    elt.innerHTML = html; 
	} else if (text) {
	    if (document.all) {
		elt.innerText = text; 
	    } else {
		elt.textContent = text; 
	    }
	}
    }

    var insertNodeAt = function (elt , parent , before , after , pos) {
	if (parent) {
	    // order of precedence. before > after > pos 
	    if (before) {
		parent.insertBefore(elt, before); 
	    } else if (after) {
		parent.insertBefore(elt, after.nextSibling); 
	    } else if (pos && pos > -1 && pos < parent.childNodes.length) { 
		parent.insertBefore(elt, parent.childNodes[pos]); 
	    } else { // append to the end... 
		parent.appendChild(elt); 
	    }
	} 
	return elt; 
    }
    
    var escapeHTML = function (html) {
	return html.replace(/&/, '&amp;')
	    .replace(/</g, '&lt;')
	    .replace(/>/g, '&gt;'); 
    }; 
    
    var nodeHTML = bzj.agent.browser === 'msie' ? 
	function (node, escape) {
	    escape = escape || false; 
	    return escape ? escapeHTML(node.outerHTML) : node.outerHTML; 
	} : function (node, escape) { // unclear to me whether this will *leak*... 
	    escape = escape || false; 
	    var elt = makeNode('div'); 
	    elt.appendChild(node.cloneNode(true)); 
	    return escape? escapeHTML(elt.innerHTML) : elt.innerHTML; 
	}; 
    
    // nodeList is not the same as htmlcollection
    // http://shengsuixiaxiang.spaces.live.com/blog/cns!BBFF1BBC1095290!422.entry
    // but since htmlcollection differ from nodelist only w.r.t. namedItem
    // they can be considered equivalent for our purposes (which is to splice them 
    // and convert them into array). 
    var isList = document.all ? 
	function (e) {
	    return (typeof e.length == 'number') && e.item; 
	} : function (e) {
	    return e instanceof NodeList || e instanceof HTMLCollection; 
	}; 
    
    /* innerText
     * 
     * the inner function for returning the text for an element. 
     * this function is *read only* 
     */
    var innerText = 
	/* 
	 * // document.body.innerText !== undefined 
	 * this fails for safari - 
	 * it means that the document.body is not ready... and that means we cannot wait for it
	 * during the instantiation time... hmmm 
	 */ 
	document.all 
	? function (elt) {
	    return elt.innerText; 
	} 
    : function (elt) {
	return elt.textContent; 
    }; 
    
    /*
     * nodeText 
     * abstracts over innerText to ensure that the discrepancies between all 
     * nodes are appropriately managed and returned... 
     * 
     * IE: 
     * 
     * innerText does not exist for elements that do not have inner texts 
     * (although that makes sense - that's a horrible way to ensure that people 
     * have to do more work than necessary - a simpler response is to return an empty string).
     * 
     * Mozilla: 
     * 
     */
    var nodeText = function (elt, visibleOnly) {
	visibleOnly = visibleOnly || false; 
	switch (elt.nodeType) {
	case TYPE.ATTRIBUTE:
	case TYPE.ENTITYREF:
	case TYPE.ENTITY:
	case TYPE.PI:
	case TYPE.COMMENT:
	case TYPE.NOTATION:
	case TYPE.DOCTYPE:
	    return '';
	case TYPE.TEXT:
	case TYPE.CDATA:
	    return innerText(elt); 
	case TYPE.ELEMENT:
	    // not all text has innerText property... some returns null??? hmm... 
	    return innerText(elt) || ''; 
	case TYPE.FRAGMENT: // does fragment alsy have innerText??? huh??? 
	    var out = ''; 
	    for (var i = 0; i < elt.childNodes.length; ++i) {
		out += nodeText(elt.childNodes[i]); 
	    }
	    return out; 
	case TYPE.DOCUMENT:
	    return nodeText(elt.body); 
	}
    }; 
    
    /*
     * figuring out the text length is just by computing the text and then get its length... 
     *
     */
    var textLength = function (elt) {
	var txt = nodeText(elt) || ''; 
	return txt.length; 
    }; 
    
    /*
     * nodeIndex - determine the index of the node as within its parent... 
     */
    var nodeIndex = function (elt) {
	for (var i = 0; i < elt.parentNode.childNodes.length; ++i) {
	    if (elt === elt.parentNode.childNodes[i]) 
		return i; 
	}
	return -1; // does not exist... 
    }; 
    
    /*
     * walkNodeParents - iterate through the node's parents and perform 
     * necessary computations 
     */
    var walkNodeParents = function (elt, callback, acc, stopper, isParent) {
	stopper = stopper || document.body; 
	isParent = isParent || true ; 
	do {
	    var breakNow = callback(elt, acc); 
	    if (breakNow === true ) {
		return acc; 
	    }
	} while ((isParent ? elt.parentNode !== stopper : elt !== stopper) 
		 && (elt = elt.parentNode));
	return acc; 
    }; 
    
    // this is useful only for historic reasons but we will keep it for reference... 
    var nodeCssPath = function (elt) { // only works with elt (not text node). 
	var path = [];
	return walkNodeParents(elt, function (elt, acc) {
	    acc.unshift(elt.nodeName.toLowerCase() + (elt.className ? '.' + elt.className  : ''));
	    return false; 
	}, path, document.body); 
    }; 
    
    /* 
     * a NodePath is an opaque string that uniquely identifies each node within a document.
     * 
     * its values are simple - a list of numerical values delimited by /. 
     * / => body 
     * /0 => the first child of body. 
     * /0/3/5/1 => 1st child of 6th child of 4th child of 1st child of body. 
     */
    
    /* 
     * node2Path converts from a node to a path. 
     */
    var node2Path = function (elt) { 
	// this issue comes up again!
	// it is possible that the ownerDocument is null... 
	// so the bug will not be distinguishable in this case... 
	// hmm... before we fix this let's as
	bzj.assert.run(function () {
	    return elt.ownerDocument; 
	}, 'elt has no owner document - ' + typeof elt + ' - ' + elt.nodeType); 
	if (elt === elt.ownerDocument.body) { // ownerDocument.body is not ready in chrome.
	    return '/'; 
	}
	var path = walkNodeParents(elt, function (elt, path) {
	    path.unshift(nodeIndex(elt)); 
	    return false; 
	}, [] , elt.ownerDocument.body, true);  
	return '/' + path.join('/'); 
    }; 
    
    /* 
     * path2Node converts from a path back to node.  
     */
    var path2Node = function (path, doc) {
	doc = doc || document; 
	path = path.split('/'); 
	var segment = path.shift(), elt = doc.body; 
	for (var i = 0; i < path.length; ++i) {
	    segment = parseInt(path[i]); 
	    if (elt.hasChildNodes() && elt.childNodes.length > segment) {
		elt = elt.childNodes[segment]; 
	    } else {
		return elt; 
	    }
	}
	return elt; 
    }; 
    
    /* 
     * style 
     * getting the style for a particular element... 
     * http://en.wikipedia.org/wiki/User_talk:Cacycle/wikEd_development
     * http://robertnyman.com/2006/04/24/get-the-rendered-style-of-an-element/
     */
    var css2JsName = function (name) {
	return name.replace(/-\w/g, function ($0) {
	    return $0.charAt(1).toUpperCase(); 
	}); 
    }
    
    var style = function (elt, rule, value) {
	rule = css2JsName(rule); 
	value = value || null; 
	if (elt.nodeType == bzj.node.TYPE.ELEMENT) {
	    if (value) {
		elt.style[rule] = value; 
	    } else {
		if (elt.currentStyle) {
		    var style = elt.currentStyle[rule];
		    if (style == 'inherit') {
			return EasyBookmark.style(elt.parent, rule);
		    } else {
			return style; 
		    }
		} else {
		    var view = elt.ownerDocument.defaultView;
		    if (view && view.getComputedStyle) {
			var style = view.getComputedStyle(elt, null); 
			return style.getPropertyValue(rule); 
		    } else {
			return elt.style[rule]; 
		    }
		}
	    }
	} else {
	    return ''; 
	}
    }
    
    /*
     * empty - remove all children of a node. 
     * not all node types have children of course.  for the ones that don't - it's a NOOP. 
     */
    var empty = function (elt) { 
	switch (elt.nodeType) {
	case TYPE.ATTRIBUTE:
	case TYPE.ENTITYREF:
	case TYPE.ENTITY:
	case TYPE.PI:
	case TYPE.COMMENT:
	case TYPE.NOTATION:
	case TYPE.DOCTYPE:
	case TYPE.TEXT:
	case TYPE.CDATA:
	    break; 
	case TYPE.ELEMENT:
	    elt.innerHTML =  ''; 
	    break; 
	case TYPE.FRAGMENT: // does fragment alsy have innerText??? huh??? 
	    while (elt.firstChild) {
		elt.removeChild(elt.firstChild); 
	    }
	    break; 
	case TYPE.DOCUMENT:
	    elt.body.innerHTML = ''; // 
	    break; 
	}
    }; 
    
    /* 
     * move - move the children from the source to the destination node. 
     * 
     * move is destructive - i.e. after the move the source will not have any more children
     * left... 
     */
    var move = function (source, dest, overwrite) {
	if (overwrite || false) 
	    empty(dest); 
	while (source.firstChild) {
	    dest.appendChild(source.firstChild); 
	}
    }; 
    
    /*
     * copy - copy the children from the source to the destination node. 
     * 
     * copy keeps the children of the source. 
     */
    var copy = function (source, dest, overwrite) {
	if (overwrite || false) 
	    empty(dest); 
	for (var i = 0; i < source.childNodes.length; ++i) {
	    dest.appendChild(source.childNodes[i].cloneNode(true)); 
	}
    }; 
    
    
    /* 
     * NODE is the exported object. 
     */
    var NODE = {
	TYPE : TYPE
	, make : makeNode 
	, isa : isNode 
	, isList : isList 
	, escapeHTML : escapeHTML 
	, html : nodeHTML 
	, text : nodeText 
	, textLength : textLength
	, innerText : innerText 
	, toPath : node2Path 
	, fromPath : path2Node 
	, style : style 
	, walkParents : walkNodeParents
	, empty : empty 
	, move : move 
	, copy : copy 
	, Class : Class 
    }; 
    
    bzj.extend(bzj, { node : NODE }); 
})(); 

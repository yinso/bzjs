/*
 * a cross browser simplified selection API 
 * 
 * 
 */

// Selection.getSelection(); // this will depend on the current document/window... 
// obviously this has to do with the fact that there can be frames... 
// 
// we also need to define a particular range... 
//  
// because a selection is a set of multiple ranges... 

// a bookmark is a conversion of a range into a viewable path of a DOM... 

// can we do that with a regular range selection??? 

// to get the selection we need to have the current window or document... or element... 

// IE range might be simpler than I imagined...???
// 1 - get the parent Node... select it. 
// 2 - move the selection character by character until they match... 
// 3 - that should provide the offset... 
// 4 - the question is - can we do so for both the start & end separately? 

// a bookmark converts a unique path identifying a particular node. 

/* 
   the only way for certain to identify a particular node in *text format* is as follows: 
   
   we will count the NTH child node (without regard to the type of the node), until the text node. 
   @ the text node - we will count offset @ the text count... 
   
   /2/3/1/1/3:5 
   => the 2nd node of document -> 3rd child elt -> 1st child -> 1st child -> 3rd child -> 5 text offset
   => the last one is guaranteed to be a text node, while the ones prior are guanrateed not to be
   => text node. 
   
   => always start from body (the root node). 
   
   => NOTE that if the document structure changes than the bookmark is no longer good. 
   => and for now we will not trying to make it good. 
   
   # of children @ body... 
 */

var EasyBookmark = bzj.Class( {
    setup : function (range) {
	var start = range.start(); 
	var end = range.end(); 
	this.start = { node : bzj.node.toPath(start.node) 
		       , offset : start.offset }; 
	this.end = { node : bzj.node.toPath(end.node)
		     , offset : end.offset };
	return this; 
    }
    
} , { 
    
} , { 
    
    insideBold : function (elt) {
	var bold = false; 
	bzj.node.walkParents(elt
			     , function (elt, acc) {
				 var name = elt.nodeName.toLowerCase();
				 if (name == 'b' || name == 'strong'
				     || bzj.node.style(elt, 'font-weight') == 'bold') {
				     bold = true; 
				 } 
			     }
			     , false , false); 
	return bold; 
    }
    
    , insideItalic : function (elt) {
	var italic = false; 
	bzj.node.walkParents(elt , function (elt) {
	    var name = elt.nodeName.toLowerCase(); 
	    if (name == 'i' || name == 'em'
		|| bzj.node.style(elt, 'font-style') == 'italic') {
		italic = true; 
		return true; 
	    }
	}, false , false); 
	return italic; 
    }
}); 

// abstraction over a regular DOMRange, which is quite hard to use... 
// DOMRange spec: 
// http://www.w3.org/TR/DOM-Level-2-Traversal-Range/ranges.html
var EasyRange = bzj.Class( {
    setup : function (r) {
	this.inner = r; 
	this.collapsed = this.inner.collapsed; 
    }
    
    , start : function () { // abstract over the difference between selection & range. 
	return { node : this.inner.startContainer
		 , offset : this.inner.startOffset }; 
    }
    
    , end : function () {
	return { node : this.inner.endContainer
		 , offset : this.inner.endOffset }; 
    }
    
    , collapse : function (toStart) {
	this.inner.collapse(toStart); 
    }
    
    , clone : function () {
	return new EasyRange(this.inner); 
    }
    
    , html : function (v) { // for now this v is not a fragment... hmm... we want to make it a 
	if (v) {
	    // fragment... 
	    if (!this.inner.collapsed) {
		this.inner.deleteContents(); // this does not collapse opera... a bug... 
	    }
	    if (typeof v == 'string') 
		v = bzj.node.make(v
				  , { document : this.inner.commonAncestorContainer.ownerDocument }); 
	    this.inner.insertNode(v); 
	    this.inner.selectNode(v);
	    this.collapsed = this.inner.collapsed; 
	} else {
	    return bzj.node.html(this.inner.cloneContents()); 
	}
    }
    
    , set : function (start, end) {
	this.inner.setStart(start.node, start.offset); 
	this.inner.setEnd(end.node, end.offset); 
    }
    
    , wrap : function (node, attrs) {
	var elt = bzj.node.make(node, attrs); 
	this.inner.surroundContents(elt); 
    }
    
    , toString : function () {
	return this.inner.toString(); 
    }
    
    , bookmark : function () {
	return new EasyBookmark(this); 
    }
    
} , { 
    
} , { 
    clone : function (r) {
	if (r instanceof EasyRange) 
	    return r.clone(); 
	else 
	    return new EasyRange(r); 
    }
    
    , fromBookmark : function (bookmark, doc) {
	doc = doc || document; 
	var r = new EasyRange(doc.createRange()); 
	r.set({ node : bzj.node.fromPath(bookmark.start.node, doc)
		, offset : bookmark.start.offset }
	      , { node : bzj.node.fromPath(bookmark.end.node, doc)
		  , offset : bookmark.end.offset }); 
	return r; 
    }
}); 

// abstraction over DOMSelection 
// spec: 
// http://dev.w3.org/html5/spec/Overview.html#selection
var EasySelection = bzj.Class( {
    setup : function (w) {
	this.window = w || window; 
	this.inner = this.window.getSelection(); 
	this.collapsed = this.inner.isCollapsed; 
	this.count = this.inner.rangeCount; 
    }
    
    , start : function () {
	return { node : this.inner.anchorNode
		 , offset : this.inner.anchorOffset }; 
    }
    
    , end : function () {
	return { node : this.inner.focusNode 
		 , offset : this.inner.focusOffset }; 
    }
    
    , collapse : function (start) {
	if (start === true)
	    this.inner.collapseToStart(); 
	if (start === false) 
	    this.inner.collapseToEnd(); 
    }
    
    , toString : function () {
	return this.inner.toString(); 
    }
    
    // for now we only deal with a single range object. 
    , range : function () { // a single range selection module... in the future we might do multiple... 
	return new EasyRange(this.inner.rangeCount == 0 ? 
			     this.__createRange() 
			     : this.inner.getRangeAt(0)); 
    }
    
    // should this *select* the value???  or should it collapse? 
    // a bold is equivalent of highlighting the bold, but collapse to the *end* but 
    // not leaving the bold region. 
    // an unbold will be to move outside of the bold region... 
    , html : function (v, collapse) { 
	return this.range().html(v, collapse); 
    }
    
    // this is an inner function that should not be used directly... 
    , __createRange : function () { // this is where Mozilla holds the createRange function... 
	return this.window.document.createRange(); 
    }
    
    , setRange : function (r, collapse) {
	if (collapse) {
	    r.collapse(false); 
	}
	this.inner.removeAllRanges(); 
	this.inner.addRange(r.inner); 
	this.count = 1; 
    }
    
    , setFromBookmark : function (bookmark) {
	this.setRange(EasyRange.fromBookmark(bookmark, this.window.document)); 
    }
    
} , { 
    
} , { 
    selection : function (w) {
	return new EasySelection(w); 
    }
}); 

/* IE Bookmark 
 * 
 * we need a way to calculate the nodes... let's define those algorithms... 
 * 
 * the way to know for certain whether we have the nodes correct is to run through 
 * the path algorithm to retrieve the start... 
 * 
 * 
 */

var IEBookmark = bzj.Class( {
    setup : function (inner) {
	this.inner = inner; 
	return this; 
    }
} , { 
} , { 
});     
    


var IERange = bzj.Class( {
    setup : function (r) {
	this.inner = r; 
	// this.collapsed = // fill in... 
    }
    
    // if range is collapsed this fails... 
    // what do I do in this case??? I think it's because inner is NULL...
    , html : function (v, collapseToStart) {
	bzj.debug.log('ierange.html start'); 
	/* 
	 * issue: 
	 * 
	 * throw unspecified error when it's just a cursor on an empty page 
	 * 
	 * when pasting a highlighted page - it pasted over the whole children text. 
	 *
	 * possibility - this is possible that things do not work because it is not 
	 * a contenteditable... that is certainly possible... 
	 
	 * in content Editable - pasteHTML works with a cursor but not with a highlight... 
	 * is there a way to determine whether a range is a cursor or not??? 
	 */
	/***
	 * pasteHTML bug... 
	 * 
	 */ 
	if (v) { // this does not work well for a collapsed range... hmm... strange... 
	    // if it's highlighted it replaces the whole thing (this could be due to my 
	    // inability to control it currently). 
	    // this.inner.collapse(true); // doesn't really help... 
	    //this.inner.collapse(true); 
	    // it failed because the parentElement now appears to be the submit button... 
	    // hmm... interesting... what does this mean?  
	    // 
	    if (!this.inner.parentElement().canHaveHTML) { // canHaveHTML is IE-specific extension... 
		bzj.debug.log('the parent element cannot contain html: ', this.inner.parentElement().nodeName); 
	    } else {
		if (typeof v !== 'string') {
		    v = bzj.node.html(v); 
		}
		this.inner.pasteHTML(v); // unclear why this throw error when we have a cursor... 
	    }
	    // is it because we do not have a cursor??? 
	    // this worked before... could it be because that I am testing with Mac IE7??? 
	    // I hope that is not the case!!! 
	    // if it is we will have quite a bit of issue since it is undetectable... 
	    // in either case - this method does not work so either I get around it
	    // completely (which I don't see how)... 
	    
	    // the reason errors are thrown is because the parentElement() becomes the INPUT 
	    // element, which is the submit button... that means IE treats the last clicking
	    // as the selection... which is probably the right thing to do but certainly hard 
	    // to figure out... in such cases we should obvioulsy never pasteHTML into it...
	    // 

	} else {
	    return this.inner.htmlText; 
	}
    }
    
    , collapse : function (toStart) {
	this.inner.collapse(toStart); 
    }
    
    /*
     * determining whether a text range is collapsed.
     * comparing the boundingTop to offsetTop 
     * and boundingLeft to offsetLeft 
     * if they equal each other we have a collapsed cursor. 
     * (NOTE this only works in content editable) 
     * actually boundWidth is a better measurement of whether we have a cursor... 
     */
    , collapsed : function () {
	return this.inner.boundingTop == this.inner.offsetTop 
	    && this.inner.boundingLeft == this.inner.offsetLeft; 
    }
    
    /* for now IE specific... 
     * we are not going to try to produce dimensions for others
     */
    , dimension : function () {
	return { bound : { top : this.inner.boundingTop 
			   , left : this.inner.boundingLeft 
			   , height : this.inner.boundingHeight 
			   , width : this.inner.boundingWidth } 
		 , offset : { top : this.inner.offsetTop 
			      , left : this.inner.offsetLeft } 
		 , parent : this.inner.parentElement().nodeName }; 
    }
    
    // time to figure out what some of the other things need to be ported... 
    , bookmark : function () {
	return new IEBookmark (this.inner.getBookmark()); 
    }
        /* TextRange <-> DOMRange 
     * 
     * inspired from ierange-m2.js - http://code.google.com/p/ierange/downloads/detail?name=ierange-m2.js&can=2&q=
     * 
     * how to convert from Text Range to a DOM Range? 
     * we have the following information available from a text range:
     * 1 - bound - the rectangular box of the selection
     * 2 - offset - the top & left of the offset from the parent element. 
     * 3 - parent Element - the common parent element for the entire range. 
     *
     * we also have the following: 
     * 
     * compareEndPoints - this compares the endpoints of 2 different text ranges. 
     *   StartToEnd - compare the start with end
     *   StartToStart - compare the start with start 
     *   EndToStart - reverse of StartToEnd
     *   EndToEnd - compare end with end 
     * 
     * moveToElementText - move a range to a element to cover all of its text. 
     * 
     * moveStart & moveEnd - move the start or end point of a text range by 
     *   character, word, sentence, textedit. 
     * 
     * move - this collapses the range and move it with the above method... with an optional of count. 
     * 
     * with the above it became possible for us to manually generate the offset @ either 
     * the start position by the following method: 
     *
     * 1 - duplicate the range and get the parent element of the range. 
     * 2 - go through the child nodes of the parent: 
     *     move the duplicated range to the node. 
     *     compare StartToStart (duplicated.compareEndPoints(StartToStart, original);)
     *     if it's 0 we are done (this is the node with offset = 0). 
     *     if it's -1, keep going until we hit 0 or 1
     *     if it's 1 - then we went past the offset. 
     *        if the previous node is a text node, then we just need to calculate offset 
     *        by refining it via character, word, or setence (repeat the previous approach).
     *        if the previous node is an element - repeat step 2. 
     * 
     * Change the necessary values for above and we can also generate the end position. 
     * 
     * 
     * Going from Node/offsets to textRange... 
     * 
     * it is not clear that we actually need this particular transformation, since 
     * the reason we are interested in the node/offset is because we want to be able to 
     * map a path and determine whether or not we are inside a particular node, not 
     * because we are going to be using this for much manipulation, but we will conduct 
     * this exercise to see how it would work... 
     * 
     * the basic idea is that we will have 2 ranges, one of which is of course the final 
     * range for selection. 
     * 
     * we are going to need one additional function: 
     * 
     * setEndPoint - set the end point based on another range. 
     * 
     * the idea is then to set the temp range based on the node/offset for either start or end, 
     * and then set the final range's endPoint based on the temp range. so we just need an 
     * algorithm to set the temp range based on node/offset. 
     * 
     * 
     * we might need the parent node (not certain if we can do this with a text node - 
     * if we can do it with text node it's a bit simpler).
     * 
     * 1 - moveToElementText(node or parentNode). **confirmed that moveToElementText cannot select a text node**... 
     * 2 - move(character, offset).
     * 3 - final.setEndPoint(StartToStart, temp); 
     * the above should do it for one of the end points.  change the needed params for the 
     * other end point. 
     * 
     * the simplest way to do the calculation is to create another range, and 
     */
    , start : function () {
	var temp = this.inner.duplicate(); 
	var p = this.inner.parentElement(); 
	// var temp = p.ownerDocument.body.createTextRange(); 
	return IERange.toNodeOffset(this.inner, temp, p, IERange.START_TO_START); 
    }
    
    , end : function () {
	var p = this.inner.parentElement(); 
	var temp = p.ownerDocument.body.createTextRange(); 
	return IERange.toNodeOffset(this.inner, temp, p, IERange.END_TO_END); 
    }
    
    , set : function (start, end) {
	var temp = this.inner.duplicate(); 
	IERange.fromNodeOffset(this.inner, temp, start.node, start.offset, IERange.START_TO_START); 
	IERange.fromNodeOffset(this.inner, temp, end.node, end.offset, IERange.END_TO_END); 
    }
    
    , wrap : function (node , attrs) {
	/* the function to use is of course the html function. 
	 * 
	 * 1 - create the node along with attrs... 
	 */
	var elt = bzj.node.make(node, attrs); 
	elt.innerHTML = this.inner.htmlText; 
	this.inner.pasteHTML(bzj.node.html(elt)); 
    }
    
    , toString : function () {
	return this.inner.toString(); 
    }
} , { 
    
} , { 
    START_TO_START : 'StartToStart'
    , END_TO_END : 'EndToEnd' 
    , START_TO_END : 'StartToEnd'
    , END_TO_START : 'EndToStart' 
    // as far as I am aware of the following code should work in all situations that 
    // does not involve a ControlRange (i.e. no controls embedded).
    /* base case - only 1 child text:
     *   - move point character by character until matching 
     * only 1 child element:
     *   - recurse with the child element 
     * last child is a text or element
     *   - ensure we do not add offset to it, also not increment i
     *   - this degenerates into the base case for either text or element. 
     * iterate through the child (except the last child case above)
     * if the child is a text - add to offset and continue 
     * if the child is an element:
     *    move the temp range to the element and compare end points 
     *    if less - continue 
     *    if equal - recurse with the child 
     *    if greater - we want the previous child.  
     *                 remove the previous child's offset and i.  
     *                 this then degenerate into the base case. 
     * changing StartToStart to EndToEnd should give us the end node & offset. 
     */
   
    , toNodeOffset : function (source, temp, elt, compType) {
	// we will assume that this is an ELEMENT for now... 
	temp.moveToElementText(elt); 
	var offset = 0, i = 0; 
	bzj.debug.log('toNodeOffset: elt: ', elt.nodeName); 
	
	// if it's just one element - we need to process it specially to account for the 
	// offset rules that we are employing... 
	// so the loop below only works in cases where we have multiple childrens. 
	if (elt.childNodes.length > 1) { 
	    for (i = 0; i < elt.childNodes.length; ++i) {
		if (elt.childNodes[i].nodeType === bzj.node.TYPE.ELEMENT) {
		    // if the child is an element - we will move the temp range 
		    // to it 
		    temp.moveToElementText(elt.childNodes[i]); 
		    var comp = temp.compareEndPoints(compType, source); 
		    if (comp === 0) {
			bzj.debug.log('toNodeOffset: case 0: ', offset, ' i = ' , i); 
			return IERange.toNodeOffset(source, temp, elt.childNodes[i], compType); 
		    } else if (comp === 1) {
			bzj.debug.log('toNodeOffset: case 1: ', offset, ' i = ' , i); 
			i -= 1; // at this point on i = previous... 
			offset -= bzj.node.textLength(elt.childNodes[i]); 
			break; // this break does not correctly... 
		    } else { // === -1 
			// it is also potential to jump off the bridge here
			// the situation seems to be when the last child is an element
			// but the text sits within the last child.
			// so the 
			if (i < elt.childNodes.length - 1) {
			    bzj.debug.log('toNodeOffset: case -1: ', offset, ' i = ' , i); 
			    offset += bzj.node.textLength(elt.childNodes[i]); 
			    continue; 
			} else {
			    bzj.debug.log('toNodeOffset: case -1: last element!'); 
			    break; 
			}
		    }
		} else {
		    // if the last element is a text - we should not add on top of it
		    // we still jumped off bridge if we are highlighting across paragraphs... 
		    // what if I just highlight within a single paragraph? 
		    if (i < elt.childNodes.length - 1) {
			bzj.debug.log('toNodeOffset: #text: ', offset, ' i = ' , i); 
			offset += bzj.node.textLength(elt.childNodes[i]); 
			continue; 
		    } else {
			bzj.debug.log('toNodeOffset: #text - last node!'); 
			break; 
		    }
		}
	    }
	} 
	
	bzj.debug.log('toNodeOffset: base, offset = ', offset, ' i = ' , i); // this i should be 1!! 
	var child = elt.childNodes[i]; 
	if (child.nodeType === bzj.node.TYPE.ELEMENT) {
	    return IERange.toNodeOffset(source, temp, child, compType); 
	} else {
	    // we get here if we are 1 and i - 1 is a text node... 
	    temp.moveToElementText(elt); 
	    temp.moveStart('character', offset); 
	    offset = 0; 
	    // the end points right now are having issues... 
	    // what we want to do is to ensure that the issues do not exist... 
	    while (temp.compareEndPoints(compType, source) !== 0
		   && offset < child.length) {
		bzj.debug.log('toNodeOffset: j : ', offset, ' i = ' , i); 
		temp.moveStart('character'); 
		offset++; // why would offset++ become negative??? 
	    }
	    // this is the only base case - is there a way for us to *free* the duplicate
	    // range??? I don't like the fact that is is causing IE to seem to have 
	    // two cursors... 
	    return { node : child , offset : offset }; 
	}
    }
    
    /* to convert from node/offset to a text range - we need the following. 
     * the destination range (IE's range) - this is the one whose offset we want to adjust 
     * the temp range (IE's range) - this is the working range that will help us adjust the destination 
     * node - the starting point it must be a text node... 
     * offset - the number must stay in text node (I currently do not know what happens when 
     *          the offset is outside of the text node...)
     * compType - we will be dealing with one end at once, i.e. StartToStart, EndToEnd, etc. 
     * 
     * the algorithm is as follows:
     * 
     * take the node - it must be a text node, and get its parents. 
     * walk through the parent's child nodes until we found the node again - add up their text lengths.
     * move temp to parent 
     * move the start (or end) of temp by the previous sibling's text length + the offset 
     * set the end point (start or end) of dest by the end point of temp. 
     * 
     * the reason we are using a temp instead of operating on dest directly is because that we 
     * need to move to parent first, and we wanted to ensure that we preserve the other end point
     * of dest while we are doing this, so moving the dest to parent first won't work. 
     */
    
    , fromNodeOffset : function ( dest , temp , node , offset , compType ) {
	var parent = node.parentNode || document.body;  // there should be no reason that we cannot do this... 
	for (var i = 0; i < parent.childNodes.length; ++i) {
	    if (parent.childNodes[i] === node) {
		break; 
	    } else {
		offset += bzj.node.textLength(parent.childNodes[i]); 
	    }
	}
	temp.moveToElementText(parent); 
	temp.collapse(compType === IERange.START_TO_START); // although move will collapse the range, we want to ensure we collapse to start. 
	temp.move('character', offset); 
	dest.setEndPoint(compType, temp); // copy the endpoint over. 
    }
    
    
}); 

var IESelection = bzj.Class( {
    setup : function (w) {
	this.window = w || window; 
	this.inner = this.window.document.selection; 
	// this.collapsed = // fill in 
	// this.count = // fill in (potentially just 1) 
    }
    
    , range : function () {
	// this.inner.createRange... does this automatically equate with inner? 
	// it seems like it's save... 
	// could this be a bug with Mac??? I don't really think so... but can't rule things 
	// out until figured out what's going on... 
	// so 
	return new IERange (this.inner.createRange()); 
    }
    
    , html : function (v, collapse) {
	return this.range().html(v, collapse); 
    }
    
    , setFromBookmark : function (bookmark) {
	// why are we not able to restore the cursor in IE??? what is up with that? 
	// do the bookmark only work on the original document??? I did not capture the 
	// fact that this does not work...
	this.inner.empty(); 
	var range = this.inner.createRange(); 
	range.moveToBookmark(bookmark.inner); 
	range.select(); 
    }
    
    , start : function () {
	return this.range().start(); 
    }
    
    , end : function () {
	return this.range.end(); 
    }
    
    , collapse : function (start) {
	var range = this.range(); 
	range.collapse(start); 
	range.select(); 
    }
    
    , toString : function () {
	return this.inner.toString(); 
    }
} , { 
    
} , {
    selection : function (w) {
	return new IESelection(w); 
    }
}); 


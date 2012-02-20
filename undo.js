/*
 * bzj.UndoManager
 *
 * an undo manager for the richtext editor.  
 * 
 * it holds the histories of the undo in snapshots (in the future we might build a delta or 
 * keystroke based undo manager... that could be quite challenging and not sure if worth it) 
 * 
 * but even if we store things in delta, we will still capture the bookmark in the same 
 * form.  The bookmark design is not likely to change. 
 * 
 * can the snapshot & undo be decoupled from manager? 
 * my hope is that they can be... 
 * what do we really need to capture? 
 * we need to capture a bookmark and a body (a node). 
 * when we restore we need to restore to a document (or an element). 
 */

// @import('timer'); // this one will depend on timer.js... // huh this does not work?? 

/* 
 * a snapshot captures the following
 * a list of nodes 
 * and a particular range (that pinpoints the cursor). 
 * 
 */

var Snapshot = bzj.Class({ // prototype members. 
    
    setup : function (editor) {
	// should we use document fragment here? 
	this.take(editor); 
	this.bookmark = editor.selection().range().bookmark(); // this appears not working... we need to 
	return this; 
    }
    
    /* take - take a snapshot of the body... 
     */
    , take : function (editor) {
	this.body = editor.doc.body.cloneNode(true); 
    } 
    
    , innerRestore : bzj.agent.browser == 'msie' 
	? function (editor) { // msie 
	    bzj.node.copy(this.body, editor.doc.body, true); 
	} : function (editor) { // other 
	    editor.doc.body = this.body.cloneNode(true); 
	}
    
    , restore : function (editor) {
	this.innerRestore(editor); 
	editor.selection().setFromBookmark(this.bookmark); 
	editor.focus(); // this belongs to the editor's event... we will get there... 
    }
    
} , { // instance members. 
    
} , { // static members. 
    
});

var Chain = bzj.Class({
        
    current : function () {
	if (this.index === null) 
	    return null; 
	return this.inner[this.index]; 
    }
    
    , previous : function () {
	if (this.index === null || this.index < 0) 
	    return null; 
	return this.inner[this.index - 1]; 
    }
    
    , next : function () {
	if (this.index === null || this.index > this.inner.length - 1) 
	    return null; 
	return this.inner[this.index + 1]; 
	
    }
    
    , backward : function () {
	if (this.index !== null && this.index > 0) {
	    this.index--; 
	}
    }
    
    , forward : function () {
	if (this.index !== null && this.index < this.inner.length - 1) {
	    this.index++; 
	}
    }
    
    , set : function (v, isNewTop) { 
	// what gets set becomes the current... 
	if (this.index === null) 
	    this.index = 0; 
	else 
	    this.index++; 
	this.inner[this.index] = v; 
	if (isNewTop) { // we will remove all of the next's so this is the new top. 
	    while (this.inner.length > this.index + 1) {
		this.inner.pop(); 
	    }
	}
	bzj.debug.log('undo chain: ', this.inner.length); 
    }
    
    , length : function () {
	return this.inner.length; 
    }
    
} , {
    inner : [] 
    , index : null 
} , {
    
}); 

// time to think about custom events... 
// how do we handle custom events? 
// basically a custom event is its own callback mechanism... 
// if we want to get the *modified* to work we will have to deal with this... 
// what is more important to deal with??? not sure right now... 

// perhaps to ensure that the page 

// even highlights are *modified*... i.e. pretty much all commands will cause 
// modifications... only a few won't... 
var Modified = function (evt) { // this almost is a modified event... hmm... are 
    // we ready to handle custom event? 
    // if any of these modifiers are pressed we are not *typing*... and we delegate 
    // the modified event to the command object... 
    // hmm... this is going to be quite cool... let's see how we are going to fire a custom 
    // event... 
    // the key is in understanding Dean Edward's meaning of event & callbacks. 
    if (evt.ctrlKey || evt.metaKey || evt.altKey) 
	return false; 
    var code = evt.charCode || evt.which || evt.keyCode; 
    if (code == bzj.KEYS.SHIFT 
	|| code == bzj.KEYS.CTRL 
	|| code == bzj.KEYS.ALT 
	|| code == bzj.KEYS.CAPSLOCK 
	|| code == bzj.KEYS.PAGEUP 
	|| code == bzj.KEYS.PAGEDOWN 
	|| code == bzj.KEYS.END 
	|| code == bzj.KEYS.HOME 
	|| code == bzj.KEYS.LEFT 
	|| code == bzj.KEYS.UP 
	|| code == bzj.KEYS.DOWN 
	|| code == bzj.KEYS.RIGHT
	|| code == bzj.KEYS.INSERT 
	|| code == bzj.KEYS.F1
	|| code == bzj.KEYS.F2
	|| code == bzj.KEYS.F3
	|| code == bzj.KEYS.F4
	|| code == bzj.KEYS.F5
	|| code == bzj.KEYS.F6
	|| code == bzj.KEYS.F7
	|| code == bzj.KEYS.F8
	|| code == bzj.KEYS.F9
	|| code == bzj.KEYS.F10
	|| code == bzj.KEYS.F11
	|| code == bzj.KEYS.F12) 
	return false; 
    return true; 
}

var UndoManager = bzj.Class({
    setup : function (editor) {
	this.editor = editor; 
	this.history = new Chain(); 
	this.capture(); // and we want to setup a timer for keeping on capturing... 
	var self = this; 
	// a better design then timer is to capture *JUST-IN-TIME*. 
	// capture the very first time (the start of program).
	// do not capture until there are *modifications*... 
	// once there are modifications - it register for capturing 3 seconds later
	// every keystroke pushes back the capturing... 
	// every command causes an immediate capturing... 
	// how do I know whether or not an editor's content is modified? 
	// the above are *event* based system of undo capturing... 
	// 
	// 1 - how do I know whether or not the content in editor is *modified*? 
	// it has to do with keystroke... or it has to do with the buffer. 
	// 
	// if we want to know whether or not a particular character will cause 
	// modifications we need to test for whether or not it is a control character... 
	// this means we need to have knowledge on what is a control character and what is not... 
	// this is certainly doable but sure makes things more complicated and error prone... 
	// not every keystroke should cause any sort of data modification... 
	// so that 
	/*
	self.timer = bzj.timer(function (timer) {
	    self.capture(); 
	}, 8000 , true); 
	*/
	// we will do that when we figure out how to determine whether the editor has 
	// been modified... 
	// the answer seem to be *simple*... 
	// compare the innerHTML... but that could be somewhat expensive when it gets to 
	// larger documents... hmm... okay we will make this one work for now... 
	return this; 
    }
    
    , capture : function () {
	this.history.set(new Snapshot(this.editor), true); 
    }
    
    , undo : function () { // we do not want to hang around the start & the end twice... 
	var snapshot = this.history.previous(); 
	if (snapshot) {
	    snapshot.restore(this.editor);
	    this.history.backward(); 
	}
    }
    
    , redo : function () {
	var snapshot = this.history.next(); 
	if (snapshot) {
	    snapshot.restore(this.editor);
	    this.history.forward(); 
	}
    }
    
    , modified : function () {
	return this.editor.doc.body.innerHTML == this.history.current().body.innerHTML; 
    }
} , { 
    
}); 

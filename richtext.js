/*
  richtext - the container 
  selection - the cross browser selection API. 
  range - the cross browser range API (it needs to be a merge between DOM & IE ranges).
  bookmark  - this is where IE has over DOM range 
  undo - snapshot will basically take a list of results as well as the bookmark (for restoring
         the cursor position!!!  this is the most important feature of bookmark) 
  
  okay - time to think about how to make the range work again!! 
  
  range.html(text); 
  range.html(); // return the text. 
  range.bookmark() // get/set bookmark for the range... i.e. it can change the range value... 
  // hmmm... is that the right thing to do??? 
  range.select(); 
  
  // what should the bookmark contain? 
  // it should contain a particular hierarchy of the nodes so it can be walked. 
  // of course that a particular bookmark is only good for a particular DOM... 
  // for other DOM it might just be considered invalid... 
  
  // a bookmark can be converted to a range (might be invalid)
  // a range can be converted back to a bookmark.
  
  // a range is a part of selection (if we are going with the fact that there can be multiple selections) 
  
  // IE only has a single range for a selection (until IE8) of course... 
  // what does that mean? 
  // that means we would effectively be able to manage a single range... 
  
  range.collapse();

  a DOM range is defined by 4 things - anchor node/offset (start), focus node/offset (end).
  a text range??? 
  
  // new range({ node : node , offset : offset }, { node : node , offset : offset }); 
  // we also ought to be able to convert that whole thing into a path... 
  
  // basically we want a way to specify the existing
  
  
 */

// I need the following to make up a basic richtext object.
// richtext - the container object. 
// selection - the generic selection API 
// range - the generic range API 
// bookmark - this is part of the range API... having a bookmark makes undo much easier
// undoManager - this can use timer... we can also use timer w.r.t. save... 
// hmm... all these are pretty cool stuff... 
// it's quite complicated... 
//
// to truly test everything we should start to move this onto a server so they can be 
// tested or I need to find a copy of IE for macs
// okay - anyhow... time to think about the correct API... 

/*
 * custom events for richtext editor.
 * 
 * basically there are a bunch of events. 
 * each command will trigger an event. 
 * the keypress will also trigger event. 
 * undo/redo are all events. 
 * 
 * one thing to do with these events is that they all are binding against 
 * 
 * editor
 * -> eventMgr
 * textInput event... does delete key trigger text input event?
 * 
 * extensibility - it's time to perhaps tackle it really quickly. 
 * 
 * 1 - I want to load another page as the template... 
 */	

(function () {
    
    var Richtext = bzj.Class({
	
	$base : Widget 
	
	, $mixin : [ Command ] 
	
	, OPTIONS : { REQUIRE_TEMPLATE : true
		      , url : '/dialog/richtext-template' // this is the default template... changeable! 
		    } 
	
	, setupAdditionalWidget : function () {
	    bzj.debug.log('Richtext.setupAdditionalWidget'); 
	    this.editor = this.element ; 
	    this.view = bzj.$('iframe', this.editor)[0]; 
	    this.originalElement.style.display = 'none'; 
	    var me = this; 
	    bzj.$(this.view).load(function () {
		me.initializeOnceReady(); 
	    });
	}
	
	, initializeOnceReady : function () {
	    var me = this; 
	    this.editorWindow = this.view.contentWindow; 
	    this.doc = this.editorWindow.document; 
	    this.defaultDoc(this.originalElement.value); 
	    me.focus(); 
	    me.undo = new UndoManager(me); 
	    if (bzj.agent.browser == 'gecko') { // turn off the styleWithCSS method in mozilla. 
		me.doc.execCommand('styleWithCSS', false , false); 
	    } 
	    me.setupCommands (bzj.merge(Richtext.COMMANDS, this.options.commands || {})); 
	    me.setupButtons(this.editor); 
	    me.setupHotkeys({ 'ctrl-b' : 'bold' 
			      , 'ctrl-i' : 'italic'
			      , 'ctrl-u' : 'underline' 
			      , 'ctrl-s' : 'capture' 
			      , 'ctrl-z' : 'undo'
			      , 'ctrl-y' : 'redo' 
			    } , this.doc); 
	}
	
	, postCommand : function () {
	    this.focus() ; 
	}
	
	, defaultDoc : function(text) {
	    this.value(text || ''); 
	    this.doc.designMode = 'on'; 
	    // IE6 (apparently 6.0.28 - the version with xp sp2) does not like the line below...
	    // it throws "permission denied" - apparently believing the frame's document isn't the same 
	    // domain as the parent document... 
	    // http://forums.webwiz.co.uk/rte-v3-ie-access-permission-denied-bug_topic13513.html
	    // this problem is fixed when we set frame's src and then modify the document there. 
	    this.doc.contentEditable = true; 
	}
	
	, selection : function () {
	    this.focus(); 
	    return bzj.agent.browser == 'msie' 
		? IESelection.selection(this.editorWindow)
		: EasySelection.selection(this.editorWindow); 
	}
	
	, html : function (v, collapse) { // replace the existing 
	    if (v) {
		this.selection().html(v, collapse); // what should be passed in as html??? 
	    }
	    this.focus(); 
	    return v; 
	}
	
	, focus : function () {
	    this.editorWindow.focus(); 
	}
	
	, value : function (v) {
	    if (v) {
		this.doc.body.innerHTML = v; 
	    } 
	    return this.doc.body.innerHTML; 
	}
	
	, text : function () {
	    var t; 
	    if (document.all) {
		t = this.doc.body.innerText; 
	    } else {
		t = this.doc.body.textContent; 
	    }
	    return t; 
	}
	
    } , { 
	// instance members 
	// how do we trigger 
	commands : { 
	} 
    } , { 
	// static members 
	COMMANDS : { 
	    /*
	     * built-in commands that are not supported by all major browsers: 
	     * 
	     * html (insert html) 
	     * link (insert link)
	     * image (insert image) 
	     * heading (insert/convert heading)... 
	     * horizontal rule (insert horizontal rule). 
	     * 
	     * styleWithCSS - mozilla-only command that should be applied once @ start. 
	     * (turn it off). 
	     * 
	     */
	    bold : function () {
		this.doc.execCommand('bold', false, null); 
	    } 
	    
	    , italic : function () {
		this.doc.execCommand('italic', false, null); 
	    }
	    
	    , underline : function () {
		this.doc.execCommand('underline', false, null); 
	    }
	    
	    , strike : function () {
		this.doc.execCommand('strikethrough', false, null); 
	    }
	    
	    , undo : function () {
		this.undo.undo(); 
	    }
	    
	    , redo : function () {
		this.undo.redo(); 
	    }
	    
	    , capture : function () {
		this.undo.capture(); 
	    }
	    
	    , unorderedList : function () {
		this.doc.execCommand('insertunorderedlist', false , null);
	    }
	    
	    , orderedList : function () {
		this.doc.execCommand('insertorderedlist', false , null);
	    }
	    
	    , indent : function () {
		this.doc.execCommand('indent', false, null); 
	    }
	    
	    , outdent : function () {
		this.doc.execCommand('outdent', false, null); 
	    }
	    
	    , subscript : function () {
		this.doc.execCommand('subscript', false, null); 
	    }
	    
	    , superscript : function () {
		this.doc.execCommand('superscript', false, null); 
	    }
	    
	    , justifyLeft : function () {
		this.doc.execCommand('justifyleft', false, null); 
	    }
	    
	    , justifyCenter : function () {
		this.doc.execCommand('justifycenter', false, null); 
	    }
	    
	    , justifyRight : function () {
		this.doc.execCommand('justifyright', false, null); 
	    }
	    
	    , justifyFull : function () {
		this.doc.execCommand('justifyfull', false, null); 
	    }
	    
	    , link : function () {
		var me = this; 
		var bookmark = me.selection().range().bookmark();
		Dialog.open ( { url : '/dialog/link' 
				 , modal : true 
				 , escape : true 
				 , init : { text : me.selection().html() } 
				 , commands : { 
				     ok : function (evt) {
					 var link = bzj.node.make('a', 
								  bzj.merge({ document : me.doc }, this.value())); 
					 me.selection().setFromBookmark(bookmark); 
					 me.selection().html(link); 
					 this.close(); 
					 return false; 
				     }
				     , cancel : function (evt) {
					 this.close(); 
				     }
				 } } ); 
	    }
	    
	    , upload : function () {
		bzj.upload ({ url : '/dialog/upload' 
			      , init : { path : "temp" }
			      , ok : function (result) {
				  alert('uploaded path: ' + result); 
			      } 
			      , command : '**upload2' 
			    }); 
	    }
	    
	    // there are a couple of different things that can be done with this
	    // 1 - we can do just a link... 
	    // 2 - if a link is provided, we can then download the file from the remote 
	    //     server... 
	    // 3 - we should allow for alignment of the images to have the text flow around it... 
	    // 
	    , insertImage : function () {
		// http://stackoverflow.com/questions/3269831/handling-image-click-event-in-a-contenteditable-region
		// image must not be clickable directly... not certain how this is solved... 
		// it seems that the clicking adds the control to the selection (is that IE only???) 
		// so removing it from the selection makes sense - but unclear how to first save
		// the selection *prior* to clicking... this is some javascript trickery google has. 
		// 
		// http://stackoverflow.com/questions/289433/firefox-designmode-disable-image-resizing-handles
		// the solutions do not appear to work... 
		// 
		// this is a pretty hard/obscure problem... I might need to solve it in other ways... 
		// (for example - load the image later with lower resolution...) 
		// (the resizing might be stored so that way the image will be handled correctly the next time). 
		// all of our image page ought to have the ability for resizing images... 
		// 
		// okay - one step @ a time... hmm... 
		var editor = this; 
		var bookmark = editor.selection().range().bookmark(); 
		bzj.upload( { url : '/dialog/insertImage'
			      , init : { prefix : "image" } 
			      , command : '**upload' 
			      , ok : function (result) {
				  var image = bzj.node.make('img'
							    , { document : editor.doc 
								, src : result 
								, contentEditable : false 
								, designMode : 'off' }); 
				  bzj.$(image).click(function (evt) { 
				      editor.focus(); 
				      // the collapse does not remove the handles... hmm... 
				      editor.selection().collapse(false); 
				      var s = editor.selection(); 
				      alert(s.count + ' => ' + s.collapsed + ' => ' ); 
				      return false; 
				  }); 
				  editor.focus(); 
				  editor.selection().setFromBookmark(bookmark); 
				  editor.selection().html(image); 
			      } }); 
	    }
	    
	}
    } ); 
    
    
    /* at this point we have a lot of stuffs done. 
     * what we need are as follows: 
     * 
     * 1 - a custom event system (I think we have it) so we can define the events for editor.
     * 2 - fix the hotkey.js so it takes care of all of the mappings of keys correctly (and ensure that 
     *     the hotkeys are triggered accordingly for either keyup/keydown/keypress). 
     *     
     *     we might need to unbind hotkey from either keypress/keydown/keyup so that way each 
     *     browser will be able to make the appropriate decisions depending on the hotkey itself. 
     *
     * 5 - at this point all will be done... all will be done... 
     * 
     * 
     */ 
    
    
    // factory method. 
    bzj.extend(bzj, { richtext2 : bzj.makeFactory(Richtext) }); 
    
    // dose the individual element need to track the richtext counterpart? 
    // obviously we will want to manipulate them... 
    if (bzj.$) { // integrating with bzj selector API. 
	bzj.$.extend('richtext2', function(options) {
	    this.each(function(elt) {
		bzj.debug.log('Richtext editor.selector: ' + elt); 
		return bzj.richtext2( bzj.merge(options , { element : elt 
							    , url : '/richtext-template' // this is yet again unseen... hmm!!!... 
							  } )); 
	    });
	}); 
    }
    
    Widget.registry.register('textarea', 
			     function (elt) { 
				 return bzj.richtext2({ element : elt
							, url : '/richtext-template' });
			     }); 
    
})(); 


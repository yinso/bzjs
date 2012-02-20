
// this particular dialog does not require another load... i.e. the inner content.
// sometimes we will have to do that - to have multiple loads! 
/* 
 * dialog appears to be a behavior - i.e. we should be able to convert any widgets 
 * into such behavior. 
 * 
 * one way is to think that a dialog is a composite object (that holds the widget in the 
 * middle), another way is to think the dialog behavior can be added to any widget 
 * - but this will require widget to know of the behavior, or that we will have to 
 * create separate class to hold the behavior... 
 * 
 * I like the approach that dialog is considered as its own object that holds an 
 * inner object!.
 * 
 * because each widget can load its own template, what we are really trying to do is to 
 * send the parsing of the content part through the widget registry again. 
 * 
 * okay - so dialog needs to be in 2 mode.
 * 1 - an content-only mode - in this case it does not have a frame. 
 * 2 - a frame + content mode.  
 * 
 * template & url points to the frame, based on the current design. 
 * 
 * the inner can be done either via src or a procedure. 
 * 
 * let's make template & url for the content.  we'll add frame like we added the modal. 
 * 
 * the frame will then allow us to add the following... 
 * 1 - title. 
 * 2 - buttons. 
 * 3 - the middle frame... 
 * 
 * of course if we have one we do not need another... 
 * and we still need to bind against the content!. 
 * 
 * the inner likely contains a form or a fragment of a form, what we want to do is to 
 * map the values of the form accordingly!!! 
 * 
 * can form work well for one of the widget? 
 * 
 * the key is that since 
 */ 

var Dialog = bzj.Class ( {
    
    $base : Widget // okay it seems like the setup & init are not called via base!!! 
    
    , $mixin : [ Command ]
    
    , OPTIONS : { 
	REQUIRE_TEMPLATE : true 
	
	, modalTemplate : '<div class="dialog-modal" tabindex="0"></div>'
	
	, frameTemplate : '<div class="dialog" tabindex="0"><div class="dialog-header"><div class="dialog-title"></div></div><div class="dialog-content"></div>'
	    + '<div class="dialog-footer"></div></div>'
	
	, title : 'BZJ Dialog' 
    }
    
    , setupAdditionalWidget : function () {
	this.inner = this.element ;
	this.setupFrame(); 
	this.setupModal(); 
	this.reshapeElement(); 
	this.setupTitle(); 
	this.setupForm(); 
	this.addButtons(); // is this really necessary now??? it seems that the internal 
	// form should be setup by itself... hmm... 
	// there are still quite a bit of code that doesn't appear to be refactored 
	// correctly but perhaps it isn't necessary to do so for now... 
	// as long as the value works, etc, we will be good to go... 
	this.setupEscapeKey(); 
    }
    
    , setupFrame : function () {
	if (this.options.frame) {
	    this.frame = bzj.node.make(this.options.frameTemplate 
				       , { parent : this.modal || this.parentElement }); 
	    bzj.$('.dialog-content', this.frame)[0].appendChild(this.element); 
	    this.inner = this.frame; 
	}
    }
    
    , setupModal : function () {
	if (this.options.modal) {
	    this.modal = bzj.node.make(this.options.modalTemplate 
				       , { parent : this.parentElement }); 
	    bzj.node.style(this.modal, 'width', Widget.pageWidth()); 
	    bzj.node.style(this.modal, 'height', Widget.pageHeight()); 
	    this.modal.appendChild(this.inner); 
	}
    }
    
    , reshapeElement : function () {
	Widget.setOptimalElementDimension(this.inner
					  , { width : 50 , height : null }
					  , { width : 800 , height : null } ); 
	Widget.centerElement(this.inner); 
    }
    
    , setupTitle : function () {
	if (this.frame) {
	    this.title = bzj.$('.dialog-title', this.frame)[0]; 
	    this.title.innerHTML = this.options.title; // how to bind a value together with an element so they are sync'd? 
	}
    }
    
    , setupForm : function () {
	this.hasForm = FormUtil.hasForm(this.inner); 
	if (this.hasForm) {
	    FormUtil.value(this.hasForm, this.options.init || {}); 
	    // this.setupButtons(this.inner); 
	}
    }
    
    , addButtons : function () {
	if (this.frame) {
	    var footer = bzj.$('.dialog-footer', this.frame)[0]; 
	    bzj.each(function (i, settings) {
		bzj.node.make('input', bzj.merge( settings , { type : 'button' 
							       , parent : footer } )); 
	    }, this.options.buttons || []); 
	}
    }
    
    , setupEscapeKey : function () {
	if (this.options.escape) {
	    var me = this; 
	    bzj.$(this.inner).each (function (elt) {
		bzj.event.once(elt
			       , 'keydown'
			       , function (evt) {
				   me.close(); 
				   return false; 
			       }
			       , function (evt) {
				   var key = evt.keyCode || evt.which || evt.charCode; 
				   return key === bzj.KEYS.ESCAPE; 
			       }); 
	    }); 
	}
    }
    
    , bindHandlers : function () {
	this.setupCommands(this.options.commands || {}); 
	if (this.hasForm) {
	    this.setupButtons(this.inner); 
	}
    }
    
    , finishSetup : function () {
	this.focus(); 
    }
    
    , focus : function () {
	if (this.hasForm) { // this focus does not work! 
	    FormUtil.focus(this.hasForm); 
	} else {
	    this.inner.focus(); 
	}
    }
    
    , value : function () {
	if (this.hasForm) {
	    return FormUtil.value(this.hasForm); 
	} else {
	    return {}; 
	}
    }
    
} , {
    
} , {
    open : function (options) {
	return new Dialog(options); 
    }
} ); 

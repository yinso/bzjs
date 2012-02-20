/* 
 * widget.js 
 * (form & field should provide on top of this).
 * 
 * what's a widget? 
 * a widget is basically a set of UI objects... 
 * 
 * what do we do? we allow for registration/etc to this... 
 */ 

/* widget registry
 */ 

var WidgetRegistry = 
    bzj.singleton ( 
	bzj.registry 
	, { 
	    bindWidgets : function (root) {
		root = root || document.body; 
		bzj.each ( function (selector, maker) {
		    bzj.$(selector, root).each ( function (elt) {
			maker(elt); 
		    }); 
		}, this.registry_); 
	    }
	}); 

/* 
 * so each of the widget should be registered with the widget registry... 
 * 
 * scenarios: 
 * 
 * richtext - replacing textarea 
 * 
 * dialog - adding in a new DIV + things underneath it... 
 * 
 * menu - this probably just sprinkles behaviors without doing much... but menu is a composite widget.
 * 
 * form - this should go through each of the objects under the form and then add the appropriate 
 * widgets (it's a composite widget). 
 * 
 * so what does all this mean? 
 * 
 * hmm... 
 * 
 * 1 - I want the objects created to be unobtrusive... 
 *     most of the time - just sprinkling behaviors are exactly what we need... 
 * 
 * 2 - but times we need to create new objects to organize the behaviors... I don't think 
 *     I can get away with just the first one (for example - it would be very difficult to do 
 *     richtext without having an object). 
 * 
 * 3 - what Widget does is to provide the necessary code to do Objects like richtext and dialog. 
 * 
 * both widget are represented as html elements on UI. 
 *
 * but one was a replacement for an existing element, while the other is created out of thin air 
 * 
 * these are the basic two patterns that we need to abstract in widget. 
 * 
 * replacement of an existing element. 
 * 
 * creating elements out of thin air can be considered as creating an element and then replace
 * that element with something else. 
 * 
 * the difference there isn't profound. 
 * 
 */ 

var Command = { // this is a mixin. 
    // should command handle binding of buttons as well??? 
    // if it does it means taht commands should not be setup until 
    // we have the buttons available, and it also means that command2 depends 
    // on Form... 
    setupCommands : function (cmds) {
	this.commands = this.commands || {}; 
	cmds = cmds || {};
	for (var key in cmds) {
	    this.register(key, cmds[key]); 
	}
    }
    
    , register : function (name, cmd) {
	this.commands[name] = cmd; 
    }
    
    , unregister : function (name) {
	delete this.commands[name]; 
    }
    
    // setupButtons cannot be called until setupCommands is called. 
    , setupButtons : function (rootElt) {
	rootElt = rootElt || this.element || document; 
	var me = this; 
	bzj.$('button,input[type=button],input[type=submit],input[type=reset],input[type=image]'
	      , rootElt).click(function (evt) {
		  if (me.commands[this.name]) {
		      return me.exec(this.name, evt); 
		  }
		  return false; 
	      }); 
    }
    
    // setupHotkeys must be called after setupCommands. 
    , setupHotkeys : function (hotkeys, rootElt) {
	rootElt = rootElt || this.element || document; 
	var me = this;
	bzj.each(function (key, val) {
	    bzj.$(rootElt).hotkey(key, typeof val == 'string' 
				  ? function (evt) {
				      if (me.commands[val]) {
					  me.exec(val, evt);
					  return false; 
				      } 
				      return true; 
				  } : val); 
	}, hotkeys || {}); 
    }
    
    , exec : function (name) {
	var args = bzj.$slice(arguments); 
	args.shift(); // remove the name arg. 
	var me = this; 
	bzj.assert.exists(me.commands, name); 
	if (me.preCommand) {
	    me.preCommand();
	} 
	var result = me.commands[name].apply(me, args);
	if (me.postCommand) {
	    me.postCommand(); 
	}
	return result; 
    }
    
}; 


/*
 * time to think about how this actually works. 
 * 
 * template > url (because it is harder to type a template)
 * and then we might have default template & url - specified the same way... 
 * 
 * will the loading of the URL causes the loading 
 */

var Widget = bzj.Class ( {
    
    init : function () {
	bzj.debug.log('Widget.init'); 
	this.document = document ; 
	this.parentElement = document.body; // this needs to be overwritten in setup... 
    }
    
    , OPTIONS : {} 
    
    , mergeOptions : function (options) {
	this.options = bzj.merge(this.OPTIONS, options); 
	// what would this do?? it will have the following. 
	if (options.template) { // we are done... 
	    delete this.options.url; 
	} else if (options.url) {
	    delete this.options.template; 
	} 
	var me = this; 
	bzj.assert.run(function () {
	    if (me.OPTIONS.REQUIRE_TEMPLATE) {
		return me.options.template || me.options.url; 
	    } else {
		return true; 
	    }
	}, "Widget.setup - does not have template or url option"); 
    }
    
    , setup : function (options) {
	bzj.debug.log('Widget.setup - ' , options.url); 
	this.mergeOptions(options); 
	if (this.options.element) { 
	    this.bindElement(); 
	}
	if (this.options.template) { 
	    this.setupTheRest(); 
	} else {
	    this.loadTemplate(); 
	}
    }
    
    , bindElement : function () {
	this.element = this.options.element; 
	this.parentElement = this.element.parentNode ; // the only time this will fail is if the elt is the body... 
	this.element.$$widget$$ = this; // watch out for leaks. 
    }
    
    , createWidgetElement : function () {
	if (this.options.template) {
	    var element = this.element ; 
	    this.element = bzj.node.make(this.options.template
					 , { parent : this.parentElement 
					     , document : this.document 
					     , before : this.element }); 
	    if (element) {
		this.element.appendChild(element); 
		this.originalElement = element; 
	    } 
	}
    }
    
    , setupAdditionalWidget : function () { } 
    
    , loadTemplate : function () {
	var me = this; // the load template needs to be something that we can use successfully...
	bzj.debug.log('Widget.loadTemplate: url: ', this.options.url); 
	bzj.xhr.call( { url : this.options.url 
			, method : 'GET'
			, async : true 
			, ok : function (template) {
			    me.options.template = template; 
			    me.setupTheRest(); 
			}
			, fail : function (template) {
			    throw new Error(template); 
			} 
		      }); 
    }
    
    , setupTheRest : function () {
	bzj.debug.log('Widget2.setupTheRest'); 
	this.createWidgetElement(); 
	this.setupAdditionalWidget(); 
	this.bindHandlers(); 
	this.finishSetup(); 
    }
    
    , bindHandlers : function () {
	// overwrite this function in order to bind the event handlers!!!! 
    }
    
    , finishSetup : function () {
	// do anything else to required to do here! 
    }
    
    , focus : function () {
	
    } 
    
    , value : function () { 
	return '' ; 
    }
    
    , open : function (options) { 
	this.setup(options); 
	return this; 
    }
    
    , close : function () {
	this.parentElement.removeChild(this.modal || this.element); 
	return this; 
    }
    
} , { 
    
} , { 
    // all these belong in something called layout... 
    viewWidth : bzj.agent.browser == 'msie' 
	? function () {
	    return document.body.offsetWidth; 
	} : function () {
	    return window.innerWidth; 
	}

    , viewHeight : bzj.agent.browser == 'msie' 
	? function () {
	    return document.body.offsetHeight; 
	} : function () {
	    return window.innerHeight; 
	}

    , pageWidth : function () {
	return Math.max(Widget.viewWidth(), document.body.scrollWidth); 
    }

    , pageHeight : function () {
	return Math.max(Widget.viewHeight()
			, document.body.scrollHeight);
    }

    , centerElement : function (elt) {
	bzj.node.style(elt, 'top', (Widget.viewHeight() - elt.clientHeight) / 2); // top/left have no effect unless the position is relative!!
	bzj.node.style(elt, 'left', (Widget.viewWidth() - elt.clientWidth) / 2); 
    }

    , optimalElementWidth : function (elt, min, max) {
	min = min || 50; 
	max = max || (Widget.viewWidth() * 0.8); 
	bzj.debug.log('width: ', elt.scrollWidth, ' vs ' , min , ' vs ' , max);  
	return Math.min(max, Math.max(min, elt.scrollWidth)); 
    }
    
    , optimalElementHeight : function (elt, min, max) {
	min = min || 50; 
	max = max || (Widget.viewHeight() * 0.8); 
	bzj.debug.log('height: ', elt.scrollHeight, ' vs ' , min , ' vs ' , max);  
	return Math.min(max, Math.max(min, elt.scrollHeight)); 
    }
    
    , setOptimalElementDimension : function (elt, min, max) {
	bzj.node.style(elt, 'width', Widget.optimalElementWidth(elt, min.width, max.width)); 
	bzj.node.style(elt, 'height', Widget.optimalElementHeight(elt,  min.height, max.height));
    }
    
    , registry : WidgetRegistry
} ); 

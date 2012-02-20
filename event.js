/*
 *  bzj.Event - an independent cross browser js event library. 
 * 
 * standard events: 
 * 
 * mouse events: 
 * mousedown, mouseup, click, dbclick, mousemove, mouseover, mouseout 
 * (MS-only: mouseenter, mouseleave) 
 // a lot of bugs fixed: 
 // 1 - added the capability of once
 // 2 - added the capability of test 
 // 3 - ensure that both innerbind & innerunbind works for either IE or mozilla (no typos)
 // 4 - fix the missing handler.GUID 
 // 5 - added capability for toggle. 
 * 
 * 
 */
(function () {

    /**********************************************************************
     * ready 
     * this is a type of event... should it not belong to the event module? 
     * that would seem to make sense. 
     * 
     * this design is heavily inspired by jQuery. 
     **********************************************************************/
    var ready = function (callback, doc) {
	doc = doc || document; 
	var w = doc.parentWindow || doc.defaultView; // http://stackoverflow.com/questions/2133659/javascript-selenium-get-the-window-from-the-document-object
	var readyCalled = false; 
	var Loaded = function () {
	    if (readyCalled == false) {
		readyCalled = true; 
		return callback(); 
	    } else {
		return false; 
	    }
	}
	
	if (doc.readyState == 'complete') 
	    return callback(); 
	
	if (doc.addEventListener) {
	    doc.addEventListener('DOMContentLoaded', Loaded, false); 
	    w.addEventListener('load', Loaded, false);
	} else if (document.attachEvent) {
	    doc.attachEvent('onreadystatechange', Loaded); 
	}
    }; 
    
    var EventLike = bzj.Class( { 
	init : function () {
	    this.cancelBubble = false; 
	    this.returnValue = true; 
	}
	
	, preventDefault : function () {
	    this.returnValue = false; 
	}
	
	, stopPropagation : function () {
	    this.cancelBubble = true; 
	}
    }); 
    
    // requires core/base... 
    var EventManager = bzj.Class({ // class shared members... 
	
	setup : function (elt) {
	    this.elt = elt; 
	    return this; 
	} 
	
	, bind : function (type, handler) {
	    if (!this[type]) 
		this[type] = {};
	    bzj.debug.log('bzj.event.bind: ', type, ': ' , handler.GUID); 
	    this.innerBind(type, handler); 
	    this[type][handler.GUID] = handler; 
	}
	
	/* innerBind 
	 *
	 * this is written to bind against an HTML NODE - what do I need to do to 
	 * write it so it can also work for a regular javascript object? 
	 * 
	 * 1 - we need to test to see if this is an node... 
	 */
	, innerBind : document.addEventListener ? 
	    function (type, handler) {
		if (bzj.node.isa(this.elt)) {
		    this.elt.addEventListener(type, handler, false); 
		}
	    } : function (type, handler) {
		if (bzj.node.isa(this.elt)) {
		    this.elt.attachEvent('on' + type, handler); 
		}
	    }
	
	, unbind : function (type, callback) {
	    var handler = this[type][callback.$$guid$$]; 
	    if (handler) 
		this.innerUnbind (type, handler); 
	    delete this[type][callback.$$guid$$]; 
	}
	
	, innerUnbind : document.removeEventListener ? 
	    function (type, handler) {
		if (bzj.node.isa(this.elt)) {
		    this.elt.removeEventListener(type, handler, false);
		}
	    } : function (type, handler) {
		if (bzj.node.isa(this.elt)) {
		    this.elt.detachEvent('on' + type, handler); 
		}
	    }
	
	, trigger : function (type) {
	    // if we are programmatically triggering the callback, 
	    // we do not really need to rely on the actual event handler to 
	    // do the handling... that must be insight to allow jQuery to pass arguments.
	    
	    // the thing is that for most DOM events this will be useless since 
	    // if these functions are meant to be used correctly they will never be 
	    // expected to take on additional arguments... 
	    // 
	    // the only time this might make sense is when we are passing in our own 
	    // event objects in lieu of window's generated event objects... hmm!!! 
	    if (bzj.node.isa(this.elt) 
		&& EventManager.TYPES[type] === true) { // this is the intrinsic type... 
		this.elt[type]('abc'); // this doesn't actually pass the 
	    } else { 
		bzj.debug.log('Event.trigger.', type); 
		// we will try to make it into a custom event!!! 
		// okay - the custom event will require us to go ahead and 
		// fire them... // can we handle bubbling? there are no bubbling 
		// of custom events for now... 
		// what does that mean for 
		if (this[type]) {
		    // this should also have a fake event object!... 
		    // we currently do not have that... 
		    for (var i in this[type]) {
			this[type][i](new EventLike()); // error will kill the rest of the handlers... 
		    }
		}
	    }
	}
    }, { // instance level members 
	
    }, { // static level members
	
	HANDLERS : { } 
	, TYPES : { // true means an predefined event, false or otherwise means custom
	    keydown : true  
	    , keyup : true 
	    , keypress : true 
	    , click : true 
	    , dblclick : true 
	    , focus : true 
	    , blur : true 
	    , load : true 
	    , unload : true 
	    , submit : true 
	}
	
	, GUID : 1 
	
	, setup : function (elt, callback) {
	    if (!elt.$$handlers$$) {
		elt.$$handlers$$ = new EventManager(elt); 
	    }
	    if (!callback.$$guid$$) {
		callback.$$guid$$ = EventManager.GUID++; 
		EventManager.HANDLERS[callback.$$guid$$] = callback; 
	    }
	}
	
	, bind : function (elt , type , callback, test) {
	    EventManager.setup(elt, callback); 
	    var handler = EventManager.makeHandler(elt, type, callback, false, test); 
	    elt.$$handlers$$.bind(type, handler); // so how do I map the handler to the callback? 
	} 
	
	, unbind : function (elt, type, callback) {
	    if (!elt.$$handlers$$)
		return;
	    if (!callback.$$guid$$) 
		return; 
	    elt.$$handlers$$.unbind(type, callback); 
	    delete EventManager.HANDLERS[callback.$$guid$$]; 
	} 
	
	, toggle : function (elt, type, callback, test) {
	    if (!callback.$$guid$$) {
		EventManager.bind(elt, type, callback, test); 
	    } else {
		EventManager.unbind(elt, type, callback); 
	    }
	}
	
	, once : function (elt, type, callback, test) {
	    EventManager.setup(elt, callback); 
	    var handler = EventManager.makeHandler(elt, type, callback, true, test); 
	    elt.$$handlers$$.bind(type, handler); 
	}
	
	, trigger : function (elt, type) {
	    if (!elt.$$handlers$$)
		return; 
	    elt.$$handlers$$.trigger(type); 
	}
	
	, extend : function (type) {
	    EventManager[type] = function (elt, callback) {
		if (callback) 
		    EventManager.bind(elt, type, callback);
		else
		    EventManager.trigger(elt, type); 
	    }; 
	}
	
	, makeHandler : function (elt , type, callback, once, test, convert) {
	    once = once || false; 
	    test = test || function () { return true; }; 
	    convert = convert || function (evt) { return evt; }; 
	    var handler = function (evt) {
		var result = true; 
		var e = convert(evt || window.event); 
		if (test(evt)) {
		    result = callback.call(elt, e); 
		    if (once) 
			EventManager.unbind(elt, type, callback); 
		}
		EventManager.manageNext(evt || window.event, result); 
	    };
	    handler.GUID = callback.$$guid$$; 
	    return handler; 
	} 
	
	, manageNext : function (evt, result) {
	    result = result || false;  
	    if (result === false || result.noDefault) 
		EventManager.noDefault(evt); 
	    if (result === false || result.noBubble)
		EventManager.noBubble(evt); 
	} 
	
	, noDefault : document.addEventListener ? 
	    function (evt) {
		evt.preventDefault();
	    } : function (evt) {
		evt.returnValue = false; 
	    }
	
	, noBubble : document.addEventListener ? 
	    function (evt) {
		evt.stopPropagation(); 
	    } : function (evt) {
		evt.cancelBubble = true; 
	    }
    }); 
    
    bzj.each (function (key, val) {
	if (val === true) {
	    EventManager.extend(key); 
	}; 
    }, EventManager.TYPES); 
    
    bzj.extend(bzj, { event : EventManager
		      , ready : ready 
		    }); 
    
})(); 

(function () {
    
    // require core & event.
    
    /* a list of predefined special keys for javascript... */ 
    var KEYS = {
	BACKSPACE : 8
	, TAB :	9
	, ENTER : 	13
	, SHIFT : 	16
	, CTRL : 	17
	, ALT : 	18
	, PAUSE : 	19
	, CAPSLOCK : 	20
	, ESCAPE : 	27
	, PAGEUP : 	33
	, PAGEDOWN : 	34
	, END : 	35
	, HOME : 	36
	, LEFT : 	37
	, UP : 	38
	, RIGHT : 	39
	, DOWN : 	40
	, INSERT : 	45
	, DELETE : 	46
	, F1 : 	112
	, F2 : 	113
	, F3 : 	114
	, F4 : 	115 // NOTE that this returns the same as 's' 
	, F5 : 	116
	, F6 : 	117
	, F7 : 	118
	, F8 : 	119
	, F9 : 	120
	, F10 : 	121
	, F11 : 	122
	, F12 : 	123
    }; 
    
    /*
      hotkey... 
      
      the hotkey will be a dispatch table that holds a list of callbacks 
      
      the dispatch table will basically dispatch against the keycode... 
      
      in the case of a context insensitive keycode - both will be attached for dispatching... 
    */
    
    var isUpper = function (key) {
	if (typeof key == 'string' && key.length == 1 && key.toUpperCase() == key) {
	    return true; 
	}
	return false; 
    }; 
    
    /*
     */
    var Hotkey = bzj.Class({
	
	// constructor - takes in the element/node that the hotkeys will apply against 
	setup : function (elt) {
	    var self = this; 
	    self.elt = elt; 
	    self.handler = function (evt) {
		return self.trigger(evt); 
	    }
	    bzj.event.bind(self.elt, Hotkey.EVENT , self.handler); 
	    return self; 
	}
	
	// Hotkey.bind('ctrl-s', function (evt) { ... }); 
	// binds a hotkey against a callback... 
	, bind : function (hotkey, callback) {
	    var hotkey = Hotkey.parseHotkey(hotkey); 
	    hotkey.callback = callback; 
	    if (!this[hotkey.code]) 
		this[hotkey.code] = []; 
	    this[hotkey.code].push (hotkey); 
	    if (hotkey.ci) {
		if (!this[hotkey.ci]) {
		    this[hotkey.ci] = [];
		}
		this[hotkey.ci].push(hotkey); 
	    }
	}
	
	// Hotkey.unbind('ctrl-s', function (evt) { ... }); 
	// unbinds a hotkey against a callback. 
	// note the callback must be the exact function object in order to unbind
	// (this behavior is the same as DOM2 events) 
	, unbind : function (hotkey, callback) {
	    var hotkey = Hotkey.parseHotkey(hotkey); 
	    if (!this[hotkey.code]) 
		return; 
	    for (var i in this[hotkey.code]) {
		if (this[hotkey.code][i].callback === callback) {
		    this[hotkey.code].splice(i, 1); 
		}
	    }
	}
	
	// Hotkey.trigger(evt); 
	// fire the event and let the hotkey handle it. 
	// this generally is not called directly. 
	, trigger : function (evt) {
	    var normed = Hotkey.normalizeEvent(evt); 
	    // bzj.debug.log('trigger: ', normed); 
	    var hotkeys = this[normed.code]; // it might be possible that the code doesn't work this way... hmm... 
	    if (hotkeys) {
		for (var i in hotkeys) { 
		    if (Hotkey.match(normed, hotkeys[i])) {
			return hotkeys[i].callback.call(this.elt, evt); // what do we do in this case???
		    }
		}
	    }
	    return true; // no match... 
	}
	
    } , { 
	
    } , {
	
	/* firefox - keypress / meta on mac  
	 * safari - keypress / meta on mac 
	 * opera - keypress / ctrl on mac (this is the worst) 
	 * chrome - keydown / meta on mac 
	 * IE ... the last one to tackle... to make this fully work we will have to 
	 * duplicate the selection.js for sure... we will see... 
	 * testing against IE7 is the right thing to do, and if we can cover IE6 that 
	 * will be great... 
	 */ 
	
	// http://www.quirksmode.org/dom/events/keys.html
	/*
	 * issue with opera. a LOT of issues 
	 * 1 - keydown is only fired once - hence hard to capture, especially for hotkey combos 
	 * 2 - keydown default cannot be cancelled... that means the default actions such as 
	 *     meta-s (save), meta-b (bold), meta-z (undo) are all kept by the browser. 
	 * 3 - meta and control are actually switched on Mac. so if I specify meta I am actually 
	 *     specifying control, and vice versa (so the reason #2 works is because ctrl-s, 
	 *     ctrl-b, and ctrl-z are mapped, and hence they worked). 
	 * 
	 * this means that I might have to stick with using the physical control key for 
	 * meta-s, meta-b, meta-z actions, and forget about cancelling Opera defaults. 
	 * 
	 * this means that if we are going to convert it down to lower case we will have 
	 * a hell of time... 
	 * a s
	 */
	
	/* chrome also appear to have quite a bit of issue 
	 * for KEYPRESS it seems that the code is *mapped* completely different for chrome
	 * for KEYDOWN it return the correct code but the preventDefault does not seem to work. 
	 * does it require KEYUP??? 
	 * http://code.google.com/p/chromium/issues/detail?id=2606
	 * 
	 * a keydown in chrome maps to UPPER CASE character. not sure why.
	 * I don't even know what keypress maps to as control characters in chrome. 
	 */
	
	
	/*
	 * IE must use keydown to capture a ctrl-based event... it does not fire otherwise... 
	 * 
	 * further - all keycodes for alpha are upper-case #'s. 
	 * 
	 * we need a keyboard mapping just to make all these work... 
	 * 
	 * it seems that we need a set of logics to work around the whole browser mess 
	 * documented at http://unixpapa.com/js/
	 
	 * additional key knowledge... 
	 * http://ejohn.org/blog/keypress-in-safari-31/ - the changes in safari's keyevent model.
	 * https://lists.webkit.org/pipermail/webkit-dev/2007-December/002992.html - the change in safari 
	 * http://stackoverflow.com/questions/492865/jquery-keypress-event-not-firing - keypress not working for IE w.r.t. special chars 
	 * http://www.cambiaresearch.com/c4/702b8cd1-e5b0-42e6-83ac-25f0306e3e25/Javascript-Char-Codes-Key-Codes.aspx - only part of the keycode - not as good as unix papa
	 * http://www.asciitable.com/ - ascii codes... a picture (kinda dumb)... 
	 
	 */
	
	// safari cannot use keydown
	// safari also appears not able to use ctrl key
	// it means that we need to convert the ctrl key into meta key with Mac to ensure to follow the appropriate convention... 
	// EVENT : 'keypress' // I think safari requires using of keydown instead... 
	
	EVENT : (bzj.agent.browser == 'chrome' || bzj.agent.browser == 'msie') 
	    ? 'keydown'  : 'keypress' 
	
	// EVENT : 'keypress' // opera should be keypress but it seems like it cannot override the default event... hmm... 
	
	// in opera ctrl & meta are *reversed*... 
	// i.e. if you press ctrl you get meta, and if you press meta you get control. 
	// because it cannot overwrite the regular actions that makes 
	// EVENT : 'keydown' 
	
	, META_AS_CTRL : bzj.agent.os == 'mac' ? true : false 
	
	, UPPER_CASE : (bzj.agent.browser == 'chrome' || bzj.agent.browser == 'msie') ? true : false 
	
	, bind : function (elt, hotkey, callback) {
	    bzj.debug.log('hotkey bind: ' + hotkey); 
	    if (!elt.$$hotkey$$) {
		elt.$$hotkey$$ = new Hotkey(elt); 
	    }
	    elt.$$hotkey$$.bind(hotkey, callback); 
	}
	
	, unbind : function (elt, hotkey, callback) {
	    if (!elt.$$hotkey$$) 
		return; 
	    elt.$$hotkey$$.unbind(hotkey, callback); 
	}
	
	, toggle : function (elt, hotkey, callback) {
	    // how do I know if I am passed the same hotkey & callback? we will have to 
	    // look for it... 
	    if (!elt.$$hotkey$$) {
		elt.$$hotkey$$ = new Hotkey(elt); 
	    }
	    
	}
	
	, key2code : function(key) {
	    if (typeof key == 'string' && key.length == 1) {
		if (Hotkey.UPPER_CASE) {
		    return key.toUpperCase().charCodeAt(0);
		} else {
		    return key.charCodeAt(0);
		}
	    } else if (KEYS[key.toUpperCase()]) { // returns for special keys... 
		return KEYS[key.toUpperCase()];
	    } else {
		return 0; 
	    }
	}
	
	, parseHotkey : function(hotkey) {
	    var spec = hotkey.split('-');
	    var out = { ctrl : false 
			, alt : false 
			, shift : false 
			, meta : false 
			, key : null 
			, code : null 
			, ci : false }; 
	    for (var i = 0; i < spec.length; ++i) {
		if (/ctrl/i.exec(spec[i])) {
		    out.ctrl = true; 
		} else if (/alt/i.exec(spec[i])) {
		    out.alt = true; 
		} else if (/shift/i.exec(spec[i])) {
		    out.shift = true; 
		} else if (/meta/i.exec(spec[i])) {
		    out.meta = true; 
		} else if (/ci/i.exec(spec[i])) {
		    out.ci = true; 
		} else {
		    out.key = spec[i]; 
		    out.code = Hotkey.key2code(spec[i]); 
		}
	    }
	    if (Hotkey.META_AS_CTRL) {
		out.meta = true; 
		out.ctrl = false; 
	    }
	    // /* 
	    bzj.debug.log('meta_as_control? ', Hotkey.META_AS_CTRL
			  , ' => ' , bzj.agent , '\n'
			  , ' => ' , navigator.appVersion , '\n' 
			  , ' => ', out); 
			  // */ 
	    // TODO: 
	    // ensure that the code is always the lower-case code in case of CI 
	    // if the key is shifted - then ensure the code is upper case. 
	    // there are a few more things to fix to make sure this all works... 
	    // also need to test in IE, Safari, and Chrome 
	    if (out.ci) {
		if (isUpper(out.key)) {
		    out.ci = Hotkey.key2code(out.key.toLowerCase()); 
		} else {
		    out.ci = Hotkey.key2code(out.key.toUpperCase()); 
		}
	    }
	    return out; 
	}
	
	, normalizeEvent : function (evt) {
	    //bzj.debug.log('normalizeEvent: ' , evt.charCode
		//	  , ', ', evt.which , ', ', evt.keyCode , ', ', evt.keyIdentifier); 
	    return { code : evt.charCode || evt.which || evt.keyCode 
		     , alt : evt.altKey || false 
		     , shift : evt.shiftKey || false 
		     , ctrl : evt.ctrlKey || false 
		     , meta : evt.metaKey || false 
		   }; 
	}
	
	, match : function (normed, hotkey) {
	    // bzj.debug.log('match: ', normed, ' => ', hotkey); 
	    return normed.alt == hotkey.alt 
		&& normed.ctrl == hotkey.ctrl 
		&& normed.meta == hotkey.meta 
	    // && normed.shift == hotkey.shift // commented out as shift is already taken cared of... 
	    ; 
	}
    }); 
    
    if (bzj.$) { // creates a custom bnding if the selector API is present... 
	bzj.$.extend('hotkey', function(hotkey, callback) {
	    this.each(function(elt) {
		// if we pass the hotkey the second time we will remove it... this is a toggle... 
		Hotkey.bind(elt, hotkey, callback); 
	    }); 
	}); 
    } 
    
    bzj.extend(bzj, { KEYS : KEYS , hotkey : Hotkey }); // bzj.hotkey (should almost never be directly used) 
})(); 
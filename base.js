var bzj = { version : '0.1' }; 

(function() {
    
    /**********************************************************************
     * client agent detection - for when object detection fails. 
     **********************************************************************/
    var agent = (function () {
	var w = window, na = navigator, ua = na.userAgent; 
	// version detection. 
	var v = (ua.match( /(?:rv|it|ra|ie)[\/: ]([\d+.]+)/i ) || [0,'0'])[1]; 
	var out = { version : v }; 
	// browser detection. 
	if (window.opera && opera.buildNumber) {
	    out.browser = 'opera'; 
	} else if (/chrome/i.test(ua)) {
	    out.browser = 'chrome'; 
	} else if (/Safari/i.test(ua)) {
	    out.browser = 'safari'; 
	} else if (/webkit/i.test(ua)) { // detection failed... {
	    out.browser = 'webkit'; 
	} else if (/msie/i.test(ua)) {
	    out.browser = 'msie'; 
	} else if (/gecko/i.test(ua) && !/(compatible|webkit)/.test(ua)) {
	    out.browser = 'gecko'; 
	} else {
	    out.browser = 'mozilla'; 
	}
	// os detection... 
	var os = na.appVersion; 
	if (/windows/i.test(os)) {
	    out.os = 'windows'; 
	} else if (/mac/i.test(os)) {
	    out.os = 'mac'; 
	} else if (/linux/i.test(os)) {
	    out.os = 'linux'; 
	} else if (/unix/i.test(os)) {
	    out.os = 'unix'; 
	} else {
	    out.os = 'unknown'; 
	} 
	return out; 
    })();
    
    var noop = function () {}; 
    
    /**********************************************************************/
    // merge - combine two objects together...  
    /**********************************************************************/
    var merge = function(source, target, overwrite) {
	overwrite = (overwrite === false) ? false : overwrite || true; 
	for (var prop in source) {
	    target[prop] = overwrite ? source[prop] : target[prop] || source[prop];
	}
	return target; 
    }; 
    
    /**********************************************************************/
    // extend - the reverse of merge - this matches more w/ OOP 
    /**********************************************************************/
    var extend = function (target, source, overwrite) {
	return merge(source, target, overwrite); 
    };
    
    /**********************************************************************/
    // keys - returns the keys for a particular object. 
    /**********************************************************************/
    var keys = function (o) {
	var a = []; 
	for (var i in o) {
	    a.push(i);
	}
	return a; 
    }
    
    var values = function (o) {
	var a = []; 
	for (var i in o) {
	    a.push(o[i]); 
	}
	return a; 
    };
    
    /* 
     * attr - getting an attribute off of an attribute list.
     * 
     * attrs - the attribute list (javascript object) 
     * key - the name of the attribute 
     * defaultVal - what to return in case the key does not exist. 
     * remove - true/false - if true, we will delete the key from the attribute list. 
     */
    var attr = function (attrs , key , defaultVal , remove) {
	if (typeof (attrs[key]) === undefined) {
	    return defaultVal; 
	}
	var out = attrs[key] || defaultVal;  // it should not be undefined here... hmm... 
	if (remove) 
	    delete attrs[key]; 
	return out; 
    }
    
    /*
     * memberof 
     */
    var memberof = function (v, group) {
	for (var i in group) {
	    if (v == group[i]) 
		return true; 
	}
	return false; 
    }; 
    
    function identity (x) { return x; } 
    
    /**********************************************************************/
    // each - iterate through the object with a callback... 
    /**********************************************************************/
    var each = function (callback, target) {
	target = target || this; 
	if (isa(target, Array)) {
	    for (var i = 0; i < target.length; ++i) {
		callback.call(this, i, target[i]); 
	    }
	} else {
	    for (var i in target) {
		callback.call(this, i, target[i]); // do we make modification to *this*?? 
	    };
	}
    }; 
    
    /**********************************************************************/
    // Class - create a class in classic OOP style. 
    /**********************************************************************/
    
    /**********************************************************************/
    // makeFactory - 
    // a generic factory method for any Class with variable # of arguments. 
    /**********************************************************************/
    var makeFactory = function(Class) {
	var F = function(args) {
	    return Class.apply(this, args); 
	}; 
	F.prototype = Class.prototype; // keep the same inheritance chain.
	F.prototype.constructor = Class; // ensure F creates the same class. 
	return function () {
	    return new F(arguments); 
	}; 
    }; 
    
    var maker = function (Class) {
	var F = function (args) {
	    return Class.apply(this, args); 
	}
	F.prototype = Class.prototype;
	F.prototype.constructor = Class; 
	return function () {
	    var obj = {}; // the none new key ... does this work?? hmm... it should... 
	    return F.call(obj, arguments); 
	}
    }; 
    
    var Class = function ($class, $instance, $static) {
	/* both init & setup are part of ctor.
	 * the reason there are two is to allow the class to be instantiated without 
	 * having to pass arguments, in order to support javascript's inheritance needs.
	 * 
	 * given they are both part of ctor - one needs to call both of them before using it 
	 * otherwise run the risk of not having the object fully instantiated. 
	 */
	var $base = $class.$base || Object; 
	var proto = new $base(); 
	$class.init = $class.init || proto.init || noop; // init - overwrite this for non-arg-based initialization
	$class.setup = $class.setup || proto.setup || noop;  // setup - call this for arg-based initialization
	var $mixin = $class.$mixin || []; 
	var ctor = function () { // one more thing to guard against - forgetting to call new
	    extend(this, $instance || {}); // this is the basic values... // hmm...!!!
	    $class.init.call(this); 
	    if (arguments.length > 0) { 
		$class.setup.apply(this, arguments); 
	    }
	    return this; 
	}; 
	// setting up the correct inheritance chain. 
	extend(proto, $class); 
	for (var i in $mixin) {
	    var mixin = typeof($mixin[i]) == 'function' ? new ($mixin[i])() : $mixin[i]; 
	    extend(proto, mixin, false); // in case mixin is already added & extended, like Initialize! 
	}
	proto.constructor = ctor; 
	ctor.prototype = proto; 
	ctor.prototype.$super = proto; // this ensure that we can access the parent's functions!
	extend(ctor, $static || {}); // static method goes onto the ctor itself. 
	return ctor; 
    }; 
    
    function singleton (klass, extension) {
	var maker = bzj.makeFactory(klass);
	var args = $slice(arguments); 
	args.splice(0, 2); 
	var obj = maker.apply(null, args); 
	if (extension) {
	    bzj.extend(obj, extension);
	}
	return obj; 
    }
    
    var isa = function (v, type) {
	if (typeof type == 'string') { // this means we are using typeof check... 
	    return typeof v === type; 
	} else if (v instanceof type) {
	    return true ; 
	} else { // go through the mixin chain... what about mixin inheritance??? in this case we will say no.
	    // if a mixin derive from another mixin, then we will be in trouble... 
	    // that will mean walking through all of the chains!!!....
	    // how do we do so??? 
	    return false ; 
	}// we want to test for the inheritance chain... 
    }; 
    
    /**********************************************************************/
    // map1 - iterate over a array with a procedure - scheme style. 
    /**********************************************************************/
    var map1 = function(proc, ary) {
	var target = new Array(ary.length); 
	for (var i = 0; i < ary.length; ++i) {
	    target[i] = proc(ary[i]);
	}
	return target; 
    }
    
    /**********************************************************************/
    // remove - remove a particular element from an array. 
    /**********************************************************************/
    var remove = function(ary, o) {
	var i = 0;
	while (i < ary.length) {
	    if (ary[i] == o) {
		ary.splice(i,1);
	    } else {
		i++; 
	    }
	}
	return ary; 
    }
    
    /**********************************************************************/
    // array manipulation. 
    /**********************************************************************/
    var array2hash = function(ary) {
	var out = {}; 
	for (var i = 0; i < ary.length; ++i) {
	    out[ary[i]] = ary[i]; 
	}
	return out; 
    };
    
    /* 
     * converting array to unique:
     * http://www.martienus.com/code/javascript-remove-duplicates-from-array.html
     * http://andrewdupont.net/2006/05/18/javascript-associative-arrays-considered-harmful/
     * 
     * the hash method is the fastest method available (it is 2N) for large number of items.
     * 
     * the challenge with this method is that it works only for strings and numbers stored 
     * in array, and not for complex objects... because Object 
     * 
     * javascript datatypes: http://www.jibbering.com/faq/notes/type-conversion/
     * - undefined -> gets filtered out. 
     * - null -> gets filtered out? 
     * - boolean -> there are only two potential values... 
     * - number -> works fine. as long as there isn't another string with the same value. 
     * - string -> works fine. 
     * - array -> doesn't work - this will require us to create an unique ID... 
     * - object
     * - function 
     * 
     * 
     */
    
    var __unique_id = (function () {
	var __UNIQUE_ID__ = 0; 
	return function () {
	    return __UNIQUE_ID__++; 
	}; 
    })();
    
    // a fast method (potentially unsafe if types are mixed). 
    // this is fast in the big-O sense.  for smaller arrays the safeUnique might be just as 
    // fast
    var fastUnique = (function () {
	
	var __UNIQUE_KEY__ = '$$$$$$$$$#########$$$$$$$$$########$$$$$$$$$$'; 
	
	function toString (o) {
	    switch (typeof(o)) {
	    case 'number':
	    case 'boolean':
	    case 'string':
		return o; 
	    default:
		if (!o[__UNIQUE_KEY__]) {
		    o[__UNIQUE_KEY__] = __UNIQUE_KEY__ + __unique_id(); 
		}
		return o[__UNIQUE_KEY__]; 
	    }
	}
	
	function clear(o) {
	    switch (typeof(o)) {
	    case 'number':
	    case 'boolean':
	    case 'string':
		return; 
	    default:
		if (o[__UNIQUE_KEY__]) {
		    // delete key from DOM in IE resulted in an error. 
		    // so we set it to be undefined, which should not return in an value for us. 
		    o[__UNIQUE_KEY__] = undefined; 
		}
		return; 
	    }
	}
	
	return function (ary) {
	    var out = [], temp = {}; 
	    for (var i = 0; i < ary.length; ++i) {
		var str = toString(ary[i]); 
		if (!temp[str]) {
		    temp[str] = ary[i]; 
		    out.push(ary[i]); 
		}
	    }
	    for (var i = 0; i < out.length; ++i) {
		clear(out[i]); // ensure this can be sorted next time. 
	    }
	    return out; 
	}
    })(); 
    
    function safeUnique (ary, equal) {
	equal = equal || function (x, y) { return x === y; }; // the default is same instance equality.
	var out = []; 
	for (var i = 0; i < ary.length; ++i) {
	    var dupe = false; 
	    for (var j = 0; j < out.length; ++j) {
		if (equal(ary[i], out[j])) {
		    dupe = true; 
		    break;
		} 
	    }
	    if (!dupe) {
		out.push(ary[i]); 
	    }
	}
	return out; 
    }
    
    function unique (ary, equal) {
	if (equal || ary.length < 100) {
	    return safeUnique(ary, equal); 
	} else {
	    return fastUnique(ary); 
	}
    }
    
    var $push = function (target, source) {
	target.push.apply(target, source); 
	return target; 
    }
    
    // http://webreflection.blogspot.com/2009/04/fast-array-slice-for-every-browser.html
    // IE cannot use slice with htmlcollections! 
    var $slice = document.all ? 
	function (ary) {
	    if (ary instanceof Object) {
		return Array.prototype.slice.call(ary); 
	    } else { // native objects are not instaceof Object. 
		var out = []; 
		for (var i = 0; i < ary.length; ++i) {
		    out.push(ary[i]); 
		}
		return out; 
	    }
	} : function (ary) {
	    return Array.prototype.slice.call(ary); 
	}; 
    
    var isArray = function (o) {
	return o && o.constructor === Array; 
    }; 
    
    var randomString = function() {
	return (new Date()).valueOf() + '.' + Math.random(); 
    }; 
    

    function flatten (ary) {
	var out = []; 
	each(function (i, v) {
	    if (isArray(v)) {
		out = out.concat(flatten(v)); 
	    } else {
		out.push(v); 
	    }
	}, ary); 
	return out; 
    }
    
    
    function filter (ary, proc) {
	if (!proc) {
	    return ary; 
	} else if (ary.filter) {
	    return ary.filter(proc); 
	} else {
	    var out = []; 
	    each(function (i, v) {
		if (proc(v)) {
		    out.push(v); 
		}
	    }, ary); 
	    return out; 
	}
    }    

    /**********************************************************************/
    // uri - generation of URL value... 
    /**********************************************************************/
    var uri = {
	encodeKV1 : function(key, val) {
	    return encodeURIComponent(key) + '=' + encodeURIComponent(val);
	}
	
	, encodeKV : function(key, val) {
	    if (val instanceof Array) {
		return map1(function(v) {
		    return uri.encodeKV1(key,v);
		}, val).join('&'); 
	    } else {
		return uri.encodeKV1(key,val); 
	    }
	}
	
	, encodeQuery : function (query) {
	    var str = ''; 
	    var out = []; 
	    for (var key in query) {
		out.push(uri.encodeKV(key, query[key])); 
	    }
	    return out.join('&'); 
	}
	
	, encode : function( part ) {
	    // if we want to encode URI we should have the var... 
	    var out = ''; 
	    if (part.scheme) {
		out += part.scheme + ':'; 
	    } 
	    if (part.host) {
		out += '//'; 
		if (part.user) {
		    out += part.user + '@'; 
		}
		out += part.host; 
		if (part.port) {
		    out += ':' + part.port; 
		}
	    }
	    out += part.path; 
	    if (part.query) {
		var query = uri.encodeQuery(part.query); 
		if (query != '') {
		    out += '?' + query; 
		}
	    }
	    if (part.fragment) {
		out += part.fragment;
	    }
	    return out; 
	}
	
	// inspired by http://blog.stevenlevithan.com/archives/parseuri
	, parse : function (s) {
	    var result = uri.regexp.top.exec(s); 
	    if (result) {
		return merge({ scheme : result[1] 
			       , fragment : result[4] 
			       , query : uri.parseQuery (result[3]) }
			     , uri.parseAuthority(result[2])); 
	    } else {
		return false; 
	    }
	}
	
	, parseAuthority : function (authPath) {
	    authPath = authPath || ''; 
	    if (authPath.substr(0, 2) == '//') {
		var result = uri.regexp.auth.exec(authPath); 
		if (result) {
		    return { user : result[1] 
			     , host : result[2] 
			     , port : result[3] 
			     , path : result[4] }; 
		} else {
		    return { } ; 
		}
	    } else {
		return { path : authPath }; 
	    }
	}
	
	, parseQuery : function (query) {
	    if (query === undefined) 
		return {}; 
	    var args = query.split(uri.regexp.query); 
	    var out = {}; 
	    each(function (i, v) {
		var keyval = v.split(uri.regexp.keyval); 
		var key = decodeURIComponent(keyval[0]);
		var val = keyval.length > 1 ? 
		    decodeURIComponent (keyval[1]) : ''; 
		if (out[key]) {
		    if (!(out[key] instanceof Array)) {
			out[key] = [ out[key] ]; 
		    }
		    out[key].push(val); 
		} else {
		    out[key] = val; 
		}
	    }, args); 
	    return out; 
	}
	
	, regexp : { 
	    // top handles 
	    top : /^(?:([^:]+):)?(?:([^\?]+))?(?:\?([^\#]+))?(?:#(.+))?$/
		, auth : /^\/\/(?:([^@]+)@)?(?:([^:]+))?(?::([^\/]+))?(\/.+)$/
		, query : '&' 
	    , keyval : '=' 
	} 
    }; 
    
    var timestamp = function () {
	return Math.round(new Date().getTime() / 1000);
    }; 
    
    /**********************************************************************/
    // debug - a logging utility... 
    /**********************************************************************/
    // __log stores the underlying history as well as the display console. 
    var __log = { history : [] 
		  , console : null } ; 
    
    var registerConsole = function(elt) {
	if (typeof elt === 'string') {
	    __log.console = document.getElementById(elt); 
	} else if (typeof elt === 'HTMLElement') {
	    __log.console = elt; 
	} else {
	    __log.console = node('div');
	}
    }; 
    
    var refreshConsole = function (args) {
	if (__log.console) {
	    __log.console.innerHTML += args.join('') + '<br />'; 
	    __log.console.scrollTop = __log.console.scrollHeight; 
	}
    };
    
    var debug = {
	log : function () {
	    args = map1(debug.stringify, arguments); 
	    __log.history.push(args); 
	    refreshConsole(args); 
	}  
	
	, register : registerConsole 
	
	, stringify : function (x) {
	    if (typeof x == 'HTMLDocument') {
		return x.toString(); 
	    } else if (typeof x == 'HTMLElement') {
		return '<' + x.nodeName + ' />'; 
	    } else if (typeof(x) == 'object') {
		return JSON.stringify(x);
	    }
	    return x; 
	}
	
	, DEV : 1 
	, TEST : 2 
	, PROD : 4 
    }; 
    
    debug.MODE = debug.DEV; // can be reset elsewhere!!! 
    function defaultHandler() {return false}
    function silentHandler()  {return true}
    function customHandler(desc,page,line,chr)  {
	bzj.debug.log('JavaScript error occurred! \n'
		+'The error was handled by '
		+'a customized error handler.\n'
		+'\nError description: \t'+desc
		+'\nPage address:      \t'+page
		      +'\nLine number:       \t'+line);
	return true; 
    }
    
    window.onerror = customHandler; 
    
    // assert utility 
    var Assert = { 
	run : function (proc, msg) {
	    msg = msg || "proc failed to run"; 
	    if (!proc()) {
		throw new Error(msg); 
	    }
	}
	
	, exists : function (obj, key, msg) {
	    return Assert.run(function () {
		return obj[key] !== undefined; 
	    }, msg); 
	}
	
	, notExists : function (obj, key, msg) {
	    return Assert.run(function () {
		return obj[key] === undefined; 
	    }, msg); 
	}
    }; 
    
    /**********************************************************************/
    // string utilities. 
    /**********************************************************************/
    function trim ( s ) {
	return s.replace(/^\s+/, '').replace(/\s+$/, ''); 
    }
    
    // http://blog.stevenlevithan.com/archives/cross-browser-split
    // it turns out that IE does not capture the delimiters when using string.split... 
    // http://blog.stchur.com/2007/03/28/split-broken-in-ie/ - see the comment's version 
    var split = 'a~b'.split(/(~)/).length == 3 // if it returns the delimiter then it's fine.
	? function (s, delim) {
	    delim = delim || /\s+/; 
	    return s.split(delim); 
	} : function (s, delim) { // for IE and others that do not capture the delimiter.
	    delim = delim || /\s+/; 
	    if (typeof delim === 'string') {
		return s.split(delim); 
	    } else { // assuming it is regex.
		var out = [] , start = 0 , i = 0; 
		var re = new RegExp(delim.source
				    , 'g' 
				    + (delim.ignoreCase ? 'i' : '')
				    + (delim.multiline ? 'm' : '')); 
		var match; 
		while (match = re.exec(s)) { 
		    out.push(s.slice(start, match.index)); 
		    if (match.length > 1) { 
			out.push(match[1]); 
		    }
		    start = re.lastIndex; 
		    i++; 
		}
		if (start <= s.length) {
		    out.push(s.slice(start));
		}
		return out; 
	    }
	}; 
    
    function streq (s1 , s2, ci) {
	ci = ci === false ? false : true; 
	if (!s1 || !s2) 
	    return false; 
	if (ci) {
	    s1 = s1.toLowerCase(); 
	    s2 = s2.toLowerCase(); 
	}
	return s1 === s2; 
    }
    
    
    /**********************************************************************/
    // ArrayLike
    // http://www.kenegozi.com/blog/2009/04/13/javascript-and-the-extended-array-prototype.aspx
    /**********************************************************************/
    var ArrayLike = Class({
	setup : function(ary) {
	    ary = ary || []; 
	    this.concat(ary); 
	    return this; 
	}
	
	, each : function (proc, ary) {
	    ary = ary || this; 
	    for (var i = 0; i < ary.length; ++i) {
		proc(ary[i]); 
	    }
	    return this; 
	}
	
	, map : function (proc, ary) {
	    return bzj.map1(proc, ary || this); 
	}
	
	, concat : function(ary) {
	    var self = this; 
	    this.each (function (v) {
		self.add1(v); 
	    }, ary); 
	    return this; 
	}
	
	, add1 : function (v) {
	    this[this.length++] = v; 
	}

	, push : function() {
	    this.concat(arguments); 
	    return this; 
	}
	
	, pop : function() { // what about shift??? this would be *hard*... 
	    var out = this[this.length--]; 
	    delete this[this.length]; 
	    return out; 
	}
	
	, get : function (ary) {
	    ary = ary || this; 
	    return Array.prototype.slice.call(ary); 
	}
	
    } , { 
	length : 0 
    } , {
    }); 
    
    /**********************************************************************/
    // Registry. 
    /**********************************************************************/
    var Registry = Class( {
	init : function () {
	    this.registry_ = {}; 
	}
	
	, register : function (name, process) {
	    this.registry_[name] = process; 
	}
	
	, unregister : function (name) {
	    delete this.registry_[name]; 
	}
	
	, setup : function ( options ) {
	    extend(this.registry_, options); 
	} 
	
	, ref : function (name) {
	    return this.registry_[name]; 
	}
	
	, keys : function () {
	    return keys(this.registry_); 
	}
    } ); 

    /**********************************************************************/
    // ArrayRegistry. 
    /**********************************************************************/
    
    var ArrayRegistry = Class ( {
	$base : Registry  
	
	, init : function () {
	    this.registry_ = []; 
	}
	
	, setup : function (ary) {
	    this.registry_ = this.registry_.concat(ary); 
	}
	
	, register : function (key, val) {
	    this.registry_.push([ key , val ]); 
	}
	
	, _key : function (i) {
	    return this.registry_[i][0]; 
	}
	
	, _value : function (i) {
	    return this.registry_[i][1];
	}
	
	, compKey : function (i, key) {
	    return this._key(i) == key; 
	}
	
	, unregister : function (key) {
	    for (var i = 0; i < this.registry_.length; ++i) {
		if (this.compKey(i, key)) {
		    this.registry_.splice(i, 1); 
		    break;
		}
	    }
	}
	
	// test whether a particular regex has already been matched. 
	// this is not really needed to be used in general. 
	, ref : function (key) {
	    for (var i = 0; i < this.registry_.length; ++i) {
		if (this.compKey(i, key))
		    return this._value(i); 
	    }
	    return undefined; 
	}
	
	, keys : function () {
	    var out = []; 
	    return bzj.each(function (i, pair) {
		out.push(this._key(i)); 
	    }, this.registry_); 
	    return out; 
	}
    });
    
    /**********************************************************************/
    // export from the core class!    
    /**********************************************************************/
    extend(bzj, { agent : agent 
		  , attr : attr 
		  , uri : uri
		  , timestamp : timestamp 
		  , identity : identity 
		  , map1 : map1 
		  , merge : merge 
		  , extend : extend 
		  , memberof : memberof 
		  , keys : keys 
		  , values : values 
		  , each : each 
		  , Class : Class 
		  , makeFactory : makeFactory
		  , singleton : singleton 
		  , $slice : $slice
		  , $push : $push 
		  , fastUnique : fastUnique
		  , safeUnique : safeUnique 
		  , unique : unique 
		  , flatten : flatten 
		  , filter : filter 
		  , array2hash : array2hash 
		  , isArray : isArray 
		  , isa : isa 
		  , debug : debug 
		  , assert : Assert 
		  , trim : trim 
		  , split : split 
		  , streq : streq 
		  , $A : ArrayLike // makeFactory(ArrayLike) 
		  , registry : Registry 
		  , arrayRegistry : ArrayRegistry 
		}); 

})(); 



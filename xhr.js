/*
 * xhr.js - the API for XMLHttpRequest manipulation. 
 * 
 * the goal is to make it compatible with jQuery's API. 
 */
(function () {
    var Xhr = bzj.Class({
	init : function () {
	    this.inner = Xhr.make(); 
	}
	
	, setup : function (make) {
	    this.inner = make(); 
	    return this; 
	}
	
	, call : function (params) {
	    params = bzj.merge({ method : 'get' , async : true } 
			       , params || {} 
			       , false ); 
	    var method = params.method; 
	    var url = params.url; 
	    var async = params.async; 
	    var login = params.login; 
	    var password = params.password; 
	    var timeout = params.timeout || Xhr.TIMEOUT ; 
	    this.cache = params.cache === false ? false : Xhr.cache; 
	    this.open(method, url, async, login, password); 
	    this.setHeaders(params.headers); 
	    this.setupCallback(async, params.ok , params.fail); 
	    this.send(params.data || null, timeout); 
	}
	
	, open : function (method, url, async, login, password, cache) {
	    if (typeof (url) == 'string') { 
		url = bzj.uri.parse(url); 
	    }
	    if (!this.cache) { // cache busting when this.cache is false.
		url.query[bzj.timestamp()] = 1; 
	    }
	    url = bzj.uri.encode(url); 
	    bzj.debug.log('xhr.open: url: ', url); 
	    if (login && password) {
		this.inner.open(method, url, async, login, password); 
	    } else {
		this.inner.open(method, url, async); 
	    }
	}
	
	// headers are an object with key/values, where value can be string or array. 
	, setHeaders : function (headers) {
	    headers = headers || {}; 
	    var self = this; 
	    bzj.each (function (key, value) {
		if (value instanceof Array) {
		    for (var i = 0; j < value.length; ++i) {
			self.setHeader(key, value[i]); 
		    }
		} else {
		    self.setHeader(key, value); 
		}
	    }, headers); 
	}
	
	, setHeader : function (name, value) {
	    this.inner.setRequestHeader(name, value); 
	}
	
	, setupCallback : function (async, ok, fail) {
	    if (async) {
		this.inner.onreadystatechange = this.makeCallback(ok, fail); 
	    }
	}
	
	, makeCallback : function (ok, fail) {
	    var self = this; 
	    self.ok = ok; 
	    self.fail = fail; 
	    return function (evt) {
		bzj.debug.log('xhr.callback: ', self.inner.readyState); 
		// firefox XHR post requires the response's content-length to be exact 
		// or it will halt until aborted if the response is smaller than the 
		// content length (not sure if it will truncate if it's larger). 
		if (self.inner.readyState == Xhr.READY_STATE.COMPLETED) {
		    if (self.timeoutID) {
			clearInterval(self.timeoutID); 
		    }
		    if (self.inner.status == 200) { 
			ok(self.inner.responseText); 
		    } else {
			fail(self.inner.responseText); 
		    }
		} 
	    }; 
	}
	
	, send : function (value, timeout) {
	    // when we send - we also will start the countdown... 
	    // what do we do??? 
	    // the timeout says that 
	    // we will clear the timeout 
	    var self = this; 
	    value = typeof (value) == 'string' ? value 
		: bzj.uri.encodeQuery(value); 
	    self.inner.send(value); // need to serialize the value!!! 
	    if (timeout !== 0) {
		self.timeoutID = setInterval(function () {
		    if (self.inner.readyState != Xhr.READY_STATE.COMPLETED) {
			// we will abort here...
			self.inner.abort();
			// will call fail! now we gotta get these things straight!! 
			self.fail.call(self, 'aborted'); 
		    }
		}, timeout); 
	    }
	}
	
    } , { 
	
    } , { 
	// /* 
	make : window.XMLHttpRequest 
	    && (window.location.protocol !== 'file' || !window.ActiveXObject) // IE's XMLHttpRequest does not work well with file protocol 
	    ? function () {
		return new XMLHttpRequest(); 
	    } : function () {
		return new ActiveXObject('Microsoft.XMLHTTP'); 
	    } // */
	
	, TIMEOUT : 6000 /* is this too generous? IE 8 has its own timeout mechanism */ 
	
	, READY_STATE : {
	    UNINITIALIZED : 0 
	    , OPENED : 1 
	    , SENT : 2 
	    , RECEIVING : 3 
	    , COMPLETED : 4 
	}
	
	, cache : (bzj.debug.MODE === bzj.debug.PROD 
		   && bzj.agent.browser == 'msie') 
	
	, call : function ( params ) {
	    var xhr = new Xhr(); 
	    xhr.call(params); 
	}
	
	/* 
	 * what should the parameters be for load? 
	 * the first one should be URL... 
	 * the second one should be success callback... 
	 */ 
	, load : function (elt, url, ok) {
	    ok = ok || function () {} ; 
	    
	    Xhr.call({ method : 'get' 
		       , url : url 
		       , ok : function (text) {
			   if (elt) {
			       elt.innerHTML = text; 
			       ok(text); 
			   } else {
			       ok(text); 
			   }
		       } 
		       , fail : function (text) {
			   alert('failed: ' + text); 
		       } } ); 
	}
    }); 
    
    bzj.extend(bzj, { xhr : Xhr }); 
})(); 


(function () {    
    var Timer = bzj.Class({
	setup : function (callback, interval, start) {
	    this.callback = callback || this.callback; 
	    this.interval = interval || this.interval; 
	    if (start)
		this.start(); 
	    return this; 
	}
	, start : function() {
	    var self = this; 
	    self.id = setInterval(self.callback, self.interval); 
	}
	, started : function() {
	    return this.id ? true : false ; 
	}
	, stop : function () {
	    if (this.id)
		clearInterval(this.id);
	    this.id = null; 
	}
    } , { callback : function () {} 
	  , interval : 1000 
	  , id : null } ); 
    
    var CountDown = bzj.Class({
	setup : function (args) {
	    bzj.debug.log('countdown ctor ', args);
	    this.total = args.total || 10; 
	    this.count = this.total; 
	    this.progress = args.progress || function () {}; 
	    this.done = args.done || function () {} ; 
	    this.timer = new Timer(this.makeCallback(), 1000, args.start || false); 
	    bzj.debug.log('countdown ctor done: ', this); 
	    return this; 
	}
	, makeCallback : function () {
	    var self = this; 
	    return function(timer) {
		if (self.count == 0) {
		    self.timer.stop();
		    self.done(self); 
		} else {
		    self.progress(self); // how to get this error to throw *correctly*. 
		    self.count--;
		}
	    }; 
	} 
	, start : function () {
	    var self = this; 
	    self.progress(self); 
	    self.count--; 
	    self.timer.start(); 
	} 
	, pause : function () {
	    this.timer.stop(); 
	}
	, stop : function () {
	    this.pause(); 
	    this.count = this.total; 
	}
	, started : function () {
	    if (this.timer.started())
		return true; 
	    if (this.count < this.total && this.count > 0) 
		return ture; 
	    return false; 
	}
    }); 
    
    bzj.extend(bzj, 
	       { timer : bzj.makeFactory(Timer)
		 , countDown : bzj.makeFactory(CountDown) }); 
}) (); 

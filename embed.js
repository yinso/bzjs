// right now it is still unclear on how I should be loading these modules... 

(function () {
    // there are quite a few things about this module that should be modified... 
    // 1 - use an elt function to create an element... 
    // 2 - the type needs to be *auto detected*... 
    var Embed =bzj.Class({
	setup : function(attrs) {
	    this.sound = bzj.node.make('embed'
				       , merge({ loop : false 
						 , type : 'audio/mpeg'
						 , autostart : this.started 
						 , style : 'width: 0px; height: 0px' }
					       , attrs)); 
	    return this; 
	}
	
	, play : function () {
	    try {
		this.sound.Play();
	    } catch ($e) {
		this.sound.DoPlay(); 
	    }
	    this.started = true; 
	}
	
	, stop : function () {
	    if (this.started) {
		try { 
		    this.sound.Stop(); 
		} catch ($e) {
		    this.sound.DoStop(); 
		}
	    }
	}
	
	, remove : function () {
	    document.body.removeChild(this.sound); 
	}
    } , { 
	started : false 
    });
    
    bzj.extend(bzj, { embed : bzj.makeFactory(Embed, 2) }); 
    
})(); 

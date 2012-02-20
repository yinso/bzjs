bzj.upload = function ( options ) {
    options = bzj.merge( options || {} , 
			 { ok : function (result) {
			     alert(result); 
			 } 
			   , command : '**upload' 
			 }); 
    var callback = options.ok; 
    var iframeName = 'this-is-a-test-iframe'; 
    var upload = function (evt) {
	// a file object will cause the upload to use iframe instead of xhr.
	// what it means is that we cannot have a fragment of a form in this case
	// it must be a full form...!! 
	var dialog = this; 
	var form = this.hasForm; 
	var iframe = bzj.node.make('iframe'
				   , { id : iframeName , name : iframeName , parent : form  
				       , width : 200 , height : 200 }); 
	// http://forums.devx.com/showthread.php?threadid=133717
	// solves the problem of IE6/7 opening window instead of targeting the iframe
	// the contentWindow's name must be set (instead of just the iframe's name... confusing!) 
	if (iframe.contentWindow.name != iframeName) { 
	    iframe.contentWindow.name = iframeName; 
	}
	form.target = iframeName; 
	bzj.$(iframe).load(function (evt) {
	    var result = JSON.parse(bzj.node.text(iframe.contentWindow.document.body)); 
	    // remove & readd the iframe stops the browser from continue to spin... the spinning is seriously annoying. 
	    // http://stackoverflow.com/questions/852605/browser-continues-loading-after-ajax-request-finishes
	    form.removeChild(iframe); 
	    form.appendChild(iframe); 
	    form.removeChild(iframe); 
	    dialog.close(); 
	    callback(result); 
	    return true; 
	}); 
	return true; 
    }; 
    options = bzj.merge( options || {} 
			 , { 
			     url : '/dialog/upload' 
			     , modal : true 
			     , escape : true 
			     , commands : { 
				 upload : upload 
				 , cancel : function (evt) {
				     this.close(); 
				 }
			     } 
			 } ); 
    options.commands[options.command] = options.commands.upload; 
    Dialog.open( options ); 
}; 

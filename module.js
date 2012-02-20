(function () {
    /**********************************************************************/
    // dependency management
    // each load will have a onload call... that does the following 
    // 1 - check for dependency... this is not possible - it must be passed in
    // 
    /**********************************************************************/

    var __result = {}; // stores the results from each of the scripts being loaded
    
    // the available opts are
    // url => a string or an url object 
    // ok => the success callback 
    // fail => the error callback
    // cache => whether the script result should be cached...
    // keep => whether to keep the script element, default false. 
    // depends => a list of dependent values that we wait for before concluding the call. 
    var normalizeScriptOption = function (opt) {
	var url = (opt.url instanceof Object) ? bzj.uri.encode(opt.url) : opt.url; 
	return { url : url 
		 , ok : opt.ok || function () {} 
		 , fail : opt.fail || function () { throw "load script failed"; }
		 , cache : opt.cache || true 
		 , id : opt.id || url 
		 , keep : opt.keep || false 
		 , depends : opt.depends || [] }; 
    }; 
    
    var script = function (opt) {
	opt = normalizeScriptOption(opt); 
	if (__result[opt.id] && opt.cache) { 
	    // already loaded do nothing... 
	} else {
	    debug.log('>script: ' , opt.id); 
	    var head = document.getElementsByTagName('head')[0]; 
	    var script = document.createElement('script'); 
	    setupCallback(head, script, opt.id, opt.depends, opt.ok, opt.fail, opt.keep); 
	    script.type = 'text/javascript';
	    script.src = opt.url;
	    script.id = opt.id; 
	    head.appendChild(script); 
	    return opt.id; 
	}
    }; 
    
    var setupCallback = function (head, script, id, depends, ok, fail, keep) {
	if (bzj.agent.browser == 'msie') {
	    script.onreadystatechange = function() {
		if (/loaded|complete/.test(script.readyState)) {
		    bzj.debug.log('onload: ', id); 
		    setupAndResolveDependency(id, depends, ok, fail); 
		    script.onreadystatechange = null; 
		    if (!keep)
			head.removeChild(script); 
		}
	    }; 
	} else {
	    script.onload = function () {
		bzj.debug.log('onload: ', id); 
		setupAndResolveDependency(id, depends, ok, fail); 
		if (!keep) 
		    head.removeChild(script); 
	    }; 
	    script.onerror = function () {
		fail(); 
		if (!keep)
		    head.removeChild(script); 
	    }; 
	}
    }; 
    
    var target2Depend = function(target) {
	var dep = normalizeScriptOption(target); 
	return dep.id; 
    }; 
    
    var loadScripts = function(id, targets, opt) {
	var depends = bzj.map1(script, targets); 
	var ok = opt.ok || function () {}; 
	var fail = opt.fail || function () { throw 'script ' + id + ' failed to load'; }; 
	setupAndResolveDependency(id, depends, ok, fail); 
    }; 
    
    // is this the next thing to do? to load multiple scripts?? 
    // the multiple scripts only share the callbacks... 
    // it seems that in order to do this correctly I will have to have a 
    // dependency manager already!!. 
    var __depends = {}; 
    var __dependOrder = []; 
    
    // any script need to be able to handle the dependencies!!! 
    // because it might have inner embedded require or script call... 
    var setupAndResolveDependency = function (id, depends, ok, fail) {
	if (!__result[id]) { 
	    var dep = bzj.merge((__depends[id] || {}) 
				, { id : id 
				    , depends : depends 
				    , ok : ok 
				    , fail : fail }); 
	    if (!__depends[id]) 
		__dependOrder.push(id); 
	    __depends[id] = dep; 
	    bzj.debug.log('setup dep: ', id, ', ', JSON.stringify(dep)); 
	    resolveDependency(dep); 
	} 
    }; 
    
    var resolveDependency = function (dep) {
	if (dep && !__result[dep.id]) {
	    bzj.debug.log('Resolving: ', JSON.stringify(dep));
	    if (resolveParentDependency(dep)) {
		resolveSelf(dep); 
		resolveChildren(dep); 
	    }
	}
    }; 
    
    var resolveParentDependency = function (dep) {
	for (var i = 0; i < dep.depends.length; ++i) {
	    if (__result[dep.depends[i]] == undefined) {
		return false; 
	    }
	}
	return true; 
    }; 
    
    var resolveSelf = function(dep) {
	// time to call the success... 
	var args = bzj.map1(retrieve, dep.depends); 
	var result = dep.ok.apply(this, args); 
	bzj.debug.log('resolved: ', dep.id, ' => ', __result[dep.id]); 
    }; 
    
    var dependsOn = function (child, parent) {
	for (var i = 0; i < child.depends.length; ++i) {
	    if (child.depends[i] == parent.id) 
		return true; 
	}
	return false; 
    }; 
    
    var resolveChildren = function (parent) {
	// we are going backwards on the dependOrder because 
	// of the FIFO principle - the first one in is the last one 
	// that need to be resolved. 
	for (var i = __dependOrder.length - 1; i >= 0; --i) {
	    var id = __dependOrder[i]; 
	    var child = __depends[id]; 
	    if (child != parent && dependsOn(child, parent)) {
		resolveDependency(child); 
	    }
	}
    }; 
    
    var provide = function(id, result) {
	__result[id] = result; 
    }
    
    var retrieve = function(id) {
	if (!__result[id]) {
	    throw "retrieve " + id + " failed"; 
	}
	return __result[id]; 
    }; 
    
    // converting the module to the underlying 
    // url/id... 
    var name2depend = function(name) {
	return { url : { path : '/js'
			 , query : { s : name.replace(/\./g, '/') + '.js' } 
		       } 
		 , id : name }; 
    }; 
    
    var module = function (name, depends, callback) {
	loadScripts(name, bzj.map1(name2depend, depends), 
		    { ok : 
		      function () {
			  provide(name, callback.apply(this, arguments)); 
		      } 
		    }); 
    }; 
    
    bzj.extend(bzj, { script : script 
		      , loadScripts : loadScripts 
		      , module : module 
		      , provide : provide 
		      , retrieve : retrieve }); 

})(); 

var EasyXML = {
    toString : bzj.agent.browser == 'msie' 
	? function (xml) {
	    return xml.xml; 
	} : function (xml) {
	    return (new XMLSerializer).serializeToString(xml); 
	}
}; 


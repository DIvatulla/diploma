class query{
	constructor(name, value){
		this.name = name;
		this.value = value;
	}
}

class url_data{
	constructor(location, queries){
		this.location = location;
		this.queries = queries;	
	}

	find_query(name){
		var i = 0;

		if (this.queries !== null){
			for (i = 0; i < this.queries.length; i++){
				if (this.queries[i].name === name){
					return this.queries[i].value;
				}
			} 
		}

		return null;
	}
}

function argument_check(urlStr){
	if (typeof(urlStr) !== 'string'){
		throw new Error('Url is not a string');
	}	
	if (urlStr.length < 1){
		throw new Error('Url is too short');
	}
}


function parse_location(urlStr){
	var i = 0;
	var path = [];
	var buf = '';

	for (i = 1; i < urlStr.length; i++){
		if (urlStr[i] === '?'){
			break;
		}
		else if (urlStr[i] === '/'){
			path.push(buf);
			buf = '';
		}
		else{
			buf = buf + urlStr[i];
		}
	}

	if (buf.length > 0){
		path.push(buf);
	}
	
	return path;
}

function get_query_pos(urlStr){
	var i = 0;
	
	for (i = 0; i < urlStr.length; i++){
		if (urlStr[i] === '?'){
			return i+1;
		}
	}

	return 0;
}

function parse_queries(urlStr){
	var i = 0;
	var pos = 0;
	var lexBuf = '';
	var queryBuf = '';
	var queries = [];		

	pos = get_query_pos(urlStr);
	if ((pos === 0) || (pos === urlStr.length)){
		return queries;
	}		
	
	queryBuf = new query('','');	
	for (i = pos; i < urlStr.length; i++){
		switch (urlStr[i]){
			case '=':
				queryBuf.name = lexBuf;
				lexBuf = '';
				continue;
				break;	
			case '&':
				queryBuf.value = lexBuf;
				lexBuf = '';
				queries.push(queryBuf);
				queryBuf = new query('', '');
				continue;
				break;	
			default:
				lexBuf = lexBuf + urlStr[i];
		}
	}

	queryBuf.value = lexBuf;
	queries.push(queryBuf);

	return queries;
} 

exports.parse = function(urlStr){
	var lArr = [];
	var qArr = [];
	var obj = {};

	lArr = parse_location(urlStr);
	qArr = parse_queries(urlStr);

	obj = new url_data(lArr, qArr);
	
	return obj;
}

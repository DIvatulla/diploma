const stack = require('./stack');

function is_whitespace(chr){
	return ((chr === ' ') || (chr === '\r') 
			|| (chr === '\t') || (chr === '\n'));
}

class xml_node{
	constructor(tag, content){
		this.tag = tag;
		this.content = content;
		this.children = [];
	}
}

class xml_stack extends stack{
	constructor(){
		super();
		super.push(new xml_node('root', ''));
	}

	#remove(tag){
		tag = tag.slice(1);
		if (tag === this.head.data.tag){
			super.pop();
		} 
		else{
			throw new Error('Improperly closed/opened tag' +
					JSON.stringify({'tag': this.head.data.tag}));
		}
	}

	add(tag){
		var tmp = {};

		if (tag[0] === '/'){
			this.#remove(tag);
		}
		else{
			tmp = new xml_node(tag, '');
			this.head.data.children.push(tmp);
			super.push(tmp);
		}
	}
}

class xml_parser{
	constructor(xmlDoc){
		this.doc = xmlDoc;
		this.pos = 0;
		this.lexBuf = '';
		this.xmlNodeBuf = [];
		this.xmlNodeStack = new xml_stack();
	}
	
	#skip_whitespace(){
		while (is_whitespace(this.doc[this.pos])){
			this.pos++;

			if (this.pos > this.doc.length){
				throw new Error('Empty xml');				
			}
		}
	}

	#read_tag(){
		this.lexBuf = '';
		this.pos++;
		
		while (this.doc[this.pos] !== '>'){
			this.lexBuf = this.lexBuf + this.doc[this.pos];
			this.pos++;	
			
			if (this.pos > this.doc.length){
				throw new Error('Unclosed tag in the document' + 
						JSON.stringify({'tag':this.xmlNodeStack.head.data.tag}));
			}	
		}
	}

	#read_content(){
		this.lexBuf = '';
		
		if (this.pos === 0){
			throw new Error('Content outside of root tag');
		}

		while (this.doc[this.pos] !== '<'){
			if (is_whitespace(this.doc[this.pos]) === false){
				this.lexBuf = this.lexBuf + this.doc[this.pos];
			}
			this.pos++;	
			
			if (this.pos >= this.doc.length){ 
				return;
			}	
		}
	}

	parse(){
		while (this.pos < this.doc.length){
			this.#skip_whitespace();
	
			if (this.doc[this.pos] === '<'){
				this.xmlNodeBuf.push(this.xmlNodeStack.head.data);
				this.#read_tag();
				this.xmlNodeStack.add(this.lexBuf);
			}				
			else{
				this.#read_content();
				this.pos--;
				this.xmlNodeStack.head.data.content = this.lexBuf;	
			}
			this.pos++;
		}

		if (this.xmlNodeStack.head.next !== null){
			throw new Error('Unclosed tag in the document ' + 
					JSON.stringify({'tag':this.xmlNodeStack.head.data.tag}));
		}
		if (this.xmlNodeStack.head.data.children.length > 1){
			throw new Error('More than one root tag in the document');
		}
		
		this.xmlNodeStack.pop();	
		return this.xmlNodeBuf[this.xmlNodeBuf.length-1];
	}
}

class xml_generator{
	constructor(xmlRootNode){
		this.tree = xmlRootNode;
		this.doc = '';
	}

	add_tabulation(str, n){
		var tmp = str;
		var i = 0;
		
		for (i = 0; i < n; i++){
			tmp = '\t' + tmp;
		}

		return tmp;
	}

	get_open_tag(tag, n){
		return this.add_tabulation(('<' + tag + '>'), n);
	}

	get_close_tag(tag, n){
		return this.add_tabulation(('</' + tag + '>'), n);
	}

	xml_node_tree_traverse(node, depth){
		var i = 0;
		
		if (node === undefined){
			return;
		}
		else{
			this.doc = this.doc + this.get_open_tag(node.tag, depth) + '\n';

			for (i = 0; i <= node.children.length; i++){
				this.xml_node_tree_traverse(node.children[i], depth+1);
			}
			
			if (node.content.length > 0){
				this.doc = this.doc +
				this.add_tabulation(node.content, depth+1) + '\n';
			}			
		}	
		
		this.doc = this.doc + this.get_close_tag(node.tag, depth) + '\n';
	}

	generate(){
		this.xml_node_tree_traverse(this.tree, 0);
		return this.doc;
	}
}

exports.parse = function(xmlDoc){
	var xml_parser_object = {};
	
	if (typeof(xmlDoc) !== 'string'){
		throw new Error('Type error, not a string');
	}
	if (xmlDoc.length  === 0){
		throw new Error('Empty xml');
	}

	xml_parser_object = new xml_parser(xmlDoc);
	return xml_parser_object.parse();
}

exports.generate = function(xmlNode){
	var xml_generator_object = {};
	if (xmlNode.constructor.name !== 'xml_node'){
		throw new Error('XML generation requires xml-node tree');
	}
	
	xml_generator_object = new xml_generator(xmlNode);	
	return xml_generator_object.generate();
}

exports.mknode = function(tag, content){
	if ((typeof(tag) !== 'string') || (typeof(content) !== 'string')){
		throw new Error('STRING!!!');
	} 

	return new xml_node(tag, content);
}

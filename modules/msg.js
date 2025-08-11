const xml = require('./xml');

class validation_status{
	constructor(res, descr){
		this.res = res;
		this.descr = descr;
	}
}

class msgv{
	constructor(){
		this.table = [];
		this.status = new validation_status(true, '');	
	}

	set_validation_table(dataType){
		this.table.push(['data'], [dataType], ['name']);

		switch (dataType){
			case 'camera':
				this.table[2].push('rtsp', 'category');
				break;
			case 'category':
				break;
			case 'user':
				this.table[2].push('password', 'role');
				break;
			default:
				this.table = null;
		}
	}

	node_check(node, depth){
		var i = 0;

		if ((this.table[depth] === undefined) || (this.table[depth].length === 0)){
			this.status.res = false;
			this.status.descr = 'Unknown tag: ' + node.tag;	
		}			
		else{
			for (i = 0; i < this.table[depth].length; i++){
				if (node.tag === this.table[depth][i]){
					this.table[depth].splice(i, 1);
					this.status.res = true;
					return;
				}
			}

			this.status.res = false;
			this.status.descr = 'Unknown tag: ' + node.tag;
		}
	}

	recursive_validation(node, depth){
		var i = 0;
		
		if (node === undefined){
			return;
		}
		else{
			this.node_check(node, depth);
			if (this.status.res === true){
				for (i = 0; i <= node.children.length; i++){ 
					this.recursive_validation(node.children[i], depth+1);
				}
			}
			else{
				return;
			}
		}
	}

	absence(){
		var i = 0;

		for (i = 0; i < this.table.length; i++){
			if (this.table[i].length > 0){
				this.status.res = false;
				this.status.descr = 'No required tag: ' + this.table[i][0];
			}	
		} 
	}
}

exports.validate = function(root, dataType){
	var xmlSemanticValidator = new msgv();

	xmlSemanticValidator.set_validation_table(dataType);
	if (xmlSemanticValidator.table === null){
		xmlSemanticValidator.status.res = false;
		xmlSemanticValidator.status.descr =	'Unknown type of data - '+
											dataType; 	
	}

	xmlSemanticValidator.recursive_validation(root, 0);
	if (xmlSemanticValidator.status.res){
		xmlSemanticValidator.absence();
	}

	return xmlSemanticValidator.status;
}

function check_value_type(head, value){
	switch(typeof(head)){
		case 'object':
			if(head.data === null){
				return true;
			}
			else if
			(head.data.constructor.name === value.constructor.name){
				//this function checks if item has 
				//the same class as all other
				//stack items
				return true;
			}
			else{
				return false;
			}
		default:
			if (typeof(head.data) === typeof(value)){
				return true;
			}
			else{
				return false;
			}
	}
}

class stack_item{
	constructor(data){
		this.data = data;
		this.next = null;
	}
}

class stack{
	constructor(){
		this.head = null;
	}
	
	push(value){
		var tmp = {};

		if(this.head === null){
			this.head = new stack_item(value);
		}
		else if(check_value_type(this.head, value)){
			tmp = new stack_item(value);	
			tmp.next = this.head;
			this.head = tmp;
		}
		else{
			throw new Error('invalid data type to put in stack');
		}
	}

	pop(){
		var tmp = {};

		if (this.head === null){
			return;
		}
		tmp = this.head.next;

		this.head.data = null;
		this.head = null;
		
		this.head = tmp;
	}

	print(){
		var tmp = {};

		tmp = this.head;
		while (tmp !== null){
			console.log(tmp.data);
			tmp = tmp.next;
		}
	}

}

module.exports = stack;

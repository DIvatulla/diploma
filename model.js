const Database = require('better-sqlite3');

class db{
	constructor(){
		this.client = new 
		Database('./data.db',{ verbose: console.log });

		this.query = {};
	}
	
	prepare(queryStr){
		this.query = this.client.prepare(queryStr);
	}
	
	close(){
		this.client.close();
	}
}

function select_camera(info, adapter){
	if ((info['id'] === null) && (info['category'] === null)){
		adapter.prepare('SELECT * FROM Cameras');
		return adapter.query.all();
	}
	if ((info['id'] === null) && (info['category'] !== null)){
		adapter.prepare('SELECT * FROM Cameras WHERE Category=?');
		return adapter.query.get(info['category']);
	}
	if ((info['id'] !== null) && (info['category'] === null)){
		adapter.prepare('SELECT * FROM Cameras WHERE ID=?');
		return adapter.query.get(info['id']);
	}

	adapter.prepare('SELECT * FROM Cameras WHERE ID=? AND Category=?');
	return adapter.query.get(info['id'], info['category']);
}

function select_category(info, adapter){
	if (info['id'] === null){
		adapter.prepare('SELECT * FROM Categories');	
		return adapter.query.all();
	}
	else{
		adapter.prepare('SELECT * FROM Categories WHERE ID=?');
		return adapter.query.get(info['id']);
	}
}

function select_user(info, adapter){
	if (info['id'] === null){
		adapter.prepare('SELECT ID, Name FROM Users');
		return adapter.query.all();
	}
	else{
		adapter.prepare('SELECT ID, Name FROM Users WHERE ID=?');
		return adapter.query.get(info['id']);
	}
}

function select_role(info, adapter){
	if (info['role'] === null){
		adapter.prepare('SELECT * FROM Roles');
		return adapter.query.all();
	}
	else{
		adapter.prepare('SELECT * FROM Roles WHERE Name=?');
		return adapter.query.get(info['role']);
	}
}

function select_stream(info, adapter){
	if (info['id'] === null){
		adapter.prepare('SELECT * FROM Stream');
		return adapter.query.all();
	}
	else{
		adapter.prepare('SELECT * FROM Stream WHERE Camera=?');
		return adapter.query.get(info['id']);
	}
}

function select_archive(info, adapter){
	if (info['id'] === null){
		adapter.prepare('SELECT * FROM Archive');
		return adapter.query.all();
	}
	else{
		adapter.prepare('SELECT * FROM Archive WHERE Camera=?');
		return adapter.query.get(info['id']);
	}
}

exports.select = function(type, info){
	var db_interface = new db();
	var data = [];
	var tmp = {};
	
	switch (type){
		case 'camera':
			tmp = select_camera(info, db_interface);	
		break
		case 'category':
			tmp = select_category(info, db_interface);
		break
		case 'user':
			tmp = select_user(info, db_interface);
		break;
		case 'role':
			tmp = select_role(info, db_interface);
		break
		case 'stream':
			tmp = select_stream(info, db_interface);
		break
		case 'archive':
			tmp = select_archive(info, db_interface);
		break
		default:
			throw new Error('Unknown type');	
	}		
	
	if (tmp !== undefined){
		if (tmp.constructor.name === 'Array'){
			data = tmp;
		}
		else{
			data.push(tmp);
		}
	}

	db_interface.close();	
	return data;
}

function insert_camera(info, adapter){
	adapter.prepare
	('INSERT INTO Cameras (Name,rtsp,Category) VALUES (?,?,?)');
	return adapter.query.run(info['name'], info['rtsp'], info['category']);
}

function insert_category(info, adapter){
	adapter.prepare('INSERT INTO Categories (Name) VALUES (?)');
	return adapter.query.run(info['name']);
}

function insert_user(info, adapter){
	adapter.prepare
	('INSERT INTO Users (Name, Password, Role) VALUES (?,?,?)');
	return adapter.query.run(info['name'], info['password'], info['role']);
}

function insert_stream(info, adapter){
	adapter.prepare('INSERT INTO Stream (Camera, PID) VALUES (?,?)');
	return adapter.query.run(info['id'], info['pid']);
}

function insert_archive(info, adapter){
	adapter.prepare('INSERT INTO Archive (Camera, PID) VALUES (?,?)');
	return adapter.query.run(info['id'], info['pid']);
}

exports.insert = function(type, info){
	var db_interface = new db();
	var tmp = {};

	if (info === undefined){
		throw new Error('No information about resource to create');
	}

	switch (type){
		case 'camera':
			tmp = insert_camera(info, db_interface);
		break
		case 'category':
			tmp = insert_category(info, db_interface);
		break
		case 'user':
			tmp = insert_user(info, db_interface);
		break
		case 'stream':
			tmp = insert_stream(info, db_interface);
		break
		case 'archive':
			tmp = insert_archive(info, db_interface);
		break
		default:
			throw new Error('Unknown resource');
	}
	
	db_interface.close();	
	return tmp;
}

function remove_camera(info, adapter){
	adapter.prepare('DELETE FROM Cameras WHERE ID=?');	
	return adapter.query.run(info['id']);
}

function remove_category(info, adapter){
	adapter.prepare('DELETE FROM Categories WHERE ID=?');
	return adapter.query.run(info['id']);
}

function remove_user(info, adapter){
	adapter.prepare('DELETE FROM Users WHERE ID=?');
	return adapter.query.run(info['id']);
}

function remove_stream(info, adapter){
	adapter.prepare('DELETE FROM Stream WHERE Camera=?');
	return adapter.query.run(info['id']);
}

function remove_archive(info, adapter){
	adapter.prepare('DELETE FROM Archive WHERE Camera=?');
	return adapter.query.run(info['id']);
}

exports.remove = function(type, info){
	var db_interface = new db();
	var tmp = {};

	if (info === undefined){
		throw new Error('No information about resource to delete');
	}

	switch(type){
		case 'camera':
			tmp = remove_camera(info, db_interface);	
		break;
		case 'category':
			tmp = remove_category(info, db_interface);
		break;
		case 'user':
			tmp = remove_user(info, db_interface);
		break
		case 'stream':
			tmp = remove_stream(info, db_interface);
		break
		case 'archive':
			tmp = remove_archive(info, db_interface);
		break
		default:
			throw new Error('Unknown resource');
	}
	
	db_interface.close();
	return tmp;
}

function update_camera(info, adapter){
	adapter.prepare
	('UPDATE Cameras SET Name=?, rtsp=?, Category=? WHERE ID=?');
	adapter.query.run(	info['name'], info['rtsp'],
						info['category'], info['id']);
}

function update_category(info, adapter){
	adapter.prepare('UPDATE Categories SET Name=? WHERE ID=?');
	adapter.query.run(info['name'], info['id']);
}

function update_user(info, adapter){
	adapter.prepare('UPDATE Users SET Name=?, Password=? WHERE ID=?');
	adapter.query.run(info['name'], info['password'], info['id']);
}

exports.update = function(type, info){
	var db_interface = new db();

	if (info === undefined){
		throw new Error('No information about resource to update');
	}

	switch (type){
		case 'camera':
			update_camera(info, db_interface);
		break
		case 'category':
			update_category(info, db_interface);
		break
		case 'user':
			update_user(info, db_interface);
		break
		default:
			throw new Error('Unknown resource to update');
	}
}

exports.duplicate = function(type, info){
	var db_interface = new db();
	var tmp = {};

	switch (type){
		case 'camera':
			db_interface.prepare
			('SELECT * FROM Cameras WHERE Name=? AND rtsp=? AND Category=?');
			tmp = db_interface.query.get
			(info['name'], info['rtsp'], info['category']);
		break
		case 'category':
			db_interface.prepare
			('SELECT * FROM Categories WHERE Name=?');
			tmp = db_interface.query.get(info['name']);
		break;
		case 'user':
			db_interface.prepare
			('SELECT * FROM Users WHERE Name=?');
			tmp = db_interface.query.get(info['name']);	
		break
		default:
			throw new Error('Unknown data type');
	}

	return (tmp !== undefined);		
}

exports.auth = function(info){
	var db_interface = new db();
	var tmp = [];

	db_interface.prepare
	('SELECT * FROM Users WHERE Name=? AND Password=?');
	tmp = db_interface.query.get(info.name, info.password);	
	
	return tmp;
}

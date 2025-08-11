const xml = require('./modules/xml');
const url = require('./modules/url');
const msg = require('./modules/msg');
const zip = require('./modules/zip');
const model = require('./model');
const fs = require('fs');
const { spawn } = require('child_process');

function xmlNode_to_jsObj(arg){
    var i = 0;
    var obj = {};

    for (i = 0; i < arg.children.length; i++){
        obj[arg.children[i].tag] = arg.children[i].content;
    }

    return obj;
}

function jsObj_to_xmlNode(arg){
    var node = {};

    node = xml.mknode('object', '');
    for (const key of Object.keys(arg)){
        node.children.
		push(xml.mknode(key.toLowerCase(), 
		arg[key].toString().toLowerCase()));
    }

    return node;
}

class request_result{
    constructor(data, type, code){
        this.data = data;
        this.type = type;
        this.code = code;
		this.buf = [];
    }

    convert(){
		var i = 0;
        var root = xml.mknode('data', '');
        var tmp = {};
		
		if (this.buf.length > 0){
			for (i = 0; i < this.buf.length; i++){
           		tmp = jsObj_to_xmlNode(this.buf[i])
           		tmp.tag = this.type;
           		root.children.push(tmp);
			}

        	this.data = xml.generate(root);
		}
    }
}

class data_controller{
	constructor(urlObject, xmlTree){
		this.urlObject = urlObject;
		this.xmlTree = xmlTree;	
		this.result = new request_result(null, null, 0);

		this.tmpObject = {};
		this.tmpArray = [];
	}
}

class emitter extends data_controller{
	constructor(urlObject){
		super(urlObject, null);
	}

	get_camera(){
		this.tmpObject['id'] = this.urlObject.find_query('id');
		this.tmpObject['category'] = this.urlObject.find_query('category');
		this.tmpArray = model.select('camera', this.tmpObject);
	}

	get_category(){
		this.tmpObject['id'] = this.urlObject.find_query('id');
		this.tmpArray = model.select('category', this.tmpObject);
	}

	get_user(){
		this.tmpObject['id'] = this.urlObject.find_query('id');
		this.tmpArray = model.select('user', this.tmpObject);
	}

	async get_archive(){
		const date_regex = /^\d{4}-\d{2}-\d{2}$/;

		this.tmpObject['id'] = this.urlObject.find_query('id');
		this.tmpObject['date'] = this.urlObject.find_query('date');

		if (this.tmpObject['id'] === null){
			this.result.data = 'no camera id';
			this.result.code = 401;
			return;
		}
		if ((this.tmpObject['date'] !== null) && 
			(!date_regex.test(this.tmpObject['date']))){
			this.result.data = 'invalid date format';
			this.result.code = 401;
			return;
		}	

		this.result.data = await zip.get_archive(this.tmpObject);
		if (this.result.data === null){
			this.result.data = 'no archive';
			this.result.code = 404;
			return;
		}
		else{
			this.result.code = 200;
			return;
		}
	}

	async get(){
		this.result.type = this.urlObject.location[0];

		switch(this.result.type){
			case 'camera':
				this.get_camera();
			break
			case 'category':
				this.get_category();
			break
			case 'user':
				this.get_user();
			break
			case 'archive':
				await this.get_archive();
				return;
			break	
			default:
				this.result.data = 'no resource';
				this.result.code = 404;
		}	

		if (this.tmpArray.length === 0){
			this.result.data = 'no resource';
			this.result.code = 404;
		}
		else{
			this.result.buf = this.tmpArray;
			this.result.code = 200;
		}
		
		return;
	}
}

class receiver extends data_controller{
	constructor(urlObject, xmlTree){
		super(urlObject, xmlTree);
		this.ffmpeg_stream_status = {};
	}

	semantic_check(){
		this.tmpObject = msg.validate(this.xmlTree, this.result.type);

		if (this.tmpObject.res){
			this.tmpObject = xmlNode_to_jsObj(this.xmlTree.children[0]);
			return true;
		}
		else{
			this.result.data = this.tmpObject.descr;
			this.result.type = 'undefined';
			this.result.code = 400;
			return false;
		}
	}

	duplicate_check(){
		if (model.duplicate(this.result.type, this.tmpObject)){
			this.result.data = 	'this ' +
								this.result.type + 
								' resource already exists';	
			this.result.code = 409;
			return false;
		}
		else{
			return true;
		}
	}

	check_rtsp(){
		var ffprobe = {};
		var args = [];
		
		args = ['-rtsp_transport', 'tcp', this.tmpObject['rtsp']];
		ffprobe = spawn('ffprobe', args, {timeout:10000});
		
		return new Promise((resolve, reject) => {
			ffprobe.on('close', (code) => {
				console.log(code);
				resolve(code === 0);
			});
		});
	}

	make_archive(){
		var ffmpeg_archive = {};
		var filepath = '';
		var args = [];

		filepath = './archive/'+this.tmpObject['id'];
		if (!fs.existsSync(filepath)){
			fs.mkdirSync(filepath);
		}
		filepath = filepath + '/%Y-%m-%dT%H%M%S.mp4';

		args = 	['-rtsp_transport', 'tcp', '-use_wallclock_as_timestamps',
				'1', '-i', this.tmpObject['rtsp'], '-vcodec', 'copy', '-f',
				'segment', '-reset_timestamps', '1', '-segment_time', '60',
				'-segment_format', 'mp4', '-segment_atclocktime', '1', 
				'-strftime', '1', filepath];	

		ffmpeg_archive = spawn('ffmpeg', args);
		ffmpeg_archive.unref();

		this.tmpObject['pid'] = ffmpeg_archive.pid;
		model.insert('archive', this.tmpObject);		
	}

	make_stream(){
		var ffmpeg = {};
		var args = [];

		args = ['-re', '-stream_loop', '-1', '-nostdin', '-rtsp_transport',
				'tcp', '-i', this.tmpObject['rtsp'], '-c', 'copy', 
				'-an', '-b:v', '2048k', '-f', 'rtsp', 
				('rtsp://localhost:8554/stream'+this.tmpObject['id'])];

		ffmpeg = spawn('ffmpeg', args);

		console.log(args);

		this.tmpObject['pid'] = ffmpeg.pid;
		model.insert('stream', this.tmpObject);
	}

	async make_camera(){
		var ffprobe_status = await this.check_rtsp();

		this.tmpArray = model.select('category', 
									{'id': this.tmpObject['category']});

		if (this.tmpArray.length === 0){
			this.result.data = 'Unknown category Id';
			this.result.code = 404;
			return null;
		}

		if (!ffprobe_status){
			this.result.data = 'Bad rtsp url';	
			this.result.code = 401;
			return;
		}

		this.tmpObject['id'] = model.insert('camera', this.tmpObject);
		this.tmpObject['id'] = this.tmpObject['id'].lastInsertRowid;

		this.make_stream();
		this.make_archive();

		this.result.data = 'Camera has been created';
		this.result.code = 200;
		return;
	}

	make_category(){
		model.insert(this.result.type, this.tmpObject);
		this.result.data = 'category has been created';
		this.result.code = 200;	
	}

	make_user(){
		this.tmpArray = model.select('role', this.tmpObject);

		if (this.tmpArray.length === 0){
			this.result.data = 'Unknown role for user';
			this.result.code = 404;
		}
		else{
			model.insert(this.result.type, this.tmpObject);
			this.result.data = 'user has been created';
			this.result.code = 200;
		}
	}

	async make(){
		this.result.type = this.urlObject.location[0];

		if (this.semantic_check() && 
			this.duplicate_check()){
			switch (this.result.type){
				case 'camera':
					await this.make_camera();
				break
				case 'category':
					this.make_category();
				break;
				case 'user':
					this.make_user();
				break
				default:
			}	
		}

		return;
	}	
}

class deleter extends receiver{
	constructor(urlObject){
		super(urlObject, null);
	}	

	remove_archive(){
		this.tmpArray = model.select('archive', this.tmpObject);
		process.kill(this.tmpArray[0].PID);
		model.remove('archive', this.tmpObject);
	}
	
	remove_stream(){
		this.tmpArray = model.select('stream', this.tmpObject);
		process.kill(this.tmpArray[0].PID);
		model.remove('stream', this.tmpObject);
	}	

	remove_camera(){
		this.tmpObject['id'] = this.urlObject.find_query('id');

		if (this.tmpObject['id'] === null){
			this.result.data = 'No camera id';
			this.result.code = 404;
		}
		else{
			if ((model.remove('camera', this.tmpObject)['changes']) > 0){
				this.remove_stream();
				this.remove_archive();
				fs.rm('./archive/'+this.tmpObject['id'], 
						{ recursive: true, force: true }, (err) => {});
				this.result.data = 'camera has been deleted';
				this.result.code = 200;
			}
			else{
				this.result.data = 'Unknown resource';
				this.result.code = 404;
			}
		}
	}
	
	remove_category(){
		this.tmpObject['id'] = this.urlObject.find_query('id');

		if (this.tmpObject['id'] === null){
			this.result.data = 'No category id';
			this.result.code = 404;
			return;
		}
		if (this.tmpObject['id'] === '1'){
			this.result.data = 'Bad request';			
			this.result.code = 401;
			return;
		}

		this.tmpArray = model.select('category', this.tmpObject);
		if (this.tmpArray.length === 0){
			this.result.data = 'Unknown category id';
			this.result.code = 401;
		}
		else{
			model.remove('category', this.tmpObject);
			this.result.data = 'Category has been deleted';
			this.result.code = 200;
		}
	}

	remove_user(){
		this.tmpObject['id'] = this.urlObject.find_query('id');

		if (this.tmpObject['id'] === null){
			this.result.data = 'No user id';
			this.result.code = 404;
			return;
		}
		if (this.tmpObject['id'] === '1'){
			this.result.data = 'Bad request';		
			this.result.code = 401;
			return;
		}

		this.tmpArray = model.select('user', this.tmpObject);	
		if (this.tmpArray.length === 0){
			this.result.data = 'Unknown user id';
			this.result.code = 401;
		}
		else{
			model.remove('user', this.tmpObject);
			this.result.data = 'User has been deleted';
			this.result.code = 200;
		}
	}
	
	async remove(){
		this.result.type = this.urlObject.location[0];

		switch(this.urlObject.location[0]){
			case 'camera':
				this.remove_camera();
			break
			case 'category':
				this.remove_category();
			break
			case 'user':
				this.remove_user();
			break
			default:
				this.result.data = 'unknown resource';
				this.result.code =  404;
		}

		return;
	}	
}

class updater extends deleter{
	presence(){
		this.tmpObject['id'] = this.urlObject.find_query('id');	
		if (this.tmpObject['id'] === null){
			this.result.data = 'No resource id';
			this.result.code = 401;
			return false;
		}

		this.tmpArray = model.select(this.result.type, this.tmpObject);
		if (this.tmpArray.length === 0){
			this.result.data = 'Unknown resource';
			this.result.code = 404;
			return false
		}

		return true;
	}

	update_camera(){
		this.tmpArray = model.select('category', 
									{'id': this.tmpObject['category']});
		if (this.tmpArray.length === 0){
			this.result.data = 'Uknown category';
			this.result.code = 400;
			return
		}
		if (!super.check_rtsp()){
			this.result.data = 'Invalid rtsp url';
			this.result.code = 400;
			return;
		}

		fs.rm('./archive/'+this.tmpObject['id'], 
				{ recursive: true, force: true }, (err) => {
					console.log(err);				
		});

		super.remove_stream();
		super.make_stream();
		super.remove_archive();
		super.make_archive();	

		model.update('camera', this.tmpObject);
		this.result.data = 'camera has been updated';
		this.result.code = 200;
	}

	async update(){
		this.result.type = this.urlObject.location[0];
		if (this.semantic_check() && this.presence()){
			if (this.result.type === 'camera'){
				this.update_camera();
			}
			else{
				model.update(this.result.type, this.tmpObject);
				this.result.data = 	this.result.type + ' has been updated';
				this.result.code = 200;
			}	
		}

		return;
	}	
}

exports.delete_resource = function(urlStr){
	var dataDeleter = {};
	var parseUrl = {};
	var res = {};

	parsedUrl = url.parse(urlStr);

	dataDeleter = new deleter(parsedUrl);
	dataDeleter.remove();

	result = dataDeleter.result;
	return result;
} 

exports.get_resource = async function(urlStr){
    const dataEmitter = new emitter(url.parse(urlStr));
    await dataEmitter.get();

	if (dataEmitter.result.type !== 'archive'){
		dataEmitter.result.convert();
	}

    return dataEmitter.result;
}

exports.make_resource = async function(urlStr, xmlStr){
	var parsedUrl = '';
	var parsedXml = '';
	var dataEmitter = {};
	var res = {};	

	parsedUrl = url.parse(urlStr);
	try{
		parsedXml = xml.parse(xmlStr);
	}
	catch(error){
		return new request_result(error.message, 'xml', 400);	
	}

	dataReceiver = new receiver(parsedUrl, parsedXml);	
	await dataReceiver.make();

	res = dataReceiver.result
	console.log(res);
	return res;
}

exports.update_resource = function(urlStr, xmlStr){
	var parsedUrl = '';
	var parsedXml = '';
	var dataEmitter = {};
	var res = {};	

	parsedUrl = url.parse(urlStr);
	try{
		parsedXml = xml.parse(xmlStr);
	}
	catch(error){
		return new request_result(error.message, 'xml', 401);	
	}

	controller = new updater(parsedUrl, parsedXml);	
	controller.update();

	res = controller.result
	console.log(res);
	return res;
}


exports.authenticate = function(userObject){
	if (userObject.name === undefined){
		throw new Error('User name is not specified');
	}
	if (userObject.password === undefined){
		throw new Error('User password is not specified');
	}
	
	return (model.auth(userObject) !== undefined);
}

exports.authorizate = function(userCredentials, method){
	var tmp = {};

	if (userCredentials.name === undefined){
		throw new Error('User name is not specified');
	}
	if (userCredentials.password === undefined){
		throw new Error('User password is not specified');
	}
	if (method === undefined){
		throw new Error('Method is not specified');
	}

	tmp = model.auth(userCredentials);
	if (tmp === undefined){
		throw new Error('No user with such credentials: ' + 
						JSON.stringify(userObject));
	}

	if (method === 'GET'){
		return true;
	}
	else{
		return (tmp['Role'] === 'admin');
	}
}

exports.init = function(){
	var processes = [];
	var cameras = [];
	var tmp = [];
	var i = 0;
	var dataReceiver = {};

	processes = model.select('stream', {id: null});	
	if (processes.length === 0){
		return;
	}

	console.log(processes);
	for (i = 0; i < processes.length; i++){
		tmp = model.select('camera', {
			'id': processes[i].Camera, 
			'category': null
		});
		
		cameras[i] = {};
		cameras[i]['id'] = tmp[0]['ID'];	
		cameras[i]['rtsp'] = tmp[0]['rtsp'];	
		
		model.remove('stream', cameras[i]);
		model.remove('archive', cameras[i]);
	}
	
	dataReceiver = new receiver(null, null);	
	
	for (i = 0; i < cameras.length; i++){
		dataReceiver.tmpObject = cameras[i];
		dataReceiver.make_stream();
		dataReceiver.make_archive();	
	}
}

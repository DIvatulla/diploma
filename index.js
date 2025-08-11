const http = require('http');
const controller = require('./controller');
const { spawn } = require('child_process');

class user_info{
      constructor(name, password){
          this.name = name;
          this.password = password;
      }
  }

class auth_header{
    constructor(header){
        var tmp = [];

        tmp = header.split(' ');
        this.scheme = tmp[0];
        this.credentials = tmp[1];
    }

    decode(){
        var tmp = [];
        var buf = '';

        buf = Buffer.from(this.credentials, 'base64').toString('utf-8');
        tmp = buf.split(':');

        return new user_info(tmp[0], tmp[1]);
    }
}

function GET_handler(req, res){
	var msg = {};

	controller.get_resource(req.url).then(result => {
		if (typeof(result.data) === 'string'){
			res.writeHead(result.code, {
				'Content-type': 'application/xml'
			});
		}
		else{
			res.writeHead(result.code, {
				'Content-Type': 'application/zip',
				'Content-Disposition': 'attachment; filename="archive.zip"'
			});
		}		

		res.write(result.data);
		res.end('\n');
	});
}

function POST_handler(req, res){
	var res_info = {};
	var body = '';
	
	req.on('data', (chunk) => {
		body = body + chunk.toString();
	});
	req.on('end', () => {
		try{
			controller.make_resource(req.url, body).then(result => {
				res.writeHead(result.code, {'Content-type': 'text/plain'});
				res.write(result.data);	
				res.end('\n');	
			});
		}
		catch(error){
			console.log(error);
			res.writeHead(500, {'Content-type': 'text/plain'});
			res.write('500 '+error.message);
			res.end('\n');
		}
	});
}

function DELETE_handler(req, res){
	var res_info = {};

	answ = controller.delete_resource(req.url);
	res.writeHead(answ.code, {'Content-type': 'text/plain'});
	res.write(answ.data);
	res.end('\n');
}

function PUT_handler(req, res){
	var res_info = {};
	var body = '';
	
	req.on('data', (chunk) => {
		body = body + chunk.toString();
	});
	req.on('end', () => {
		try{
			res_info = controller.update_resource(req.url, body);
		}
		catch(error){
			console.log(error);
			res.writeHead(500, {'Content-type': 'text/plain'});
			res.write('500 '+error.message);
			res.end('\n');
			return;
		}
		
		res.writeHead(res_info.code, {'Content-type': 'text/plain'});	
		res.write(res_info.data);
		res.end('\n');
	});
}

function req_handler(req, res, cred){
	if (controller.authorizate(cred, req.method)){
		switch(req.method){
			case 'GET':
				GET_handler(req, res);
			break;
			case 'POST':
				POST_handler(req, res);
			break;
			case 'DELETE':
				DELETE_handler(req, res);
			break;
			case 'PUT':
				PUT_handler(req, res);	
			break
			default:
				res.writeHead(501, {'Content-type': 'text/plain'});
				res.write(req.method+' - Is not implementedt');	
				res.end('\n');
		}
	}
	else{
		res.writeHead(403, {'Content-type': 'text/plain'});
		res.write('Insufficient priveleges');
		res.end('\n');	
	}
}

function basic_authentication(req, res){
	var auth = {};
	var cred = {};

    if (req.headers.authorization === undefined){
        res.writeHead(401, {'Content-type': 'text/plain'});
        res.write('401 No authorization header provided');
        res.end('\n');
        return null;
    }

    auth = new auth_header(req.headers.authorization);
    if ((auth.scheme !== 'Basic') || (auth.credentials === undefined)){
        res.writeHead(401, {'Content-type': 'text/plain'});
        res.write('401 Incorrect authorization header');
        res.end('\n');
        return null;
    }

    cred = auth.decode();
	if (controller.authenticate(cred)){
		console.log(req.headers.authorization);
		return cred;
	}
	else{
		res.writeHead(401, {'Content-type': 'text/plain'});
		res.write('401 Unknown user');
		res.end('\n');
		return null;
	}
}

var server = http.createServer();
var mediamtx = {};

mediamtx = spawn('./mediamtx');
mediamtx.unref();

mediamtx.stdout.on('data', (data) =>{
	console.log(data.toString());
});

server.on('connection', function(){
	console.log('connection\n');
});

server.listen(8124, function(){
	console.log('listening\n');
	controller.init();
});

server.on('request', function(req, res){
	var credentials = {};
	
	credentials = basic_authentication(req, res);
	if (credentials !== null){
		req_handler(req, res, credentials);
	}
});

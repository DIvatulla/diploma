const fs = require('node:fs/promises');
const path = require('path');
const { spawn } = require('node:child_process');
const { exec } = require('node:child_process');
const { promisify } = require('node:util');
const spawnPromise = promisify(spawn);
const execPromise = promisify(exec);

async function file_exists(fileNameStr){
	var res = false;

	try{
		res = await fs.stat(fileNameStr);
	} catch(error){
		return false
	}

	return true;	
}

async function file_in_use(filePathStr){
	var res = {};

	try{
		res = await execPromise('lsof '+filePathStr);
	} catch(error){
		return false;
	}
	
	return (res.stdout.length > 0);
}

async function get_files(dirPathStr){
	var files = [];
	var free = [];
	var i = 0;
	var fileStatus = false;

	files = await fs.readdir(dirPathStr);
	for (i = 0; i < files.length; i++){
		files[i] = path.join(dirPathStr, files[i]);	
		fileStatus = await file_in_use(files[i]);	
		if (!fileStatus){
			free.push(files[i]);	
		}
	}

	return free;
}

function parse_necessary(filePathArr, YmdDate){
	var i = 0;
	var necessary = [];

	for (i = 0; i < filePathArr.length; i++){
		if (filePathArr[i].includes(YmdDate)){
			necessary.push(filePathArr[i]);
		}
	}	

	return necessary;
}

function rand_archive_name(){
	return ((Math.floor(Math.random() * 32767)).toString() + '.zip');
}

function make_archive(filePathArr){
	return new Promise((resolve, reject) => {
		var tmp = rand_archive_name();
		var args = filePathArr;

		const check_interval = setInterval(() => {
			file_exists(tmp).then(result =>{
				if (!result){ 	
					clearInterval(check_interval);
					args.unshift(tmp);
					const zipProcess = spawn('zip', args);
					zipProcess.on('close', (code) =>{
						fs.readFile(tmp).then(result => {
							fs.unlink(tmp).then(result => {});
							resolve(result);
						});
					});
				}	
				else{
					tmp = rand_archive_name();
				}
			});	
		}, 0);
	});
}

exports.get_archive = async function(info){
	var archiveDirectoryPath = path.join('./archive', info['id']);
	var archiveVideosPath = [];
	var file = {};

	console.log('file_exists: ', (await file_exists(archiveDirectoryPath)));
	if (await file_exists(archiveDirectoryPath)){
		archiveVideosPath = await get_files(archiveDirectoryPath);		

		if (info['date'] !== null){
			archiveVideosPath = parse_necessary(archiveVideosPath, info['date']);
		}	
	
		if (archiveVideosPath.length === 0){
			return null;	
		}	
		else{
			file = await make_archive(archiveVideosPath);
			return file;	
		}
	}
	else{
		return null;
	}
}

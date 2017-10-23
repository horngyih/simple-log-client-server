const _fs = require("fs");
const _http = require("http");

const args = process.argv.slice(2);

var targetFileDescriptor = null;
var targetFileStat = null;

if( args && args.length >= 2 ){
    var targetFile = args[0];
    var logServerURL = args[1];
    console.log( "Watching... ", targetFile );
    console.log( "Sending to ", logServerURL );
    startWatching(targetFile);
} else {
    console.log( "Usage : <filename> <logserverURL>" );
}

function startWatching(filename){
    openFile(filename)
    .then(markFile)
    .then(fileInfo)
    .then(watchFile)
    .catch(function(err){ console.log(err); });;
}

function openFile(filename){
    return new Promise(function(resolve,reject){
        _fs.open(filename,'r',function(err,fd){
            if( err ){
                reject(err);
            } else {
                targetFileDescriptor = fd;
                resolve(filename);
            }
        });
    });
}

function markFile(filename){
    return new Promise(function(resolve,reject){
        _fs.stat(filename,function(err,stat){
            if(err){
                reject(err);
            } else {
                targetFileStat = stat;
                resolve(filename);
            }
        });
    });
}

function fileInfo(filename){
    return new Promise(function(resolve,reject){
        console.log( "Filename : ", filename );
        console.log( "File Descriptor : ", targetFileDescriptor );
        console.log( "File Initial Size : ", targetFileStat.size );
        resolve(filename);
    });
}

function watchFile(filename){
    return new Promise(function(resolve, reject){
        console.log( "Watching..." );
        _fs.watch(filename,null,handleWatch);
        resolve();
    });
}

function handleWatch(eventType, filename){
    diffFile(filename)
    .then(sendToLog);
}

function diffFile(filename){
    return new Promise(function(resolve,reject){
        _fs.stat(filename,function(err,stat){
            if(err){
                reject(err);
            } else {
                var initialPosition = targetFileStat.size || 0;
                var diffBlock = stat.size - targetFileStat.size;
                targetFileStat = stat;
                if( diffBlock > 0 ){
                    _fs.read(targetFileDescriptor,Buffer.alloc(diffBlock+1),0,diffBlock,initialPosition,function(err,read,data){
                        if(err){
                            reject(err);
                        } else {
                            if( read ){
                                resolve(data.toString());
                            } else{ 
                                resolve();
                            }
                        }
                    });
                } else {
                    resolve();
                }
            }
        });
    });
};

function sendToLog(text){
    if( text ){
        var options = {
            hostname : logServerURL,
            port : 9988,
            path : '/log',
            method : 'POST',
            headers : {
                'Content-Type' : 'text/plain'
            }
        };
    
        var request = _http.request(options,function(res){
            console.log(text);
        });
        request.write(text);
        request.end();
    }
}

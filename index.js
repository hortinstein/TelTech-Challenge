// Whole-script strict mode syntax
"use strict";
var config = require('./config.json');
var amqp = require('amqp');
var http = require('http');
var stats = require('measured').createCollection();

// setInterval(function() {
//     console.log(stats.toJSON());
// }, 1000);


//amqp[s]://[user:password@]hostname[:port][/vhost]
var challengeHost = 'amqp://' + config.user + ":" + config.pass + "@" + config.host + ":" + config.port;
var connection = amqp.createConnection({
    url: challengeHost
});



var sendResp = function(payload, callback){
    console.log("sending resp");
    exc.publish('formula_solution', payload, {});
}

var handleMessage = function(payload, callback) {
    var jsonResp = {
        "uuid": payload.uuid,
        "contestant_uuid": config.submissionKey,
        "formula": payload.formula,
        "solution": eval(payload.formula)
    }
    callback(null,jsonResp);
}


// Wait for connection to become established.
connection.on('ready', function() {
    console.log("connected to:" + challengeHost);
    var exc = connection.exchange('amq.topic');
    exc.on('open', function(){
       console.log('exc open'); 
    });
    // Use the default 'amq.topic' exchange
    connection.queue('hortinstein', function(q) {
        // Catch all messages
        q.bind('#');
        // Receive messages
        q.subscribe(function(message) {
            // Print messages to stdout
            var encoded_payload = unescape(message.data)
            var payload = JSON.parse(encoded_payload)
            stats.meter('messagesPerSecond').mark();
            handleMessage(payload, function(e,r) {
                stats.meter('solvedPerSecond').mark();
                sendResp(payload, function(e,r){
                    stats.meter('respsPerSecond').mark();
                })
            })
        });
    });
});
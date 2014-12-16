// Whole-script strict mode syntax
"use strict";
var config = require('./config.json');
var submissionKey = process.argv[2];
var amqp = require('amqp');
var http = require('http');
var stats = require('measured').createCollection();
var exchange = ''
setInterval(function() {
    console.log("Current Rate of Reqs/Min", (stats.toJSON().respsPerSecond.currentRate) * 60);
}, 1000);
//amqp[s]://[user:password@]hostname[:port][/vhost]
var challengeHost = 'amqp://' + config.user + ":" + config.pass + "@" + config.host + ":" + config.port;
var connection = amqp.createConnection({
    url: challengeHost
});
var sendResp = function(encoded_payload, callback) {
    //console.log(encoded_payload);
    stats.meter('respsPerSecond').mark();
    exchange.publish('formula_solution', encoded_payload);
    callback();
}
// Wait for connection to become established.
connection.once('ready', function() {
    exchange = connection.exchange('amq.topic', {}, function() {
        var queue = connection.queue('formula_solution', function() {
            console.log('Queue ' + exchange.name + ' is open');
            queue.bind(exchange.name, '');
            queue.subscribe(function(msg) {
                console.log('Subscribed to msg: ' + JSON.stringify(msg));
            });
        });
        queue.on('queueBindOk', function() {
            console.log('Queue bound successfully.');
        });
    });
    console.log("connected to:" + challengeHost);
    // Use the default 'amq.topic' exchange
    connection.queue('hortinstein', function(q) {
        // Catch all messages
        q.bind('formula');
        // Receive messages
        q.subscribe(function(message) {
            // Print messages to stdout
            var encoded_payload = unescape(message.data)
            var payload = JSON.parse(encoded_payload)
            var payload_string = ("{" + "\"uuid\": \"" + payload.uuid + '\",' 
                                  + "\"contestant_uuid\": \"" + submissionKey + '\",' 
                                  + "\"formula\": \"" + payload.formula + '\",' 
                                  + "\"solution\": " + eval(payload.formula) + "}");
            if(!payload.solution) {
                sendResp(payload_string, function(e, r) {
                    
                });
            }
        });
    });
});
connection.on('error', function(e, r) {
    console.log(e, r)
})
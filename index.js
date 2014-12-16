// Whole-script strict mode syntax
"use strict";

var config = require('./config.json');
var submissionKey = process.argv[2];

var amqp = require('amqp');
var http = require('http');
var stats = require('measured').createCollection();
var exchange = ''

setInterval(function() {
    console.log("Current Rate of Reqs/Sec",(stats.toJSON().respsPerSecond.currentRate)*60);
}, 1000);


//amqp[s]://[user:password@]hostname[:port][/vhost]
var challengeHost = 'amqp://' + config.user + ":" + config.pass + "@" + config.host + ":" + config.port;
var connection = amqp.createConnection({
    url: challengeHost
});
var sendResp = function(payload, callback) {
    var encoded_payload = JSON.stringify(payload);
    //console.log(encoded_payload);
    exchange.publish('formula_solution', encoded_payload);
    callback();
}
var handleMessage = function(payload, callback) {
        if (payload.solution !== null) {
            callback(1, null);
        } else {
            var jsonResp = {
                    uuid: payload.uuid,
                    contestant_uuid: submissionKey,
                    formula: payload.formula,
                    solution: eval(payload.formula)
                }
                //console.log(jsonResp);
            callback(null, jsonResp);
        }
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
            handleMessage(payload, function(e, r) {
                if (e) {

                } else {
                    sendResp(r, function(e, r) {
                        stats.meter('respsPerSecond').mark();
                    });
                }
            });


        });
    });
});
connection.on('error', function(e, r) {
    console.log(e, r)
})

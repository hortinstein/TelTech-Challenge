// Whole-script strict mode syntax
"use strict";

var should = require("should");
var config = "";

before(function(done) {
    config = require('../config.json');
    done();
});
it('should be able to load a valid config', function(done) {
    config.port.should.equal(5672);
    done();
});

'use strict';

var Chai = require('chai');
var assert = Chai.assert;

describe("Sanity/Control tests", function ()
{
    it("should verify that String '1' equals number 1 as a positive control", function()
    {
        assert.ok("1" == 1);
        assert.equal("1", 1);
    });

    it("should verify 0 != 1 as a negative control", function()
    {
        assert.ok(0 !== 1);
        assert.notOk(0 === 1);
        assert.notEqual(0, 1);
    });
});

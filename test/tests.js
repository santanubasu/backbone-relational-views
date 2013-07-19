define([
    "backbone",
    "backboneRelational",
    "backboneRelationalViews",
    "underscore",
    "jquery",
    "qunit"
], function (bb, bbr, bbrv, us, $, qunit) {
    test("hello test", function() {
        ok( 1 == "1", "Passed!" );
    });
    qunit.load();
});
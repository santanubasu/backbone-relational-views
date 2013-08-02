define([
    "backbone",
    "backboneRelational",
    "backboneRelationalViews",
    "underscore",
    "jquery",
], function (bb, bbr, bbrv, us, $) {

    var templateA = function(data) {
        return "<div style='position:relative;left:20px'>"+data.this.helperFunction(data.value)+"</div>";
    }

    var templateB = function(data) {
        return "<div style='position:relative;left:20px'>"+data.value+"</div>";
    }

    var templateC = function(data) {
        return "<div style='position:relative;left:20px'><div>"+data.value+"</div>"+data.a+data.bb.join(" ")+data.cc.join(" ")+"</div>";
    }

    // Pollute global namespace for now, as BBR has no concept of selfRelatedModel yet
    A = bb.RelationalModel.extend({
        idAttribute:"id"
    });

    B = bb.RelationalModel.extend({
        idAttribute:"id"
    });

    C = bb.RelationalModel.extend({
        idAttribute:"id",
        relations:[
            {
                type:bb.HasOne,
                key:"unuseda",
                relatedModel: A
            },
            {
                type:bb.HasOne,
                key:"a",
                relatedModel: A
            },
            {
                type:bb.HasMany,
                key:"bb",
                relatedModel: B,
                collectionOptions:{
                    comparator:function(model) {
                        return model.attributes.value;
                    }
                },
                reverseRelation: {
                    key:"c",
                    relatedModel:B
                }
            },
            {
                type:bb.HasMany,
                key:"cc",
                relatedModel: "C",
                collectionOptions:{
                    comparator:function(model) {
                        return model.attributes.value;
                    }
                },
                reverseRelation: {
                    key:"c"
                }
            }
        ]
    });

    var AV = bb.RelationalView.extend({
        events:{
            "click":"click"
        },
        click:function() {
            alert("A, id:"+this.model.attributes.id+", value:"+this.model.attributes.value);
        },
        defaultConfig: $.extend(true, {}, bb.RelationalView.prototype.defaultConfig, {
            template:templateA
        }),
        helperFunction:function(value) {
            if (value=="Help wanted") {
                return value+" -> The job is yours";
            }
            else {
                return value;
            }
        }
    });

    var BV = bb.RelationalView.extend({
        events:{
            "click":"click"
        },
        click:function() {
            alert("B, id:"+this.model.attributes.id+", value:"+this.model.attributes.value);
        },
        defaultConfig: $.extend(true, {}, bb.RelationalView.prototype.defaultConfig, {
            template:templateB
        })
    });

    var CV = bb.RelationalView.extend({
        events:{
            "click":"click"
        },
        click:function() {
            alert("C, id:"+this.model.attributes.id+", value:"+this.model.attributes.value);
        },
        defaultConfig: $.extend(true, {}, bb.RelationalView.prototype.defaultConfig, {
            template:templateC,
            subviewConfigs:{
                a:{
                    template:templateA,
                    viewType:AV
                },
                bb:{
                    template:templateB,
                    viewType:BV
                },
                cc:{
                    template:templateC,
                    getViewType:function() {
                        return CV;
                    }
                }
            }
        })
    });

    var c;
    var cv;

    $("#next").on("click", function() {
        if (next!=null) {
            var source = "The function that just ran:\n\n"+next.toString();
            next();
            if (next!=null) {
                source+="\n\nThe function that will run next:\n\n"+next.toString();
            }
            else {
                $(this).text("Start Over").on("click", function() {
                    location.reload();
                })
            }
            $("#source").text(source);
        }
    });

    function s000() {
        // Build the relational model with no relational submodels initially, and build the relational view using that model.
        c = new C({
            id:"c1",
            value:"c1"
        });
        cv = new CV({
            model:c,
            el:$("#result")
        });
        next = s100;
    }
    var next = s000;
    $("#next").trigger("click");

    function s100() {
        // Modify a primitive property.
        c.set({
            value:"c1-mod1"
        });
        next = s200;
    }

    function s200() {
        // Set a relational property.
        c.set({
            a:{
                id:"a1",
                value:"a1"
            }
        });
        next = s300;
    }

    function s300() {
        // Replace  a relational property.
        c.set({
            a:{
                id:"a2",
                value:"a2"
            }
        });
        next = s400;
    }

    function s400() {
        // Modify a primitive property of a relational property, using deep reference.
        c.set({
            a:{
                value:"a2-mod1"
            }
        });
        next = s500;
    }

    function s500() {
        // Modify a primitive property of a relational property, using direct reference to relational property.
        c.get("a").set({
            value:"a2-mod2"
        });
        next = s510;
    }

    function s510() {
        // Set a relational property, displaying results from helper function.
        c.set({
            a:{
                id:"a3",
                value:"Help wanted"
            }
        });
        next = s600;
    }

    function s600() {
        // Add elements to a relational collection.
        c.set({
            bb:[
                {
                    id:"b1",
                    value:"b1"
                },
                {
                    id:"b3",
                    value:"b3"
                }
            ]
        });
        next = s700;
    }

    function s700() {
        // Add more elements to a relation collection using deep reference, retaining existing ones, and applying sort.
        c.set(
            {
                bb:[
                    {
                        id:"b2",
                        value:"b2"
                    },
                    {
                        id:"b4",
                        value:"b4"
                    }
                ]
            },
            {
                remove:false
            });
        next = s800;
    }

    function s800() {
        // Add more elements to a relation collection, using direct reference, retaining existing ones, and applying sort.
        c.get("bb").add([
            {
                id:"b5",
                value:"b5"
            },
            {
                id:"b6",
                value:"b6"
            }
        ]);
        next = s900;
    }

    function s900() {
        // Remove last two elements in a relational collection, using deep reference.
        c.set(
            {
                bb:[
                    {
                        id:"b1",
                        value:"b1"
                    },
                    {
                        id:"b2",
                        value:"b2"
                    },
                    {
                        id:"b3",
                        value:"b3"
                    },
                    {
                        id:"b4",
                        value:"b4"
                    }
                ]
            });
        next = s1000;
    }

    function s1000() {
        // Remove the second element of relational collection, using direct reference
        c.get("bb").remove(c.get("bb").at(1));
        next = s1100;
    }

    function s1100() {
        // Modify a primitive property of an element of a relational collection using deep reference
        c.set(
            {
                id:"c1",
                bb:[
                    {
                        id:"b1",
                        value:"b1-mod1"
                    },
                ]
            },
            {
                remove:false
            });
        next = s1200;
    }

    function s1200() {
        // Unset a relational property using direct reference
        c.unset("a");
        next = s1300;
    }

    function s1300() {
        // Add elements to a relational collection that are of the same type as the parent
        c.set({
            cc:[
                {
                    id:"c10",
                    value:"c10"
                },
                {
                    id:"c11",
                    value:"c11"
                }
            ]
        });
        next = s1400;
    }

    function s1400() {
        // Set relational element on self referential collection relation
        c.set(
            {
                cc:[
                    {
                        id:"c10",
                        a:{
                            id:"a3",
                            value:"a3"
                        }
                    }
                ]
            },
            {
                remove:false
            });
        next = s1500;
    }

    function s1500() {
        // Add 1000 elements to relational collection
        var data = [];
        for (var i=0; i<2000; i+=2) {
            data.push({
                id:"b"+i,
                value:"b"+i
            })
        }
        c.set({
            bb:data
        });
        next = s1600;
    }

    function s1600() {
        // Modify primitive property in structure containing large numbers of relational collection elements
        c.set({
            value:"c1-mod2"
        });
        next = s1700;
    }

    function s1700() {
        // Modify a primitive value of a relational property in a collection containing a large numbers of relational collection elements
        c.get("bb").at(5).set({
            value:"b1004-mod1"
        });
        next = s1800;
    }

    function s1800() {
        // Sort a collection containing a large numbers of relational collection elements
        c.get("bb").comparator = bbrv.buildComparator([{path:"value", order:1}]);
        c.get("bb").sort();
        cv.render();
        next = s1900;
    }

    function s1900() {
        // Add 10 more elements to relational collection containing an existing large number of elements
        var data = [];
        for (var i=1; i<20; i+=2) {
            data.push({
                id:"b"+i,
                value:"b"+i
            })
        }
        c.set(
            {
                bb:data
            },
            {
                remove:false
            });
        next = null;
    }
});

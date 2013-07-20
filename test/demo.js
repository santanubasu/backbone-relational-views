define([
    "backbone",
    "backboneRelational",
    "backboneRelationalViews",
    "underscore",
    "jquery",
], function (bb, bbr, bbrv, us, $) {

    var templateA = function(data) {
        return "<div style='position:relative;left:20px'>"+data.value+"</div>";
    }

    var templateB = function(data) {
        return "<div style='position:relative;left:20px'>"+data.value+"</div>";
    }

    var templateC = function(data) {
        return "<div style='position:relative;left:20px'><div>"+data.value+"</div>"+data.a+data.bb.join(" ")+"</div>";
    }

    var A = bb.RelationalModel.extend({
        idAttribute:"id"
    });

    var B = bb.RelationalModel.extend({
        idAttribute:"id"
    });

    var C = bb.RelationalModel.extend({
        idAttribute:"id",
        relations:[
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
        })
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
                }
            }
        })
    });

    var c;
    var cv;

    var next;

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

    function s1() {
        // Build the relational model with no relational submodels initially, and build the relational view using that model.
        c = new C({
            id:"c1",
            value:"c1"
        });
        cv = new CV({
            model:c,
            el:$("#result")
        });
        next = s2;
    }
    s1();
    $("#source").html(s1.toString());

    function s2() {
        // Modify a primitive property.
        c.set({
            value:"c1-mod1"
        });
        next = s3;
    }

    function s3() {
        // Set a relational property.
        c.set({
            a:{
                id:"a1",
                value:"a1"
            }
        });
        next = s4;
    }

    function s4() {
        // Replace  a relational property.
        c.set({
            a:{
                id:"a2",
                value:"a2"
            }
        });
        next = s5;
    }

    function s5() {
        // Modify a primitive property of a relational property, using deep reference.
        c.set({
            a:{
                value:"a2-mod1"
            }
        });
        next = s6;
    }

    function s6() {
        // Modify a primitive property of a relational property, using direct reference to relational property.
        c.get("a").set({
            value:"a2-mod2"
        });
        next = s7;
    }

    function s7() {
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
        next = s8;
    }

    function s8() {
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
        next = s9;
    }

    function s9() {
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
        next = s10;
    }

    function s10() {
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
        next = s11;
    }

    function s11() {
        // Remove the second element of relational collection, using direct reference
        c.get("bb").remove(c.get("bb").at(1));
        next = null;
    }

    /*
            c.set(
            {
                id:"c1",
                bb:[
                    {
                        id:"b2",
                        value:"b2-mod"
                    },
                ]
            },
            {
                remove:false
            });

        c.unset("a");

     */
});

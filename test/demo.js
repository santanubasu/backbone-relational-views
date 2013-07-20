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

    /*
    Build the relational model with no relational submodels intially, and build the relational view using that model.
    */
    var c = new C({
        id:"c1",
        value:"c1"
    });
    var cv = new CV({
        model:c,
        el:$("#demo")
    });
    debugger;

    /*
    Modifying a primitive property
     */
    c.set({
        value:"c1-mod1"
    });
    debugger;

    /*
    Setting a relational property
     */
    c.set({
        a:{
            id:"a1",
            value:"a1"
        }
    });
    debugger;

    /*
    Replacing  a relational property
     */
    c.set({
        a:{
            id:"a2",
            value:"a2"
        }
    });
    debugger;

    /*
    Modifying a primitive property of a relational property, using deep reference
     */
    c.set({
        a:{
            value:"a2-mod1"
        }
    });
    debugger;

    /*
    Modifying a primitive property of a relational property, using direct reference to relational property
     */
    c.get("a").set({
        value:"a2-mod2"
    });
    debugger;

    /*
    Adding elements to a relational collection
     */
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
    debugger;

    /*
    Adding more elements to a relation collection using deep refernce, retaining existing ones, and applying sort
     */
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
    debugger;

    /*
    Adding more elements to a relation collection, using direct reference, retaining existing ones, and applying sort
     */
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
    debugger;


    /*
    Removing last two elements in a relational collection, using deep reference
     */
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
    debugger;

    /*
    Removing the second element of relational collection, using direct reference
     */
    c.get("bb").remove(c.get("bb").at(1));
    debugger;

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
});

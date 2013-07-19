define([
    "backbone",
    "backboneRelational",
    "backboneRelationalViews",
    "underscore",
    "jquery",
], function (bb, bbr, bbrv, us, $) {

    var templateA = function(data) {
        return "<div style='text-indent:10px'>"+data.value+"</div>";
    }

    var templateB = function(data) {
        return "<div style='text-indent:10px'>"+data.value+"</div>";
    }

    var templateC = function(data) {
        return "<div style='text-indent:10px'><div>"+data.value+"</div>"+data.a+data.bb+"</div>";
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

    var c = new C({
        id:"c1",
        value:"c1"
    });
    var cv = new CV({
        model:c,
        el:$("#demo")
    });

    c.set({
        id:"c1",
        a:{
            id:"a1",
            value:"a1"
        },
        bb:[
            {
                id:"b1",
                value:"b1"
            },
            {
                id:"b2",
                value:"b2"
            }
        ]
    })
});

/**
 * backbone-relational-views.js 0.1.1
 * (c) 2013 Santanu Basu
 *
 * Dependencies:
 *
 * Backbone (https://github.com/documentcloud/backbone)
 * Underscore (https://github.com/jashkenas/underscore/)
 * Backbone-Relational (https://github.com/PaulUithol/Backbone-relational)
 */

define([
    "backbone",
    "underscore",
    "jquery"
], function (bb, us, $) {

    /*
    Sample spec: [{path:"a.b"}, {path:"c", order:-1}]
    Currently, this builder only handles direct paths into simple objects, dotted notation does not traverse relationships
    */
    var buildModelComparator = function (spec) {
        for (var i = 0; i<spec.length; i++) {
            var rule = spec[i];
            rule.get = eval("(function(o) { return o.attributes." + rule.path + ";})");
            if (us.isUndefined(rule.order)) {
                rule.order = 1;
            }
        }
        return function (a, b) {
            var udefa = us.isUndefined(a);
            var udefb = us.isUndefined(b);
            if (udefa&&!udefb) {
                return 1;
            }
            else if (udefb&&!udefa) {
                return -1;
            }
            else if (udefa&&udefb) {
                return 0;
            }
            for (var i = 0; i<spec.length; i++) {
                var rule = spec[i];
                if (rule.get(a)<rule.get(b)) {
                    return rule.order;
                }
                else if (rule.get(a)>rule.get(b)) {
                    return -rule.order;
                }
            }
            return 0;
        }
    };

    bb.RelationalView = bb.View.extend({
        defaultConfig: {
            subviewConfigs: {}
        },
        initialize: function (options) {
            this.config = this.normalizeConfig($.extend(true, {}, this.defaultConfig, us.pick(options, ["template", "getTemplate", "subviewConfigs"])));
            this.subviews = {};
            this.createSubviews();
            this.setupEventHandlers();
            this.render();
        },
        setupEventHandlers:function() {
            var thiz = this;
            var batchRender = (function(thiz) {
                var batched = false;
                function render() {
                    if (batched) {
                        thiz.render();
                        batched = false;
                    }
                }
                return function() {
                    batched = true;
                    us.defer(render);
                }
            })(this);
            this.listenTo(this.model, "change", function (model, options) {
                batchRender();
            });
            this.model.getRelations().forEach(function(relation) {
                if (relation instanceof bb.HasMany) {
                    thiz.listenTo(thiz.model.get(relation.key), "relational:add", function (model, collection, options) {
                        var index = collection.indexOf(model);
                        this.createCollectionSubview(relation.key, index, model);
                        batchRender();
                    });
                    thiz.listenTo(thiz.model.get(relation.key), "relational:remove", function (model, collection, options) {
                        this.deleteCollectionSubview(relation.key, options.index);
                        batchRender();
                    });
                }
                else {
                    thiz.listenTo(thiz.model, "relational:change:"+relation.key, function (model, options) {
                        var oldModel = model._previousAttributes[relation.key];
                        var newModel = model.attributes[relation.key];
                        if (oldModel===newModel) {
                            return;
                        }
                        if (oldModel!=null) {
                            this.deleteDirectSubview(relation.key)
                        }
                        if (newModel!=null) {
                            this.createDirectSubview(relation.key, newModel)
                        }
                        batchRender();
                    });
                }
            });
        },
        normalizeSubviewConfig: function (config) {
            var normalizedConfig = $.extend(true, {}, config);
            if (normalizedConfig.viewType) {
                if (!(normalizedConfig.viewType.prototype instanceof bb.RelationalView)) {
                    console.warn("A viewType was defined for a subview config, but it is not a RelationalView, reverting to using RelationalView as the viewType.");
                    normalizedConfig.viewType = bb.RelationalView;
                }
            }
            else {
                normalizedConfig.viewType = bb.RelationalView;
            }
            if (us.isUndefined(normalizedConfig.getViewType)) {
                normalizedConfig.getViewType = function () {
                    return normalizedConfig.viewType;
                };
            }
            return normalizedConfig;
        },
        normalizeConfig: function (config) {
            var normalizedConfig = $.extend(true, {}, config);
            for (var key in normalizedConfig.subviewConfigs) {
                normalizedConfig.subviewConfigs[key] = this.normalizeSubviewConfig(normalizedConfig.subviewConfigs[key]);
            }
            if (us.isUndefined(normalizedConfig.template)) {
                normalizedConfig.template = function (it) {
                    return "";
                };
            }
            if (us.isUndefined(normalizedConfig.getTemplate)) {
                normalizedConfig.getTemplate = function () {
                    return normalizedConfig.template;
                };
            }
            return normalizedConfig;
        },
        destroy: function () {
            this.$el.empty();
            this.stopListening();
            this.undelegateEvents();
            for (var key in this.subviews) {
                var value = this.subviews[key];
                if (us.isArray(value)) {
                    value.forEach(function (subview) {
                        subview.destroy();
                    })
                }
                else {
                    var subview = value;
                    subview.destroy();
                }
            }
        },
        createSubviews: function () {
            for (var key in this.model.attributes) {
                var value = this.model.attributes[key];
                if (us.isUndefined(value)||us.isNull(value)) {
                    continue;
                }
                var relation = this.model.getRelation(key);
                if (us.isUndefined(relation)) {
                    continue;
                }
                /*
                XXX, Very inefficient if many elements in collection to begin with
                */
                if (relation instanceof bb.HasMany) {
                    var collection = value;
                    this.subviews[key] = [];
                    for (var i = 0; i<collection.models.length; i++) {
                        this.createCollectionSubview(key, i, this.model.get(key).at(i));
                    }
                }
                else {
                    this.createDirectSubview(key, this.model.get(key));
                }
            }
        },
        createDirectSubview: function (key, model) {
            if (key in this.subviews) {
                console.warn("Cannot create a direct subview for key " + key + " because one already exists.");
                return;
            }
            var subview = this.subviews[key];
            if (!(key in this.config.subviewConfigs)) {
                return;
            }
            var subviewConfig = this.config.subviewConfigs[key];
            var viewType = subviewConfig.getViewType.call(this, model);
            subview = new viewType({
                model:model,
                template:subviewConfig.template,
                getTemplate:subviewConfig.getTemplate
            });
            this.subviews[key] = subview;
        },
        createCollectionSubview: function (key, index, model) {
            if (!(key in this.config.subviewConfigs)) {
                return;
            }
            var subviewConfig = this.config.subviewConfigs[key];
            var viewType = subviewConfig.getViewType.call(this, model, index);
            var subview = new viewType({
                model: model,
                template:subviewConfig.template,
                getTemplate:subviewConfig.getTemplate
            });
            this.subviews[key].splice(index, 0, subview);

        },
        deleteDirectSubview: function (key) {
            var subview = this.subviews[key];
            if (subview) {
                subview.destroy();
                delete this.subviews[key];
            }
        },
        deleteCollectionSubview: function (key, index) {
            var subviews = this.subviews[key];
            if (subviews) {
                var subview = subviews[index];
                if (subview) {
                    subviews.splice(index, 1);
                    subview.destroy();
                }
            }
        },
        deferredPostRender: function() {
            var thiz = this;
            us.defer(function () {
                thiz.postRender();
            });
        },
        postRender: function () {
        },
        preRender: function () {
        },
        /*
        XXX
        This is potentially very inefficient for long lists, will need to optimize later.  Also note that at the moment
        it is prescribed that all templates must define a root element.
        */
        render: function () {
            this.preRender();
            var proxyAttributes = $.extend({}, this.model.attributes);
            for (var key in proxyAttributes) {
                var attribute = proxyAttributes[key];
                if (attribute instanceof bb.Model) {
                    proxyAttributes[key] = "<div dataKey=\"" + key + "\"/>";
                }
                else if (attribute instanceof bb.Collection) {
                    var markup = "<div dataKey=\"" + key + "\"/>";
                    proxyAttributes[key] = proxyAttributes[key].map(function (value, index) {
                        return markup;
                    });
                }
            }

            var template = this.config.getTemplate.call(this, this.model);
            var $proxyEl = $(template(proxyAttributes));

            for (var key in this.subviews) {
                var value = this.subviews[key];
                if (us.isArray(value)) {
                    var subviews = value;
                    $proxyEl.find("div[dataKey=\"" + key + "\"]").each(function (index, element) {
                        subviews[index].$el.attr("dataKey", key);
                        $(element).replaceWith(subviews[index].$el);
                    });
                }
                else {
                    var subview = value;
                    subview.$el.attr("dataKey", key);
                    $proxyEl.find("div[dataKey=\"" + key + "\"]").replaceWith(subview.$el);
                }
            }

            var $oldEl = this.$el;
            this.setElement($proxyEl);
            $oldEl.replaceWith($proxyEl);

            this.deferredPostRender();
            return this;
        }
    });

    return {
        buildComparator: buildModelComparator,
        RelationalView: bb.RelationalView
    }

});

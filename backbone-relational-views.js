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
            options = $.extend(true, {
                render:true,
                subviews:{}
            }, options);
            if (!this.model) {
                this.model = new bb.RelationalModel();
            }
            this.config = this.normalizeConfig($.extend(true, {}, this.defaultConfig, us.pick(options, ["template", "getTemplate", "getEl", "subviewConfigs"])));
            this.subviews = {};
            this.viewState = $.extend(true, {}, options.viewState);
            this.createSubviews();
            for (var key in options.subviews) {
                this.setSubview(key, options.subviews[key]);
            }
            this.setupModelEventHandlers();
            if (options.render) {
                this.render();
            }
        },
        getModelId:function(model) {
            return "id" in model?model.id:model.cid;
        },
        setupModelEventHandlers:function() {
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
                    thiz.listenTo(thiz.model.get(relation.key), "sort", function (model, collection, options) {
                        batchRender();
                    });
                    thiz.listenTo(thiz.model.get(relation.key), "relational:add", function (model, collection, options) {
                        var index = collection.indexOf(model);
                        this.createCollectionSubview(relation.key, index, model);
                        batchRender();
                    });
                    thiz.listenTo(thiz.model.get(relation.key), "relational:remove", function (model, collection, options) {
                        this.deleteCollectionSubview(relation.key, this.getModelId(model), options.index);
                        batchRender();
                    });
                    thiz.listenTo(thiz.model.get(relation.key), "sort", function (model, collection, options) {
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
                normalizedConfig.getViewType = function() {
                    return normalizedConfig.viewType;
                };
            }
            return normalizedConfig;
        },
        normalizeConfig: function (config) {
            var thiz = this;
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
            if (us.isUndefined(normalizedConfig.getEl)) {
                normalizedConfig.getEl = function () {
                    return thiz.$el;
                };
            }
            return normalizedConfig;
        },
        forAllSubviews:function(f) {
            for (var key in this.subviews) {
                var value = this.subviews[key];
                if (value instanceof bb.RelationalView) {
                    var subview = value;
                    f(key, subview);
                }
                else {
                    for (var subviewKey in value) {
                        f(subviewKey, value[subviewKey]);
                    }
                }
            }
        },
        destroy: function () {
            this.$el.empty();
            this.stopListening();
            this.undelegateEvents();
            this.forAllSubviews(function(key, view) {
                view.destroy();
            })
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
                if (relation instanceof bb.HasMany) {
                    var collection = value;
                    this.subviews[key] = {};
                    for (var i = 0; i<collection.models.length; i++) {
                        var model = collection.at(i);
                        this.createCollectionSubview(key, i, model);
                    }
                }
                else {
                    this.createDirectSubview(key, value);
                }
            }
        },
        createDirectSubview: function(key, model) {
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
        createCollectionSubview: function(key, index, model) {
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
            var modelId = this.getModelId(model);
            this.subviews[key][modelId] = subview;

        },
        deleteDirectSubview: function (key) {
            var subview = this.subviews[key];
            if (subview) {
                subview.destroy();
                delete this.subviews[key];
            }
        },
        deleteCollectionSubview: function (key, modelId) {
            var subviews = this.subviews[key];
            if (subviews) {
                var subview = subviews[modelId];
                delete subviews[modelId];
                if (subview) {
                    subview.destroy();
                }
            }
        },
        setSubview:function(key, subview) {
            if (key in this.config.subviewConfigs) {
                console.warn("You are manually setting a subview on key \""+key+"\" but a subview configuration already exists for this key.  Your subview may be overwritten as a result of model state changes.");
            }
            if (key in this.subviews) {
                this.subviews[key].remove();
            }
            this.subviews[key] = subview;
            if (this.model.has(key)) {
                console.warn("You are manually setting a subview on key \""+key+"\" but a submodel already exists for this key.  This submodel will be overwritten by the model of the subview.");
            }
            this.model.set(key, subview.model, {
                silent:true
            });
        },
        deferredPostRender: function() {
            var thiz = this;
            us.defer(function () {
                thiz.postRender();
                thiz.setupAllEventHandlers();
            });
        },
        postRender: function () {
        },
        preRender: function () {
        },
        setupEventHandlers:function() {
            this.delegateEvents();
        },
        setupAllEventHandlers:function() {
            this.forAllSubviews(function(key, view) {
                view.setupAllEventHandlers();
            })
            this.setupEventHandlers();
        },
        render: function () {
            var thiz = this;
            this.preRender();
            var proxyAttributes = $.extend({}, this.model.attributes, this.viewState);
            for (var key in proxyAttributes) {
                var attribute = proxyAttributes[key];
                var markup = "<div dataKey=\"" + key + "\"/>";
                if (attribute instanceof bb.Model) {
                    proxyAttributes[key] = markup;
                }
                else if (attribute instanceof bb.Collection) {
                    proxyAttributes[key] = attribute.map(function(model, index) {
                        return "<div dataKey=\""+key+"\" index=\""+index+"\"/>";
                    });
                }
            }

            proxyAttributes.this = this;
            var template = this.config.getTemplate.call(this, this.model);
            var $proxyEl = $(template(proxyAttributes));
            $proxyEl.attr("modelId", this.getModelId(this.model));

            for (var key in this.subviews) {
                var value = this.subviews[key];
                if (value instanceof bb.RelationalView) {
                    var subview = value;
                    subview.$el.attr("dataKey", key);
                    $proxyEl.find("div[dataKey=\"" + key + "\"]").replaceWith(subview.$el);
                }
                else {
                    var subviews = value;
                    var submodelCollection = this.model.get(key);
                    $proxyEl.find("div[dataKey=\"" + key + "\"]").replaceWith(function(index) {
                        var submodel = submodelCollection.at(index);
                        return subviews[thiz.getModelId(submodel)].$el;
                    })
                }
            }

            var $oldEl = this.config.getEl();
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

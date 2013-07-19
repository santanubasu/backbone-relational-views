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
            var thiz = this;
            this.config = this.normalizeConfig($.extend(true, {}, this.defaultConfig, us.pick(options, ["template", "subviewConfigs"])));
            this.subviews = {};
            this.pendingChanges = {};
            this.createSubviews();
            this.setupEventHandlers();
            this.render();
        },
        markChangesPending:function(changes) {
            this.pendingChanges = $.extend({}, changes);
        },
        markChangeProcessed:function(key) {
            delete this.pendingChanges[key];
            if ($.isEmptyObject(this.pendingChanges)) {
                this.render();
            }
        },
        isChangePending:function() {
            return !($.isEmptyObject(this.pendingChanges));
        },
        /*
        XXX
        Because of the way events are fired, if you reach into a nested structure and get() a collection, then call add()
        or remove() on that, no relational:change event is triggered on the containing model.  Therefore, no render happens.
        This should be handled, but at the moment, the workaround is to modify the collection via a deep modification on
        it's cotnaining model using the model's set() function.
        */
        setupEventHandlers:function() {
            var thiz = this;
            this.listenTo(this.model, "change", function (model, options) {
                var args = [this.model.changedAttributes()];
                args.push.apply(args, this.model.getRelations().map(function(relation) {return relation.key;}))
                var changes = us.pick.apply(this, args);
                if ($.isEmptyObject(changes)) {
                    this.render();
                }
                else {
                    for (var key in changes) {
                        if (us.isArray(changes[key])) {
                            changes[key] = [];
                        }
                        else {
                            changes[key] = {};
                        }
                    }
                    this.markChangesPending(changes);
                }
            });
            this.model.getRelations().forEach(function(relation) {
                if (relation instanceof bb.HasMany) {
                    thiz.listenTo(thiz.model.get(relation.key), "relational:add", function (model, collection, options) {
                        var index = collection.indexOf(model);
                        this.createCollectionSubview(relation.key, index, model);
                    });
                    thiz.listenTo(thiz.model.get(relation.key), "relational:remove", function (model, collection, options) {
                        this.deleteCollectionSubview(relation.key, options.index);
                    });
                    thiz.listenTo(thiz.model.get(relation.key), "relational:change", function (model, collection, options) {
                        this.markChangeProcessed(relation.key);
                    });
                }
                else {
                }
            });
        },
        normalizeSubviewConfig: function (config) {
            var normalizedConfig = $.extend(true, {}, config);
            if (us.isUndefined(normalizedConfig.viewType)) {
                normalizedConfig.viewType = bb.RelationalView;
            }
            if (us.isUndefined(normalizedConfig.template)) {
                normalizedConfig.template = function (it) {
                    return "";
                };
            }
            return normalizedConfig;
        },
        normalizeConfig: function (config) {
            var normalizedConfig = $.extend(true, {}, config);
            for (var key in normalizedConfig.subviewConfigs) {
                normalizedConfig.subviewConfigs[key] = this.normalizeSubviewConfig(normalizedConfig.subviewConfigs[key]);
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
            var subview = this.subviews[key];
            if (!us.isUndefined(subview)) {
                console.warn("Cannot create a direct subview for key " + key + " because one already exists.");
                return;
            }
            var subviewConfig = this.config.subviewConfigs[key];
            if (us.isUndefined(subviewConfig)) {
                return;
            }
            subview = new subviewConfig.viewType({
                model:model,
                template: subviewConfig.template
            });
            this.subviews[key] = subview;
        },
        createCollectionSubview: function (key, index, model) {
            var subviewConfig = this.config.subviewConfigs[key];
            if (us.isUndefined(subviewConfig)) {
                return;
            }
            var subview = new subviewConfig.viewType({
                model: model,
                template: subviewConfig.template
            });
            this.subviews[key].splice(index, 0, subview);

        },
        deleteSubview: function (key) {
            var subview = this.subviews[key];
            if (!us.isUndefined(subview)) {
                subview.destroy();
                delete this.subviews[key];
            }
        },
        deleteCollectionSubview: function (key, index) {
            var subviews = this.subviews[key];
            if (!us.isUndefined(subviews)) {
                var subview = subviews[index];
                if (!us.isUndefined(subview)) {
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

            var $proxyEl = $(this.config.template(proxyAttributes));

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
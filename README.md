# Backbone Relational Views

Composite view support for Backbone Relational

Backbone Relational Views (BBRV) is a Javascript library that augments Backbone, and complements the excellent Backbone Relational library.  The goal of BBRV is to make to easy to work with related views, just as Backbone Relational makes it easy to work with related models.  It adds a RelationalView to the Backbone object, which you can extend to define your custom related views.

Here's a quick example of using BBRV to define views for a set of related models.  First, create some templates (see below for more on templating) and the relational models that will back the relational views:

```javascript
var templateA = function(data) {
    return "<div style='position:relative;left:20px'>"+data.value+"</div>";
}

var templateC = function(data) {
    return "<div style='position:relative;left:20px'><div>"+data.value+"</div>"+data.a+"</div>";
}

var A = Backbone.RelationalModel.extend({
    idAttribute:"id"
});

var C = Backbone.RelationalModel.extend({
    idAttribute:"id",
    relations:[
        {
            type:Backbone.HasOne,
            key:"a",
            relatedModel: A
        }
    ]
});
```

Now define the custom relational views:

```javascript
var AV = Backbone.RelationalView.extend({
    defaultConfig: $.extend(true, {}, Backbone.RelationalView.prototype.defaultConfig, {
        template:templateA
    })
});


var CV = Backbone.RelationalView.extend({
    defaultConfig: $.extend(true, {}, Backbone.RelationalView.prototype.defaultConfig, {
        template:templateC,
        subviewConfigs:{
            a:{
                template:templateA,
                viewType:AV
            }
        }
    })
});
```

By creating extensions of RelationalView, you establish the way in which a composite view structure will be built in response to changes in the backing relational models.

So now if you do this:

```javascript
var c = new C({
	id:"c1",
    value:"c1",
    a:{
	    id:"a1",
	    value:"a1"
    }
});

var cv = new CV({
    model:c,
    el:$("#somediv")
});
```

you'll have created a new view cv backed by model c, as well as a child view of type AV contained within cv, backed by a model contained within c, of type A.  In other words, Backbone Relational has automatically converted a deep Javascript object into a set of related models, and BBRV has used the custom RelationalView classes to create the corresponding deep view structure.  The entire result will be rendered into #somediv.

# Defining a relational view

Here's one of the relational view definitions from the intro:

```javascript
var CV = Backbone.RelationalView.extend({
    defaultConfig: $.extend(true, {}, Backbone.RelationalView.prototype.defaultConfig, {
        template:templateC,
        subviewConfigs:{
            a:{
                template:templateA,
                viewType:AV
            }
        }
    })
});
```
And here's what it means:

* The template supplied in the property of defaultConfig is used to render the the view (CV) itself.  
* The subviewConfigs define the type and templates of the views that CV will contain.  
* The keys for the subviewConfigs map correspond to the property keys in the model that backs CV

Let's say you want to define a relational view corresponding to a relational model with one HasOne relation and one HasMany relation.  You'd do it like this:

```javascript
var AV = bb.RelationalView.extend({
	defaultConfig: $.extend(true, {}, bb.RelationalView.prototype.defaultConfig, {
	    template:templateA
	})
});

var BV = bb.RelationalView.extend({
	defaultConfig: $.extend(true, {}, bb.RelationalView.prototype.defaultConfig, {
	    template:templateB
	})
});

var CV = bb.RelationalView.extend({
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

```

(of course, you'd have to define a template for BV, see the section on templating for more on this)

So this relational view structure corresponds to a data structure like this, for example:

```javascript
var data = {
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
}
```

and a relational model structure that looks like this:

```javascript
var A = Backbone.RelationalModel.extend({
    idAttribute:"id"
});

var B = Backbone.RelationalModel.extend({
    idAttribute:"id"
});

var C = Backbone.RelationalModel.extend({
    idAttribute:"id",
    relations:[
        {
            type:Backbone.HasOne,
            key:"a",
            relatedModel: A
        },
        {
            type:Backbone.HasMany,
            key:"bb",
            relatedModel: B
        }
    ]
});
```


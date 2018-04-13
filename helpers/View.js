const Debug = require_robinbase('base:Debug');

const View = function View(definition)
{
    const self = this;

    if (!(self instanceof View))
    {
        return new View(definition);
    }

    Object.assign(self, definition);

    if (typeof self._attributes !== 'function')
    {
        const _attributes = self._attributes || {}
        self._attributes = function(instance, authData)
        {
            return _attributes;
        }
    }

    if (!self.formLayouts)
    {
        self.formLayouts = {};
    }

    if (!self.formLayouts.clone)
    {
        self.formLayouts.clone = [];
    }
};

View.prototype.getAttributesForContext = function getAttributesForContext(context, instance, authData)
{
    const self = this;
    const attributes = self._attributes(instance, context, authData);
    return Object.keys(attributes).reduce(function(result, key)
    {
        const attribute = attributes[key];
        if (!Array.isArray(attribute.omitContexts) || !attribute.omitContexts.includes(context))
        {
            result[key] = attribute;
        }

        return result;
    }, {});
}

View.prototype.getListAttributes = function getListAttributes(authData)
{
    const self = this;
    return self.getAttributesForContext("table", null, authData);
}

View.prototype.getAutomaticJoins = function getAutomaticJoins(context, authData)
{
    const self = this;
    const attributes = self.getAttributesForContext(context, null, authData);

    const joins = [];

    for (var key in attributes)
    {
        if (typeof attributes[key].type != 'string')
        {
            continue;
        }
        if (typeof attributes[key].join != 'string')
        {
            continue;
        }
        if (!joins.includes(attributes[key].join))
        {
            joins.push(attributes[key].join);
        }
    }

    return joins;
}

View.prototype.getLayoutForContext = function getLayoutForContext(context, instance, authData)
{
    if (self.formLayouts && self.formLayouts[context])
    {
        return self.formLayouts[context];
    }

    const attributes = self._attributes(instance, authData);

    return Object.keys(attributes).reduce(function(result, key)
    {
        const attribute = attributes[key];
        if (!attribute.omitContext.includes(context))
        {
            result.push([key]);
        }
        return result;
    }, []);
}

View.displayField = function(attr, value)
{
    var out = '';
    if (typeof value === 'undefined')
    {
        return '';
    }

     if ((typeof attr.type == 'string')
        && (typeof attr.join == 'string')
        && (typeof value != 'undefined'))
    {
        attr.label = View.replaceStr(attr.label, attr.labelMap, value);

       /* if (typeof attr.defaultValue === 'string' && Array.isArray(value) && value.length === 0)
        {
            value = attr.defaultValue;
        }
        else
        {
            value = View.replaceStr(attr.value, attr.valueMap, value);
        }*/
        attr.immutable = true;
    }


    switch (attr.type)
    {
        case 'link':
        {
            var outObj = new Buffer(JSON.stringify({attr:attr, value:value}));
            out = `<span class="displayLink" data="${outObj.toString('base64')}"></span>`; //'<a href="'+value+'">'+attr.label+'</a>';
            break;
        }
        case 'time:datetime':
        {
            out = '<span class="localDateTime">'+value+'</span>';
            break;
        }
        case 'time:date':
        {
            out = '<span class="localDate">'+value+'</span>';
            break;
        }
        case 'time:time':
        {
            out = '<span class="localTime">'+value+'</span>';
            break;
        }
        case 'file:image':
        {
            out = '<span class="displayThumbnail" data="'+attr.baseUrl+'">'+value+'</span>'; //'<div class="tableThumbnail" style="background-image:url(\''+attr.baseUrl+value+'\');"></div>';
            break;
        }
        case 'boolean':
        {
            out = '<span class="displayBoolean">'+value+'</span>';

            break;
        }
        case 'inline':
        {
            var outObj = new Buffer(JSON.stringify({attr:attr, value:value}));

            out = `<span class="displayAttribute" data="${outObj.toString('base64')}"></span>`;//value;
            break;
        }
        case 'boolean':
        {
            out = '<span class="displayBoolean">'+value+'</span>';

            break;
        }
        case 'text':
        {
            if (Array.isArray(attr.values))
            {
                var outObj = new Buffer(JSON.stringify({attr:attr, value:value}));
                out = `<span class="displayEnumeration" data="${outObj.toString('base64')}">${value}</span>`;
            }
            else
            {
                out = value;
            }

            break;
        }
        default:
        {
            out = value;
        }
    }
    return out;
}

View.monthLabel = function(_num, _opt)
{
    var num = parseInt(_num);
    if (num > 11)
    {
        return '';
    }
    var labels = {};

    var opt = _opt || 'full';

    labels['short'] = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    labels['full'] = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    return labels[opt][num];
}

View.replaceStr = function(inStr, inArr, values)
{
    // Debug.log('INSTR:', inStr, inArr, values);
    if ((typeof inStr == 'string')
        && (Array.isArray(inArr)))
    {
        function index(obj,i) {
            return obj ? obj[i] : '' };
        for (var i=0; i<inArr.length; i++)
        {
            inStr = inStr.replace(/%s/,
                inArr[i].split('.').reduce(index, values) );
            // value[attr.labelValues[i]]);
        }
    }


    return inStr;
}

View.timeLengthLabel = function(_num, _millis)
{
    var num = _num || 0;
    var millis = _millis || false;

    if (millis == true)
    {
        num = num / 1000;
    }

    var out = '';

    function extraZero(inNum)
    {
        var extraZ = '';
        if (inNum < 10)
        {
            extraZ = '0';
        }
        return extraZ+''+inNum;
    }

    var s = Math.floor(num % 60);
    var m = Math.floor((num / 60) % 60);
    var h = Math.floor((num / (60 * 60)) % 24);

    out = extraZero(h)+':'+extraZero(m)+':'+extraZero(s)

    if (num < 60)
    {
        out = View.round(num, 3)+'s';
    }
    else if (num < 3600)
    {
        out = extraZero(m)+':'+extraZero(s)
    }
    else
    {
        out = extraZero(h)+':'+extraZero(m)+':'+extraZero(s)
    }

    /*if (num < 60)
     {
     var second = Math.floor(num);
     out = '00:'+extraZero(second);
     }
     else if (num < 3600)
     {
     var second = Math.floor(num % 60);
     out = extraZero(Math.floor(num / 60)) + ':'+extraZero(second);
     }
     else if (num < 86400)
     {
     var min = num % 3600;
     out = Math.floor(num / 3600) + ':'+extraZero(min);
     }
     else
     {
     out = Math.round(num / 86400) + ' d';
     }*/


    return out;

}

module.exports = View;

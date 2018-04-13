const PathFinder = {};

PathFinder.lookup = function(obj, path)
{
    return PathFinder.lookupApply(obj, path, null);
}

PathFinder.lookupApply = function(obj, path, fn, iterationKeys = [])
{
    if (typeof path === 'string')
    {
        path = PathFinder.smartSplit(path);
    }

    if (!Array.isArray(path))
    {
        return undefined;
    }

    if (path.length === 0)
    {
        return typeof fn === 'function' ? fn(obj, iterationKeys) : obj;
    }

    const [key, ...nextPath] = path;

    if (typeof key !== 'string' && typeof key !== 'number')
    {
        return undefined;
    }

    if (key === '[]')
    {
        // TODO: consider supporting set objects with this syntax

        if (!Array.isArray(obj))
        {
            obj = [obj];
        }

        return obj.map((sub, index) => PathFinder.lookupApply(sub, nextPath, fn, iterationKeys.concat([index])));
    }

    if (key === '{}')
    {
        if (obj == null || typeof obj !== 'object')
        {
            obj = {};
        }

        if (obj instanceof Map)
        {
            return Array.from(obj.entries()).reduce((res, [k, v]) =>
            {
                res.set(k, PathFinder.lookupApply(v, nextPath, fn, iterationKeys.concat([k])));
                return res;
            }, new Map());
        }

        return Object.keys(obj).reduce((res, k) =>
        {
            res[k] = PathFinder.lookupApply(obj[k], nextPath, fn, iterationKeys.concat([k]))
            return res;
        }, {});
    }

    if (obj == null || typeof obj !== 'object')
    {
        return PathFinder.lookupApply(undefined, nextPath, fn, iterationKeys);
    }

    const nextObj = (obj instanceof Map && obj.has(key)) ? obj.get(key) : obj[key];

    return PathFinder.lookupApply(nextObj, nextPath, fn, iterationKeys);
}

PathFinder.lookupSet = function(obj, path, value)
{
    if (typeof path === 'string')
    {
        path = PathFinder.smartSplit(path);
    }

    if (!Array.isArray(path))
    {
        return obj;
    }

    if (path.length === 0)
    {
        return value;
    }

    const [key, ...nextPath] = path;

    if (typeof key !== 'string' && typeof key !== 'number')
    {
        return obj;
    }

    if (key === '[]')
    {
        // TODO: consider supporting set objects with this syntax

        if (!Array.isArray(value))
        {
            value = [value];
        }

        if (!Array.isArray(obj))
        {
            obj = [];
        }

        value.forEach((sub, i) =>
        {
            const usePath = [String(i)].concat(nextPath);
            return PathFinder.lookupSet(obj, usePath, sub);
        });

        return obj;
    }

    if (obj == null)
    {
        obj = {};
    }

    // here we need to handle different object types
    // some objects, such as dates and regular expressions,
    // are not really valid for the sort of operation we are
    // doing here
    switch(obj.constructor)
    {
        case Object:
        case Map:
        case Array:
        case undefined:
            break;
        default:
            obj = {};
    }

    if (key === '{}')
    {
        if (value == null || typeof value !== 'object')
        {
            value = {};
        }

        if (value instanceof Map)
        {
            Array.from(value.entries()).forEach(([k,v]) =>
            {
                const usePath = [k].concat(nextPath);
                return PathFinder.lookupSet(obj, usePath, v);
            });
        }
        else
        {
            Object.keys(value).forEach((k) =>
            {
                const usePath = [k].concat(nextPath);
                return PathFinder.lookupSet(obj, usePath, value[k]);
            });
        }

        return obj;
    }


    if (Array.isArray(obj) && /^[0-9]+$/.test(key) == false)
    {
        // convert the array into an object when a non-integer key is set
        // we need to decide if this is the right behavior, or if we should
        // just let it do its thing and set a non-integer property on an array

        const newObj = {};
        for (let k in obj)
        {
            newObj[k] = obj[k];
        }

        obj = newObj;
    }

    const setValue = PathFinder.lookupSet(obj[key], nextPath, value);
    if (obj instanceof Map)
    {
        obj.set(key, setValue);
    }
    else
    {
        obj[key] = setValue;
    }

    return obj;
}

PathFinder.smartSplit = function(splitStr)
{
    splitStr = escapeKey(splitStr);
    splitStr = normalizeKey(splitStr);
    return splitStr.split(/\s*\.\s*/g).map(unescapeKeyPart);
}

// Normalize bracket syntax for split:  a[b] -> a.b
//                                      a[]  -> a.[]
function normalizeKey(k)
{
    return k.replace(/\[([^\[\]]*)\]/g, (match, match1, offset) =>
    {
        if (match1 === '')
        {
            if (offset === 0)
            {
                return '[]';
            }

            return '.[]';
        }

        const key = escapeKeyPart(match1);

        return `.${key}`;
    }).replace(/\{\}/, (match, offset) => offset === 0 ? '{}' : '.{}');
}

// Escape backslash escaped parts of key: 'key1\\[key2\\]' -> 'key1###LBRACK##key2###RBRACK'
function escapeKey(k)
{
    return k.replace(/\\(\[|\]|\{|\})/g, (m, m1) => {
        switch(m1) {
            case '[':
                return '###LBRACK###';
            case ']':
                return '###RBRACK###';
            case '{':
                return '###LCBRACK###';
            case '}':
                return '###RCBRACK###';
        }

        return '';
    });
}

// Escape special characters in bracketed key part: 'k[l.m]' => k[l###DOT###m]
function escapeKeyPart(k)
{
    return k.replace(/(\.|\s)/g, (m, m1) => {
        switch(m1) {
            case '.':
                return '###DOT###';
            case ' ':
                return '###SPACE###';
            case '\t':
                return '###TAB###';
        }

        // TODO: handle other whitespace characters

        return '';
    });
}

// Convert a key part back to what it should be: l###DOT###m -> l.m
function unescapeKeyPart(k)
{
    return k.replace(/###(DOT|SPACE|TAB|LBRACK|RBRACK|LCBRACK|RCBRACK)###/g, (m, m1) =>
    {
        switch(m1) {
            case 'DOT':
                return '.';
            case 'SPACE':
                return ' ';
            case 'TAB':
                return '\t';
            case 'LBRACK':
                return '[';
            case 'RBRACK':
                return ']';
            case 'LCBRACK':
                return '{';
            case 'RCBRACK':
                return '}';
        }

        return '';
    });
}

module.exports = PathFinder;

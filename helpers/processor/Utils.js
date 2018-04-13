/**
 * Created by dc on 3/18/15.
 */
(function()
{
    //methods for handling polls
    var Utils = function Utils()
    {};

    Utils.genStr = function genStr(len)
    {
        var rdmString = '';
        for (var i = 0; rdmString.length < len; rdmString += Math.random().toString(36).substr(2));
        return rdmString.substr(0, len);
    }

    Utils.serverStartTime = new Date();

    Utils.hexToRgb = function hexToRgb(hex) {
        var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    Utils.hexToRgbString = function hexToRgbString(hex, alpha) {
        alpha = typeof alpha == 'undefined' ? 1 : alpha;
        var rgb = Utils.hexToRgb(hex);

        if (!rgb) {
            return '';
        }

        return 'rgba(' + rgb.r + ',' + rgb.g + ',' + rgb.b + ',' + alpha + ')';

    };

    Utils.convertStringToObject = function convertStringToObject(string, parent, separator)
    {
        function multiIndex(obj, array)
        {
            if(typeof obj == 'undefined')
            {
                return false;
            }

            if(array.length <= 0)
            {
                return obj;
            }

            return multiIndex(obj[array[0]],array.slice(1));
        }

        function pathIndex(obj, string)
        {
            if(!separator)
            {
                separator = '/';
            }
            return multiIndex(obj, string.split(separator))
        }

        return pathIndex(parent, String(string))
    }

    Utils.addSlashes = function addslashes(str)
    {
        return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
    }

    Utils.getRandomInt = function getRandomInt(min, max)
    {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    module.exports = Utils;
}).call(this);
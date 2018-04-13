(function()
{
    var Config = require('../../config.js');
    var Utils = require('./Utils.js');
    //start connection...

    var widgets = function widgets()
    {
        var self = this;

        function addslashesjson(str)
        {
            return (str + '').replace(/[\\"]/g, '\\$&').replace(/\u0000/g, '\\0');
        }

        function addslashes(str)
        {
            return (str + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
        }


        //this is used for versioning static files. Gets reset when the server resets.
        //allows us to cache files on the browser but still allow us to update them at will
        self.serverTime = function serverTime(args, processData, parentScope)
        {
            parentScope.callback(null, Utils.serverStartTime.getTime());
        }

        self.webHost = function webHost(args, processData, parentScope)
        {
            if ((Config.RB_PUBLIC_DOMAIN != 'undefined') && (Config.RB_PUBLIC_DOMAIN != ''))
            {
                return parentScope.callback(null, Config.RB_PUBLIC_DOMAIN);
            }
            parentScope.callback(null, Config.RB_WEB_HOST+':'+Config.RB_WEB_PORT);
        }



        /* self.cdnPath = function cdnPath(args, processData, parentScope)
         {
             var cdnPath = Config.CDNURI;
             if(cdnPath)
             {
                 parentScope.callback(null, cdnPath);
             }
             else
             {
                 parentScope.callback(null, '');
             }
         };*/

        self.signUpBtn = function signUpBtn(args, processData, parentScope)
        {
            var btnOut = '<li><a href="/create-account"><button><i class="fa fa-user-plus"></i>Sign Up</button></a></li>';
            if (typeof processData.session.token != 'undefined')
            {
                btnOut = '<li><a href="/account"><button><i class="fa fa-user"></i>'+processData.session.user.firstName+'</button></a></li>'+
                            '<li><a href="/logout"><button><i class="fa fa-sign-out"></i>Logout</button></a></li>';
            }
            parentScope.callback(null, btnOut);
        }




    };
    module.exports = widgets;
}).call();

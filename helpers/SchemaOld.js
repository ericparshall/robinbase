(function(){

    var bcrypt = require('bcrypt');

    var Schema = function Schema() {};

    Schema.boolean = function boolean(input, defaultValue)
    {
        if (typeof defaultValue != 'boolean')
        {
            throw 'Boolean declarations require a default value of either true or false';
            return;
        }
        if(typeof input == 'boolean')
        {
            return input;
        }

        if (defaultValue == true)
        {
            if(input == 'false' || input == 0 || input == false)
            {
                return false;
            }
            else
            {
                return true;
            }
        }
        else
        {
            if(input == 'true' || input == 1 || input == true)
            {
                return true;
            }
            else
            {
                return false;
            }
        }
    }

    Schema.integer = function integer(input, defaultValue)
    {
        if (Number.isInteger(defaultValue) == false)
        {
            throw 'Integer declarations must have a default value with a whole number';
            return;
        }
        if (Number.isInteger(input) == false)
        {
            return defaultValue;
        }
        return input;

    }

    Schema.options = function options(input, validSet, defaultValue)
    {
        var retVal = '';
        if (defaultValue != null)
        {
            retVal = defaultValue;
        }
        if (!Array.isArray(validSet))
        {
            return retVal;
        }
        if (validSet.indexOf(input) != -1)
        {
            return input;
        }
        return retVal;
    }

    Schema.email = function email(input)
    {
        if (typeof input != 'string')
        {
            return false;
        }
        var emailRegExp = /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i;
        if (!emailRegExp.test(input))
        {
            return false;
        }
        return input.toLowerCase();
    }

    Schema.requires = function requires(properties, obj)
    {
        var propLen = properties.length;
        for (var i=0; i<propLen; i++)
        {
            if( Object.prototype.toString.call( properties[i] ) === '[object Array]' )
            {
                //do an OR operation on the info inside.  At least one has to be true...
                var isOneFound = false;
                for (var d=0; d<properties[i].length; d++)
                {
                    if ((typeof obj[properties[i][d]] != 'undefined') &&
                        (obj[properties[i][d]] != null))
                    {
                        isOneFound = true;
                        break;
                    }
                }
                if (isOneFound == true)
                {
                    return true;
                }
                return properties[i].join(' or '); //tell them that at least one must be present.

                continue;
            }

            if (typeof obj[properties[i]] === 'undefined')
            {
                return properties[i];
            }

            if (obj[properties[i]] == null)
            {
                return properties[i];
            }
        }
        return true;
    }

    Schema.stripHTML = function stripHTML(str)
    {
        if (typeof str != 'string')
        {
            return '';
        }
        while (str.search(/<[^<]+?>/) != -1)
        {
            str = str.replace(/<[^<]+?>/g, '');
        }
        str = str.replace(/[<|>]/g, '');
        return str.trim();
    }

    Schema.trim = function trim(str)
    {
        return str.trim();
    }

    Schema.round = function(num, places) {
        var multiplier = Math.pow(10, places);
        return Math.round(num * multiplier) / multiplier;
    }



    Schema.guid = function guid(_pattern)
    {
        var pattern = _pattern || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'; //compliant guid pattern.

        var d = new Date().getTime();
        var uuid = pattern.replace(/[xy]/g, function(c) {
            var r = (d + Math.random()*16)%16 | 0;
            d = Math.floor(d/16);
            return (c=='x' ? r : (r&0x3|0x8)).toString(16);
        });
        return uuid;
    }

    Schema.hashPassword = function hashPassword(pass, callback, validations)
    {

        if (typeof validations !== 'array')
        {
            validations = [
                /[A-Z]/,
                /\d/,
                /\W/,
                /[a-z]/
            ]
        }

        if (!pass || typeof pass !== 'string')
        {
            return callback("Password was empty.", false);
        }

        for (var i = 0; i < validations.length; i++)
        {
            if (pass.search(validations[i]) == -1)
            {
                return callback('Password must contain at least one uppercase and one lower case letter, at least one symbol and at least one number.', false);
            }
        }

        bcrypt.genSalt(10, function(err, genSalt){
            if (err)
            {
                return callback(err, false);
            }
            bcrypt.hash(pass, genSalt, callback);
        });


    }

    Schema.states = [['AL',  'Alabama'],
        ['AK',  'Alaska'],
        ['AS',  'American Samoa'],
        ['AZ',  'Arizona'],
        ['AR',  'Arkansas'],
        ['CA',  'California'],
        ['CO',  'Colorado'],
        ['CT',  'Connecticut'],
        ['DE',  'Delaware'],
        ['DC',  'District of Columbia'],
        ['FL',  'Florida'],
        ['GA',  'Georgia'],
        ['GU',  'Guam'],
        ['HI',  'Hawaii'],
        ['ID',  'Idaho'],
        ['IL',  'Illinois'],
        ['IN',  'Indiana'],
        ['IA',  'Iowa'],
        ['KS',  'Kansas'],
        ['KY',  'Kentucky'],
        ['LA',  'Louisiana'],
        ['ME',  'Maine'],
        ['MD',  'Maryland'],
        ['MH',  'Marshall Islands'],
        ['MA',  'Massachusetts'],
        ['MI',  'Michigan'],
        ['FM',  'Micronesia'],
        ['MN',  'Minnesota'],
        ['MS',  'Mississippi'],
        ['MO',  'Missouri'],
        ['MT',  'Montana'],
        ['NE',  'Nebraska'],
        ['NV',  'Nevada'],
        ['NH',  'New Hampshire'],
        ['NJ',  'New Jersey'],
        ['NM',  'New Mexico'],
        ['NY',  'New York'],
        ['NC',  'North Carolina'],
        ['ND',  'North Dakota'],
        ['MP',  'Northern Marianas'],
        ['OH',  'Ohio'],
        ['OK',  'Oklahoma'],
        ['OR',  'Oregon'],
        ['PW',  'Palau'],
        ['PA',  'Pennsylvania'],
        ['PR',  'Puerto Rico'],
        ['RI',  'Rhode Island'],
        ['SC',  'South Carolina'],
        ['SD',  'South Dakota'],
        ['TN',  'Tennessee'],
        ['TX',  'Texas'],
        ['UT',  'Utah'],
        ['VT',  'Vermont'],
        ['VA',  'Virginia'],
        ['VI',  'Virgin Islands'],
        ['WA',  'Washington'],
        ['WV',  'West Virginia'],
        ['WI',  'Wisconsin'],
        ['WY',  'Wyoming'],
        ['BC', 'British Columbia']];

    Schema.countryCodesVerbose = [["AD", "Andorra"],
        ["AE", "United Arab Emirates"],
        ["AF", "Afghanistan"],
        ["AG", "Antigua and Barbuda"],
        ["AI", "Anguilla"],
        ["AL", "Albania"],
        ["AM", "Armenia"],
        ["AO", "Angola"],
        ["AQ", "Antarctica"],
        ["AR", "Argentina"],
        ["AS", "American Samoa"],
        ["AT", "Austria"],
        ["AU", "Australia"],
        ["AW", "Aruba"],
        ["AX", "Åland Islands"],
        ["AZ", "Azerbaijan"],
        ["BA", "Bosnia and Herzegovina"],
        ["BB", "Barbados"],
        ["BD", "Bangladesh"],
        ["BE", "Belgium"],
        ["BF", "Burkina Faso"],
        ["BG", "Bulgaria"],
        ["BH", "Bahrain"],
        ["BI", "Burundi"],
        ["BJ", "Benin"],
        ["BL", "Saint Barthélemy"],
        ["BM", "Bermuda"],
        ["BN", "Brunei Darussalam"],
        ["BO", "Bolivia, Plurinational State of"],
        ["BQ", "Bonaire, Sint Eustatius and Saba"],
        ["BS", "Bahamas"],
        ["BT", "Bhutan"],
        ["BV", "Bouvet Island"],
        ["BW", "Botswana"],
        ["BY", "Belarus"],
        ["BZ", "Belize"],
        ["CA", "Canada"],
        ["CC", "Cocos (Keeling) Islands"],
        ["CD", "Congo, the Democratic Republic of the"],
        ["CF", "Central African Republic"],
        ["CG", "Congo"],
        ["CH", "Switzerland"],
        ["CI", "Côte d'Ivoire"],
        ["CK", "Cook Islands"],
        ["CL", "Chile"],
        ["CM", "Cameroon"],
        ["CN", "China"],
        ["CO", "Colombia"],
        ["CR", "Costa Rica"],
        ["CU", "Cuba"],
        ["CV", "Cabo Verde"],
        ["CW", "Curaçao"],
        ["CX", "Christmas Island"],
        ["CY", "Cyprus"],
        ["CZ", "Czechia"],
        ["DE", "Germany"],
        ["DJ", "Djibouti"],
        ["DK", "Denmark"],
        ["DM", "Dominica"],
        ["DO", "Dominican Republic"],
        ["DZ", "Algeria"],
        ["EC", "Ecuador"],
        ["EE", "Estonia"],
        ["EG", "Egypt"],
        ["EH", "Western Sahara"],
        ["ER", "Eritrea"],
        ["ES", "Spain"],
        ["ET", "Ethiopia"],
        ["FI", "Finland"],
        ["FJ", "Fiji"],
        ["FK", "Falkland Islands (Malvinas)"],
        ["FM", "Micronesia, Federated States of"],
        ["FO", "Faroe Islands"],
        ["FR", "France"],
        ["GA", "Gabon"],
        ["GB", "United Kingdom of Great Britain and Northern Ireland"],
        ["GD", "Grenada"],
        ["GE", "Georgia"],
        ["GF", "French Guiana"],
        ["GG", "Guernsey"],
        ["GH", "Ghana"],
        ["GI", "Gibraltar"],
        ["GL", "Greenland"],
        ["GM", "Gambia"],
        ["GN", "Guinea"],
        ["GP", "Guadeloupe"],
        ["GQ", "Equatorial Guinea"],
        ["GR", "Greece"],
        ["GS", "South Georgia and the South Sandwich Islands"],
        ["GT", "Guatemala"],
        ["GU", "Guam"],
        ["GW", "Guinea-Bissau"],
        ["GY", "Guyana"],
        ["HK", "Hong Kong"],
        ["HM", "Heard Island and McDonald Islands"],
        ["HN", "Honduras"],
        ["HR", "Croatia"],
        ["HT", "Haiti"],
        ["HU", "Hungary"],
        ["ID", "Indonesia"],
        ["IE", "Ireland"],
        ["IL", "Israel"],
        ["IM", "Isle of Man"],
        ["IN", "India"],
        ["IO", "British Indian Ocean Territory"],
        ["IQ", "Iraq"],
        ["IR", "Iran, Islamic Republic of"],
        ["IS", "Iceland"],
        ["IT", "Italy"],
        ["JE", "Jersey"],
        ["JM", "Jamaica"],
        ["JO", "Jordan"],
        ["JP", "Japan"],
        ["KE", "Kenya"],
        ["KG", "Kyrgyzstan"],
        ["KH", "Cambodia"],
        ["KI", "Kiribati"],
        ["KM", "Comoros"],
        ["KN", "Saint Kitts and Nevis"],
        ["KP", "Korea, Democratic People's Republic of"],
        ["KR", "Korea, Republic of"],
        ["KW", "Kuwait"],
        ["KY", "Cayman Islands"],
        ["KZ", "Kazakhstan"],
        ["LA", "Lao People's Democratic Republic"],
        ["LB", "Lebanon"],
        ["LC", "Saint Lucia"],
        ["LI", "Liechtenstein"],
        ["LK", "Sri Lanka"],
        ["LR", "Liberia"],
        ["LS", "Lesotho"],
        ["LT", "Lithuania"],
        ["LU", "Luxembourg"],
        ["LV", "Latvia"],
        ["LY", "Libya"],
        ["MA", "Morocco"],
        ["MC", "Monaco"],
        ["MD", "Moldova, Republic of"],
        ["ME", "Montenegro"],
        ["MF", "Saint Martin (French part)"],
        ["MG", "Madagascar"],
        ["MH", "Marshall Islands"],
        ["MK", "Macedonia, the former Yugoslav Republic of"],
        ["ML", "Mali"],
        ["MM", "Myanmar"],
        ["MN", "Mongolia"],
        ["MO", "Macao"],
        ["MP", "Northern Mariana Islands"],
        ["MQ", "Martinique"],
        ["MR", "Mauritania"],
        ["MS", "Montserrat"],
        ["MT", "Malta"],
        ["MU", "Mauritius"],
        ["MV", "Maldives"],
        ["MW", "Malawi"],
        ["MX", "Mexico"],
        ["MY", "Malaysia"],
        ["MZ", "Mozambique"],
        ["NA", "Namibia"],
        ["NC", "New Caledonia"],
        ["NE", "Niger"],
        ["NF", "Norfolk Island"],
        ["NG", "Nigeria"],
        ["NI", "Nicaragua"],
        ["NL", "Netherlands"],
        ["NO", "Norway"],
        ["NP", "Nepal"],
        ["NR", "Nauru"],
        ["NU", "Niue"],
        ["NZ", "New Zealand"],
        ["OM", "Oman"],
        ["PA", "Panama"],
        ["PE", "Peru"],
        ["PF", "French Polynesia"],
        ["PG", "Papua New Guinea"],
        ["PH", "Philippines"],
        ["PK", "Pakistan"],
        ["PL", "Poland"],
        ["PM", "Saint Pierre and Miquelon"],
        ["PN", "Pitcairn"],
        ["PR", "Puerto Rico"],
        ["PS", "Palestine, State of"],
        ["PT", "Portugal"],
        ["PW", "Palau"],
        ["PY", "Paraguay"],
        ["QA", "Qatar"],
        ["RE", "Réunion"],
        ["RO", "Romania"],
        ["RS", "Serbia"],
        ["RU", "Russian Federation"],
        ["RW", "Rwanda"],
        ["SA", "Saudi Arabia"],
        ["SB", "Solomon Islands"],
        ["SC", "Seychelles"],
        ["SD", "Sudan"],
        ["SE", "Sweden"],
        ["SG", "Singapore"],
        ["SH", "Saint Helena, Ascension and Tristan da Cunha"],
        ["SI", "Slovenia"],
        ["SJ", "Svalbard and Jan Mayen"],
        ["SK", "Slovakia"],
        ["SL", "Sierra Leone"],
        ["SM", "San Marino"],
        ["SN", "Senegal"],
        ["SO", "Somalia"],
        ["SR", "Suriname"],
        ["SS", "South Sudan"],
        ["ST", "Sao Tome and Principe"],
        ["SV", "El Salvador"],
        ["SX", "Sint Maarten (Dutch part)"],
        ["SY", "Syrian Arab Republic"],
        ["SZ", "Swaziland"],
        ["TC", "Turks and Caicos Islands"],
        ["TD", "Chad"],
        ["TF", "French Southern Territories"],
        ["TG", "Togo"],
        ["TH", "Thailand"],
        ["TJ", "Tajikistan"],
        ["TK", "Tokelau"],
        ["TL", "Timor-Leste"],
        ["TM", "Turkmenistan"],
        ["TN", "Tunisia"],
        ["TO", "Tonga"],
        ["TR", "Turkey"],
        ["TT", "Trinidad and Tobago"],
        ["TV", "Tuvalu"],
        ["TW", "Taiwan, Province of China"],
        ["TZ", "Tanzania, United Republic of"],
        ["UA", "Ukraine"],
        ["UG", "Uganda"],
        ["UM", "United States Minor Outlying Islands"],
        ["US", "United States of America"],
        ["UY", "Uruguay"],
        ["UZ", "Uzbekistan"],
        ["VA", "Holy See"],
        ["VC", "Saint Vincent and the Grenadines"],
        ["VE", "Venezuela, Bolivarian Republic of"],
        ["VG", "Virgin Islands, British"],
        ["VI", "Virgin Islands, U.S."],
        ["VN", "Viet Nam"],
        ["VU", "Vanuatu"],
        ["WF", "Wallis and Futuna"],
        ["WS", "Samoa"],
        ["YE", "Yemen"],
        ["YT", "Mayotte"],
        ["ZA", "South Africa"],
        ["ZM", "Zambia"],
        ["ZW", "Zimbabwe"]];

    /*
     Todo: Why are there differences? ...
     mismatch 29 BQ
     mismatch 49 CU
     mismatch 51 CW
     mismatch 106 IR
     mismatch 119 KP
     mismatch 194 SD
     mismatch 206 SS
     mismatch 209 SX
     mismatch 210 SY
     mismatch:type:2 30 BR
     mismatch:type:2 65 U1
     mismatch:type:2 152 AN
     mismatch:type:2 153 NT
     mismatch:type:2 161 U4
     mismatch:type:2 193 U3
     mismatch:type:2 240 U2
     */


    module.exports = Schema;

}).call(this);
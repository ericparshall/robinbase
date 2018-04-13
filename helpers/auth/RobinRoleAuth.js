var Schema = require('../Schema.js');
var Debug = require('../Debug.js').prefix('robinauth');
var bcrypt = require('bcrypt');
var AuthorizationResult = require('./RoleAuthorizationResult');
var _ = require('lodash');

module.exports = function(options)
{
    options = options || {};

    var AccountModel = options.userClass;
    var TokenModel = options.tokenClass || require('../../model/Token');
    var PolicyModel = options.policyClass || require('../../model/RolePolicy');
    var RoleModel = options.roleClass || require('../../model/Role');
    var PasswordResetTokenModel = options.passwordResetTokenClass || require('../../model/PasswordResetToken');
    var usernameKey = options.usernameKey || 'email';
    var emailKey = options.emailKey || 'email';
    var passwordHashKey = options.passwordHashKey || 'passwordHash';
    var passwordKey = options.passwordKey || 'password';
    var passwordResetTemplate = options.passwordResetTemplate || "templates.admin.emails.password-reset";
    var tokenUserKey = options.tokenUserKey || 'userId';
    var verifyQueryKey = options.verifyQueryKey || 'key';
    var verifiedKey = options.verifiedKey || 'verified';
    var verifyKey = options.verifyKey || 'verifyKey';
    var userRoleKey = options.accountRoleKey || 'role';
    var policyRolesKey = options.policyRoleKey || 'roles';
    var unauthenticatedUserData = options.unauthenticatedUserData || null;
    var roleCacheTTL = options.roleCacheExpire || (1000 * 60 * 5) // 5 minutes
    var tokenKey = options.tokenKey || 'token';
    var onLoadData = options.onLoadData || function(user, callback) { callback(null); };

    // TODO: more options??

    var auth = {};

    var authorizationCache = {};

    // This will require that the user verifies their email address after they have registered
    var enforceVerification = Schema.boolean.default(true).set(options.enforceVerification);

    auth.login = function(data, callback)
    {
        var username = '';
        if (AccountModel.schema && AccountModel.schema.props[usernameKey])
        {
            username = AccountModel.schema.props[usernameKey].set(data[usernameKey], null);
            try
            {
                AccountModel.schema.props[usernameKey].test(username);
            }
            catch(e)
            {
                return callback(e);
            }
        }
        else
        {
            return callback('Could not determine username is authentication schema');
        }

        var password = data[passwordKey];

        var accountQuery = {};
        accountQuery[usernameKey] = username;

        if (enforceVerification)
        {
            accountQuery[verifiedKey] = true;
        }

        AccountModel.crud.getOne(accountQuery, function(err, result) {
            if (err)
            {
                Debug.warn('Error calling database for email on login.', err);
                return callback('Could not log in due to unexpected issue.  Please try again later. [0]', null);
            }
            if (result == null) { return callback('Could not log in.  Please check your '+usernameKey+' and password.', null);}

            var passwordHash = result[passwordHashKey];

            bcrypt.compare(password, passwordHash, function(err, res)
            {
                if (err)
                {
                    Debug.warn('Issue with the bcrypt comparison.', err);
                    return callback('Could not log in due to unexpected issue.  Please try again later. [1]', null);
                }
                if (res === true)
                {
                    generateToken(result, callback);
                }
                else
                {
                    return callback('Could not log in.  Please check your ' + usernameKey + ' and password.', null);
                }
            });
        });
    }

    if (enforceVerification)
    {
        auth.verify = function(data, callback)
        {
            if (typeof data[verifyQueryKey] == 'undefined')
            {
                return callback('No verification key included in the request.');
            }

            var verifyVar = data[verifyQueryKey];

            try
            {
                var failure = AccountModel.schema.props[verifyKey].test(verifyVar);
                if (failure)
                {
                    return callback('Unexpected format for verify key.');
                }
            }
            catch(e)
            {
                return callback('Unexpected format for verify key.');
            }

            var query = {};
            query[verifyKey] = verifyVar;
            query[verifiedKey] = false;

            var update = {};
            update[verifiedKey] = true;

            AccountModel.crud.update(query, update, function(err, result){

                if (err)
                {
                    Debug.error('Error calling database for write.', err);
                    return callback('Error verifying account in database.');
                }
                if (result)
                {
                    // log the user in
                    query[verifiedKey] = true;
                    AccountModel.crud.get(query, {skip:0, limit:1}, function(err, result){
                        if (err)
                        {
                            Debug.error('Error calling database for verify key.', err);
                            return callback('error verifying account', null);
                        }
                        if (!Array.isArray(result) || !result[0]) { return callback('Could not find the account.', null);}
                        generateToken(result[0], callback);
                    });
                }
                else
                {
                    callback('Could not verify this account at this time.');
                }

            });
        }

        auth.verificationKey = 'key';
    }

    auth.logout = function(data, callback)
    {
        // delete the token
        if (data.token)
        {
            function removeToken()
            {
                TokenModel.crud.delete({value: data.token}, function(err, result) {
                    if (err)
                    {
                        Debug.error('Issue with deleting a token', err);
                        // don't fail here
                        //return callback("Could not delete the token.");
                    }

                    callback(null, {});
                });
            }

            removeToken();
        }
        else
        {
            callback(null, {});
        }
    }

    auth.sendResetPasswordEmail = function(email, fromEmail, baseURL, title, callback)
    {
        var TemplateProcessor = require('../processor/templateProcessor');
        var TemplateLoader = require('../processor/TemplateLoader');
        var WidgetRegistry = require('../processor/WidgetRegistry');
        var sendEmail = options.sendEmail || require_robinbase("config").sendEmail;

        AccountModel.crud.getOne({[emailKey]: email}, function(err, user)
        {

            if (!user)
            {
                // don't let them know we didn't find it...for security
                return callback(null, "A link to reset your password was sent to your email address");
            }

            PasswordResetTokenModel.crud.create({userId: user._id}, function(err, token)
            {
                if (err)
                {
                    return callback(err);
                }


                var resetLink = baseURL+'/'+AccountModel.view.route+'/reset-password?key='+token.value;
                user = user.toJSON();
                token = token.toJSON();
                var processData = {token,resetLink,user};

                var processor = new TemplateProcessor();
                processor.init(TemplateLoader.templateData[passwordResetTemplate], processData);
                processor.process(_.cloneDeep(WidgetRegistry.methods), function(err, result)
                {
                    if (err)
                    {
                        return callback(err);
                    }

                    Debug.debug('FROM EMAIL: ', fromEmail);
                    sendEmail(email, fromEmail, title, processor.templateContents, processor.templateContents);

                    callback(null, "A link to reset your password was sent to your email address");

                });
            });
        });
    }

    auth.hasValidPasswordResetToken = function(tokenValue, callback)
    {
        PasswordResetTokenModel.crud.count({value: tokenValue}, function(err, count)
        {
            callback(err, count === 1);
        });
    }

    auth.updatePassword = function(tokenValue, newPassword, callback)
    {
        PasswordResetTokenModel.crud.getOne({value: tokenValue}, function(err, token)
        {
            if (err)
            {
                return callback(err);
            }

            if (!token)
            {
                return callback(null, null);
            }

            AccountModel.crud.update({_id: token.userId}, {password:newPassword}, function(err, user)
            {
                if (err)
                {
                    return callback(err);
                }

                return callback(null, "Your password was reset successfully");
            });
        });
    }

    auth.check = function(data, callback)
    {
        var token = data ? data[tokenKey] : null;
        return requireToken(token, callback);
    }

    auth.isLoggedIn = function(data)
    {
        return !!data && !!data[tokenKey];
    }

    auth.loadData = function(authData, callback)
    {
        if (!authData[tokenUserKey])
        {
            return callback(null, unauthenticatedUserData);
        }

        AccountModel.crud.getOne({_id: authData[tokenUserKey]}, {}, function(err, user)
        {
            if (err)
            {
                return callback(err, null);
            }
            if (!user)
            {
                return callback(null, unauthenticatedUserData);
            }

            user = Object.assign(authData, user);

            onLoadData(user, function(err){
                callback(err, user);
            });

        });
    }

    auth.authorize = function(modelKey, user, authData, callback)
    {
        if (!user)
        {
            return process.nextTick(callback, null, new AuthorizationResult(modelKey, {}).denyAll());
        }

        var model = require('../../config.js').allModels[modelKey];
        var schema = null;
        if (model)
        {
            schema = model.schema;
        }

        var authResult = new AuthorizationResult(modelKey, Object.assign({}, authData, user), schema);

        if (!PolicyModel || !RoleModel)
        {
            // allow everything for everybody
            return process.nextTick(callback, null, authResult.allowAll());
        }

        var role = user[userRoleKey] || '*';

        // load policies
        var cacheKey = role + "___" + modelKey;
        var now = Date.now();
        if (authorizationCache[cacheKey] && authorizationCache[cacheKey].expires > now)
        {
            authResult.setPolicies(authorizationCache[cacheKey].data);
            process.nextTick(callback, null, authResult);
        }
        else
        {
            var roleQuery = {name: role};
            RoleModel.crud.getOne(roleQuery, function(err, roleObj)
            {
                if (err)
                {
                    return callback(err, null);
                }

                else if (!roleObj)
                {
                    return callback(null, authResult.denyAll());
                }

                var policyIds = roleObj.policies;
                var policyQuery = {_id: {$in: policyIds}}
                var policyIndexMap = {};
                policyIds.forEach(function(id, index){
                    policyIndexMap[id] = index;
                });

                PolicyModel.crud.get(policyQuery, {}, function(err, policies)
                {
                    if (err)
                    {
                        Debug.warn('Error loading policies', err);
                        return callback(err, null);
                    }

                    policies.sort(function(left, right)
                    {
                        // is this worth optimizing?
                        return policyIndexMap[left[PolicyModel.schema.useId]] - policyIndexMap[right[PolicyModel.schema.useId]];
                    });

                    authResult.runProcess(policies);
                    var storeData = authResult.getPolicies();
                    authorizationCache[cacheKey] = {
                        data: storeData,
                        expires: now + roleCacheTTL
                    }

                    callback(null, authResult);
                });
            });
        }

    }

    function generateToken(_account, callback)
    {
        var account = new AccountModel(_account);
        var newToken = new TokenModel({[tokenUserKey]: account[AccountModel.schema.useId]});

        if (typeof account.toJSON === 'function')
        {
            account = account.toJSON();
        }

        var role = _account[userRoleKey] || '*';
        if (typeof newToken.loginAs != 'undefined')
        {
            newToken.loginAs = role;
        }

        TokenModel.crud.create(newToken, function (err, result) {
            if (err)
            {
                Debug.error('Issue with inserting new token', err);
                return callback('Could not log in due to unexpected issue.  Please try again later. [2]', null);
            }
            if (result)
            {
                account[tokenKey] = result.value;
                callback(err, account);
            }
            else
            {
                Debug.error('Issue with inserting new token', err);
                return callback('Could not log in due to unexpected issue.  Please try again later. [3]', null);
            }
        });

    }

    function requireToken(token, callback)
    {
        if (token == null)
        {
            if (unauthenticatedUserData)
            {
                return callback(null, {});
            }
            return callback('Could not verify the token or it was not valid', null);
        }

        TokenModel.crud.getOne({"value":token}, function(err, result) {
            if (err){ return callback('Error retrieving token.', null); }

            if (result == null) {
                if (unauthenticatedUserData)
                {
                    // allows unauthenticated users to access some data
                    return callback(null, {});
                }
                return callback('Could not verify the token', null);
            }

            return callback(null, result);
        });
    }

    return auth;

}

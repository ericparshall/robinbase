var Debug = require_robinbase('/helpers/Debug.js');
var Schema = require_robinbase('/helpers/Schema.js');

var PasswordResetToken = function PasswordResetToken(data)
{
    var self = this;

    PasswordResetToken.schema.initializeInstance(self, data);
}

PasswordResetToken.schema = new Schema("_id", {
    _id: Schema.id,
    userId: Schema.id.references("User._id"),
    value: Schema.queryKey,
    createdTime: Schema.datetime,
    modifiedTime: Schema.datetime
});

// Example of how to do a join.
PasswordResetToken.joins = {
    user:  {
        collection: "users",
        localKey:"userId",
        foreignKey:"_id",
        projection: {'_id':1, name:1, email:1}
    }
};


PasswordResetToken.collection = 'passwordResetTokens';

var defaultCrudHook = function(callback)
{
    var self = this;
    callback(null, self)
}

PasswordResetToken.prototype.beforeUpdate = defaultCrudHook;
PasswordResetToken.prototype.afterUpdate  = defaultCrudHook;
PasswordResetToken.prototype.beforeCreate = defaultCrudHook;
PasswordResetToken.prototype.afterCreate  = defaultCrudHook;
PasswordResetToken.prototype.beforeDelete = defaultCrudHook;
PasswordResetToken.prototype.afterDelete  = defaultCrudHook;

PasswordResetToken.indexes = [
    {
        fields: {value: 1},
        options: {background: true, name: 'passwordResetTokenKey'}
    },
    {
        fields: {createdTime: 1},
        options: {expireAfterSeconds: 7200, background: true, name: 'passwordResetTokenExpire'}
    }
];

PasswordResetToken.view = {

    name :"PasswordResetTokens",
    route:"passwordResetTokens",
    icon:"\uf084",
    internalOnly: true,
    defaultSort: ['createdTime', 'desc'],
    _attributes:{
        user: {
            type:'inline',
            join:'user',
            label:'User Name',
            value:'<a href="/users/view/%s" class="formA">%s</a>',
            valueMap:['0._id', '0.name'],
            omitContexts:['create']
        },
        createdTime:{type:'time:datetime', label:"Logged In", omitContexts:['edit', 'create']}
    }

}


module.exports = PasswordResetToken;

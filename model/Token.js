var Debug = require_robinbase('/helpers/Debug.js');
var Schema = require_robinbase('/helpers/Schema.js');

var Token = function Token(data)
{
    var self = this;

    Token.schema.initializeInstance(self, data);
}

Token.schema = new Schema("_id", {
    _id: Schema.id,
    userId: Schema.id.references("User._id"),
    value: Schema.guid,
    loginAs: Schema.string,
    permanent: Schema.boolean.default(false),
    createdTime: Schema.datetime,
    modifiedTime: Schema.datetime
});

// Example of how to do a join.
Token.joins = {
    user:  {
        collection: "users",
        localKey:"userId",
        foreignKey:"_id",
        projection: {'_id':1, name:1, email:1}
    }
};


Token.collection = 'tokens';

Token.indexes = [
    {
        fields: {value: 1},
        options: {background:true, name:'tokenKey'}
    },
    {
        fields: {createdTime: 1},
        options: {expireAfterSeconds:43200, partialFilterExpression: {permanent: false}, background:true, name:'tokenExpire'},
    }
];

Token.view = {

    name :"Tokens",
    route:"tokens",
    icon:"\uf084",
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
        loginAs:{type:'text', label:"Role", omitContexts:['edit', 'create']},
        createdTime:{type:'time:datetime', label:"Logged In", omitContexts:['edit', 'create']}
    }

}

module.exports = Token;

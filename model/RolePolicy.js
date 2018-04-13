var Debug = require_robinbase('/helpers/Debug').prefix('RolePolicy');
var Schema = require_robinbase('/helpers/Schema');

var RolePolicy = function RolePolicy(data)
{
    var self = this;

    RolePolicy.schema.initializeInstance(self, data);


}

RolePolicy.collection = 'rolePolicies';
RolePolicy.schema = new Schema("_id", {
    _id: Schema.id,
    source: Schema.options(['System', 'User']).default('User'),
    name: Schema.string,
    type: Schema.options(['Allow', 'Deny']).default('Allow'),
    models: Schema.array.of(Schema.string.trim().stripHtml()).minLength(1).default(["*"]),
    actions: Schema.array.of(Schema.options(["view", "create", "update", "delete", "*"])).minLength(1).default(["*"]),
    conditions: Schema.array.of(Schema.array.minLength(3).maxLength(3).onSet(function(value){
        // allow a comma separated list for in and nin
        if (value.length === 3 && ["in", "nin"].indexOf(value[1]) > -1 && typeof value[2] === 'string' && value[2][0] !== '$')
        {
            value[2] = value[2].split(',');
        }
        return value;
    })),
    keys: Schema.array.of(Schema.string),
    createdTime: Schema.datetime,
    modifiedTime: Schema.datetime
});

RolePolicy.view = {

    name: 'Policies',
    route: 'policies',
    defaultSort: ['priority', 'asc'],
    internalOnly: true,
    _attributes: {
        name: {type: 'text', label: 'Name'},
        source: {type: 'text', label: 'Source', omitContexts: ["create", "update"]},
        models: {type: 'text:multiple', label: 'Models'},
        actions: {type: 'text:multiple', label: 'Actions', values: [["view", "View"], ["create", "Create"], ["update", "Update"], ["delete", "Delete"]]},
        keys: {type: 'text:multiple', label: 'Keys'},
        conditions: {type: 'triple:multiple', label: 'Query Filters'},
    },
}

RolePolicy.saveTrash = false;

module.exports = RolePolicy;

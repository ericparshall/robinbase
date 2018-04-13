var Debug = require_robinbase('/helpers/Debug').prefix("Role");
var Schema = require_robinbase('/helpers/Schema');

var Role = function Role(data)
{
    var self = this;

    Role.schema.initializeInstance(self, data);
}

Role.collection = 'roles';
Role.schema = new Schema("_id", {
    _id: Schema.id,
    source: Schema.options(['System', 'User']).default('User'),
    name: Schema.string.minLength(1),
    policies: Schema.array.of(Schema.id),
    createdTime: Schema.datetime,
    modifiedTime: Schema.datetime
});

Role.indexes = [
    {
        fields: {name: 1},
        options: {unique: true, background:true, name:'roleNameUnique'}
    }
]

Role.view = {
    name: "Roles",
    route: "roles",
    icon: "\uf132",
    defaultSort: ['name', 'asc'],
    _attributes:{
        name: {type:'text', label:"Role Name", immutable: true},
        source: {type:'text', label:"Source", values:["User","System"], omitContexts: ["create"], immutable: true}
        // TODO: show policies in a subview
    },

    hidden: [],
    selectKey: 'name'
}

Role.saveTrash = false;

module.exports = Role;

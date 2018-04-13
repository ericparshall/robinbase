function Cloner(RootClass, instance, setter, authorization, changedEntities = {})
{
    this.RootClass = RootClass;
    this.instance = instance;
    this.setter = setter;
    this.authorization = authorization;

    this.changedEntities = {};
}

Cloner.prototype.clone = function(object, callback) {
    const {RootClass, instance, setter, authorization} = this;

    for (let key in setter)
    {
        // probably not right... but for now
        instance[key] = setter[key];
    }

    const {joins = {}} = RootClass;

    Object.keys(joins).forEach((joinDef) =>
    {
        const {onClone} = joinDef;

        if (typeof onClone !== "object")
        {
            return;
        }


    });
};

module.exports = Cloner;

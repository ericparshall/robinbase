const snabbdom = require('snabbdom');
const h = require('snabbdom/h').default;
const EventEmitter = require('events').EventEmitter;

class FormNode extends EventEmitter {
    constructor(parentNode = null, key = null, attr = null) {
        super();
        this.key = key;
        this.attr = attr;
        this.childNodes = [];

        // to prevent recursion
        Object.defineProperty(this, 'parentNode', {
            value: parentNode,
            enumerable: false
        });

        this._rootForm = this._getRootForm();

        if (attr)
        {
            const checkEnabled = attr.checkEnabled || [];

            if (attr.requires)
            {
                checkEnabled.push (FormNode.createEnabledChecker(this._rootForm,  attr.requires, this.getForm(), this));
            }

            this._rootForm.registerEnabledChecker(this.key, checkEnabled);

            this.checkEnabled = checkEnabled;
        }
        else
        {
            this.checkEnabled = [];
        }
    }

    resetData(newData) {
        // deliberately empty
    }

    append(node) {
        this.childNodes = this.childNodes.concat([node]);
    }

    update(node) {
        this.getRootForm().updateView();
    }

    sendValueUpdate(value) {
        this.getRootForm().updateValue(this.key, value);
        this.update();
    }

    sendKeyValueUpdate(key, value) {
        // console.log('ROOT FORM: ', this.getRootForm());
        this.getRootForm().updateValue(key, value);
        this.update();
    }

    _getRootForm() {
        let parentNode = this;
        while(parentNode.parentNode != null) {
            parentNode = parentNode.parentNode;
        }

        return parentNode;
    }

    getRootForm() {
        return this._rootForm;
    }

    getForm() {
        let parentNode = this;
        while(parentNode.parentNode != null && !(parentNode instanceof RBForm)) {
            parentNode = parentNode.parentNode;
        }

        return parentNode;
    }

    isMutable() {
        const attr = this.attr;
        const context = this.getRootForm().context;
        if (typeof attr.type == 'string' && typeof attr.join == 'string')
        {
            return attr.immutable === false;
        }

        return !((attr.immutable == true && context != 'create' && context != 'clone') || attr.immutable == 'always');
    }

    keyEnabled(key) {
        if (!key) {
            return false;
        }
    }

    hidden() {
        return !(this.getRootForm().keyEnabled(this.key));
    }

    label(value) {
        const attr = this.attr;
        if (!attr) {
            return '';
        }
        if (typeof attr.type == 'string' && typeof attr.join === 'string')
        {
            return replaceStr(attr.label, attr.labelMap, value)
        }

        return attr.label;
    }

    visibleChildNodes() {
        return this.childNodes;//.filter((node) => node && !node.hidden());
    }

    render() {
        throw new Error('Abstract method FormNode#render must be overwritten.');
    }

    formName() {
        return FormNode.keyToFormName(this.key);
    }

    static keyToFormName(key) {
        if (key) {
            return key.split('.').reduce((result, part) => {
                return result ? `${result}[${part}]` : part;
            }, '');
        }

        return '';
    }

    static createEnabledChecker(rootForm, requires, form, self) {
        return function() {
            if (requires[0] !== self.key && !form.keyEnabled(requires[0])) {
                return false;
            }
            const value = form.calculateValue(requires[0]);
            switch(requires[1]) {
                case 'eq':
                    return value === requires[2];
                case 'neq':
                case 'ne':
                    return value !== requires[2];
                case 'exists':
                    return !!value;
                case 'notexists':
                    return !!value;
                case 'isempty':
                    if (value) {
                        if (Array.isArray(value)) {
                            return value.length === 0;
                        } else {
                            return Object.keys(value).length === 0;
                        }
                    }
                    return true;
                case 'isnotempty':
                    if (value) {
                        if (Array.isArray(value)) {
                            return value.length > 0;
                        } else {
                            return Object.keys(value).length > 0;
                        }
                    }
                    return false;
                case 'in':
                    if(Array.isArray(requires[2])) {
                        return requires[2].indexOf(value) > -1;
                    }
                    return false;
                case 'nin':
                    if(Array.isArray(requires[2])) {
                        return requires[2].indexOf(value) == -1;
                    }
                    return false;
                default:
                    return true;
            }
        }
    }

}

class RBForm extends FormNode {
    constructor(parentNode, formData, objData, rootForm = null, keyPrefix = '') {
        super(parentNode, keyPrefix.substr(0,keyPrefix.length - 1));

        this.formData = formData;
        this.objData = objData;
        this.rootForm = rootForm || this;
        this.keyPrefix = keyPrefix;
        this.context = formData.context || rootForm.context;
        this.vnode = null;
        this.enabledCheckers = {};

        console.log('THIS CONTEXT: ', this.context);

        if (formData.formLayouts && formData.formLayouts[this.context])
        {
            this.formLayout = formData.formLayouts[this.context];
        }
        else
        {
            this.formLayout = Object.keys(formData._attributes || {}).map(key => [key]);
        }

        // console.log('FORM LAYOUT FOR: ', this.context, formData.formLayouts);
        // console.log('FORM DATA: ', formData);

        this.running = false;
        this.patch = snabbdom.init(RBForm._modules);
        this.buildForm();
    }

    resetData(newData) {
        if (this.key === 'fields2')
        {
            console.log('RESETING FORM DATA: ', this.key, newData);
        }
        Object.assign(this.objData, newData);
        this.running = false;
        this.childNodes.forEach((child) => {child.resetData(this.calculateFieldValue(child))});
        this.running = true;
        if (this.getRootForm() === this) {
            this.updateView();
        }

        var doHighlight = false;
        for (var key in newData)
        {
            console.log('formData', this.formData);
            var foundItem = $('#listitem-'+newData._id+'-'+key);
            if (foundItem.length == 0)
            {
                continue;
            }
            doHighlight = true;

            var out = '';
            var attr = this.formData._attributes[key];
            if (!attr) {
                console.log('NO ATTR FOR KEY:', key);
                continue;
            }
            var value = newData[key];
            switch (attr.type)
            {
                case 'link':
                {
                    var outObj = btoa(JSON.stringify({attr:attr, value:value}));
                    out = '<span class="displayLink" data="'+outObj+'"></span>'; //'<a href="'+value+'">'+attr.label+'</a>';
                    break;
                }
                case 'time:datetime':
                {
                    out = '<span class="localDateTime">'+value+'</span>';
                    break;
                }
                case 'time:date':
                {
                    out = '<span class="localDate">'+value+'</span>';
                    break;
                }
                case 'time:time':
                {
                    out = '<span class="localTime">'+value+'</span>';
                    break;
                }
                case 'file:image':
                {
                    out = '<span class="displayThumbnail">'+value+'</span>'; //'<div class="tableThumbnail" style="background-image:url(\''+attr.baseUrl+value+'\');"></div>';
                    break;
                }
                case 'boolean':
                {
                    out = '<span class="displayBoolean">'+value+'</span>';
                    break;
                }
                case 'inline':
                {
                    var outObj = btoa(JSON.stringify({attr:attr, value:value}));
                    out = '<span class="displayAttribute" data="'+outObj+'"></span>';//value;
                    break;
                }
                default:
                {
                    out = value;
                }
            }

            foundItem.html(out);
        }

        $('.justModified').removeClass('justModified');
        if (doHighlight == true)
        {
            postProcessFields();
            $('#listitemcontainer-'+newData._id).addClass('justModified');

        }

    }

    buildForm() {
        const formLayout = this.formLayout;
        const formData = this.formData;
        const attributes = formData._attributes || {};
        const objData = this.objData;

        let parentElem = this;

        for (let i = 0, l = formLayout.length; i < l; i++)
        {
            let hidden = false;
            const row = formLayout[i];
            if(!Array.isArray(row) || row.length === 0)
            {
                continue;
            }

            let visibleFieldCount = row.reduce((l, key) => {
                let cols = 1;
                if (key != null && typeof key === 'object')
                {
                    cols = typeof key.cols === 'number' ? Math.max(0, key.cols) : 1;
                    key = key.key;
                }
                if (key == null || (attributes[key] && attributes[key].type !== 'hidden' && attributes[key].hidden !== true))
                {
                    return l + cols;
                }

                return l;

            }, 0);

            let colW = (100 / visibleFieldCount) || 100;
            // console.log('colW:', colW, 'row:', row);

            for (let index = 0; index < row.length; index++) {
                let key = row[index];
                let requires = null;
                let cols = 1;
                if (key != null && typeof key === 'object')
                {
                    if (key.requires && key.requires.length >= 2)
                    {
                        requires = key.requires;
                    }
                    cols = typeof key.cols === 'number' ? Math.max(0, key.cols) : 1
                    key = key.key;
                }

                if (key == null)
                {
                    parentElem.append(this.buildField(key, {type: 'empty'}, null, colW, parentElem));
                    continue;
                }

                if (key.substr(0,2) === '--')
                {
                    let useLabel = '-';
                    let hr = this.buildField(this.keyPrefix + key, {type: 'hr', label: useLabel, requires, join: '_self'}, null, colW, parentElem);
                    this.append(hr);
                    parentElem = hr;
                    continue;
                }
                if (key.substr(0,2) === '-^')
                {
                    let useLabel = key.substring(2);
                    let hr = this.buildField(this.keyPrefix + key, {type: 'hr', closed:true, label: useLabel, requires, join: '_self'}, null, colW, parentElem);
                    this.append(hr);
                    parentElem = hr;
                    continue;
                }

                if (key[0] === '-')
                {
                    let useLabel = key.substring(1);
                    let hr = this.buildField(this.keyPrefix + key, {type: 'hr', label: useLabel, requires, join: '_self'}, null, colW, parentElem);
                    this.append(hr);
                    parentElem = hr;
                    continue;
                }

                let attr = formData._attributes[key];
                if (typeof attr == 'undefined')
                {
                    console.log('KEY: ', key, formData);
                    continue;
                }

                let initialValue = this.calculateValue(this.keyPrefix + key, attr);


                parentElem.append(this.buildField(this.keyPrefix + key, Object.assign({}, attr, {requires}), initialValue, colW * cols, parentElem));
            }
        }

    }

    calculateValue(key, attr = null, objData = this.objData) {
        if (key == null) {
            return null;
        }
        let useKey = key;
        if (this.keyPrefix && key.indexOf(this.keyPrefix) === 0) {
            useKey = key.substr(this.keyPrefix.length);
        }

        let value = this.getValue(useKey, objData);
        if (attr && typeof attr.join == 'string')
        {
            if (attr.join === "_self")
            {
                value = objData;
            }
            else if (attr.join.search(/_root\./) != -1)
            {
                let newJKey = attr.join.replace(/_root\./, '');
                value = this.rootForm.objData[newJKey];
            }
            else if (attr.join == '_root')
            {
                console.log('ROOT JOIN:', this, this.rootForm)
                value = this.rootForm.objData;
            }
            else
            {
                value = objData[attr.join];
            }

            // is this the right place for this?
            if (typeof attr.defaultValue === 'string' && Array.isArray(value) && value.length === 0)
            {
                value = attr.defaultValue;
            }
            else if ((attr.type != 'join') && (attr.type != 'text') && attr.value && attr.valueMap)
            {
                value = replaceStr(attr.value, attr.valueMap, value);
            }
        }

        return value;
    }

    calculateFieldValue(fieldNode, objData = this.objData) {
        return this.calculateValue(fieldNode.key, fieldNode.attr, objData);
    }

    buildField(key, attr, initialValue, colW, parentNode = this) {
        if (attr && parentNode && parentNode.checkEnabled)
        {
            attr.checkEnabled = attr.checkEnabled || [];
            attr.checkEnabled.concat(parentNode.checkEnabled);
        }
        if (typeof RBForm._fieldTypes[attr.type] === "function")
        {

            return new RBForm._fieldTypes[attr.type](parentNode, key, attr, initialValue, colW);
        }
        else
        {
            console.warn(`Unknown field type '${attr.type}' for key '${key}'. Defaulting to text.`);
            return new RBForm._fieldTypes['text'](parentNode, key, attr, initialValue, colW);
        }
    }

    render(objData) {
        // console.log('FORM OBJ DATA: ', this.key, objData);
        return h('div', this.visibleChildNodes().map((child) => {
            let value = this.calculateValue(child.key, child.attr, objData);
            return child.render(value);
        }));
    }

    updateValue(key, value) {
        // todo
        let keyParts = key.split('.');
        let obj = this.objData;

        // console.log('UPDATE: ', key, ' TO: ', value);
        // console.log('OLD DATA: ', obj);

        while(keyParts.length > 1) {
            let nextKey = keyParts.shift();
            let nextObj = obj[nextKey];
            if (!nextObj) {
                if (Number.isInteger(nextKey))
                {
                    nextObj = [];
                    obj[nextKey] = nextObj;
                }
                else
                {
                    nextObj = {};
                    obj[nextKey] = nextObj;
                }
            }

            obj = nextObj;
        }

        if (typeof value === 'undefined') {
            delete obj[keyParts[0]]
        } else {
            obj[keyParts[0]] = value;
        }

        this.emit('updateValue', key, value);

        // console.log('NEW DATA: ', this.objData);
    }

    getValue(key, obj = this.objData) {
        let keyParts = key.split('.');
        // let obj = this.objData;

        if (keyParts[0] === "_root") {
            obj = this.rootForm.objData;
            keyParts = keyParts.slice(1);
        }

        while(keyParts.length > 0) {
            obj = obj[keyParts.shift()];
            if (typeof obj === 'undefined') {
               return undefined;
            } else if (obj == null) {
                return null;
            }
        }

        return obj;
    }

    updateView() {
        if (this.running) {
            if (this.queuedUpdate) {
                return;
            } else {
                this.queuedUpdate = setTimeout(() => {
                    this.queuedUpdate = null;
                    const newVNode = this.render(this.objData);
                    try
                    {
                        this.patch(this.vNode, newVNode);
                    }
                    catch(e)
                    {
                        console.error("Could not update view:", e);
                        console.error('Current tree is: ', newVNode);
                        this.running = false;
                    }
                    this.vNode = newVNode;
                }, 1);
            }

        }
    }

    run(parentEl) {
        this.running = true;
        var rootNode = document.createElement('div');
        parentEl.appendChild(rootNode);
        this.vNode = rootNode;

        this.updateView();
    }

    registerEnabledChecker(key, checks) {
        this.enabledCheckers[key] = checks || [];
    }

    keyEnabled(key) {
        var checkers = this.enabledCheckers[key] || [];

        for (let i = 0, l = checkers.length; i < l; i++) {
            if (checkers[i]() == false) {
                return false;
            }
        }

        return true;
    }

    static registerFieldType(key, FieldType) {
        RBForm._fieldTypes[key] = FieldType;
    }

    static getFieldType(key) {
        return RBForm._fieldTypes[key];
    }

    static registerModule(module) {
        RBForm._modules.push(module);
    }
}

RBForm._fieldTypes = {};
RBForm._modules = [
    require('snabbdom/modules/class').default, // makes it easy to toggle classes
    require('snabbdom/modules/props').default, // for setting properties on DOM elements
    require('snabbdom/modules/attributes').default, // for setting attributes on DOM elements
    require('snabbdom/modules/style').default, // handles styling on elements with support for animations
    require('snabbdom/modules/eventlisteners').default, // attaches event listeners
];

global.RB = global.RB || {};
global.RB.Form = RBForm;


class FormField extends FormNode {
    constructor(parentNode, key, attr, initialValue, colW) {
        super(parentNode, key, attr);
        this.initialValue = initialValue;
        this.colW = colW;
        this.onChange = this.onChange.bind(this);
        this.onChangeDate = this.onChangeDate.bind(this);
        this.sanitizePaste = this.sanitizePaste.bind(this);
        this.buildCodeEditor = this.buildCodeEditor.bind(this);

        // console.log('FORM FIELD COLW: ', colW);
    }

    render(value) {
        return h('div.inputContainer', {
            key: this.key,
            style: {
                width: this.colW == null ? '100%' : `${this.colW}%`,
                display: this.hidden() ? 'none' : 'inline-block',
                /*transition: 'left 400ms',*/
                position: 'relative',
                /*left: '100%',
                delayed: {left: '0'},
                remove: {left: '-100%'},*/
            }
        }, this.renderInputSection(value));
    }

    renderInputSection(value) {
        return [
            this.renderLabel(value),
            // h('br'),
            this.renderInput(value),
        ]
    }

    renderInput(value) {
        console.warn(`Abstract method FormField#renderInput must be overwritten by class ${this.constructor.name}`);
        return value;
    }

    renderLabel(value) {
        return h('label', {
            props: {
                "for": "f_" + this.key,
            }
        }, [this.label(value)])
    }

    onChange(e) {
        var value = this.valueFromEvent(e)
        this.sendValueUpdate(value);
        this.emit('change', value);
    }

    onChangeDate(e) {
        var value = this.valueFromEvent(e)
        this.sendValueUpdate(value);
       // this.emit('change', value);
    }

    sanitizePaste(e){
        e.preventDefault();
        var text = e.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, text);
    }

    buildCodeEditor(e) {
        console.log('show editor', e.target.id);
        var editor = ace.edit(e.target.id);
    }

    renderLoadingMessage(message = "loading...") {
        return h('div', {
            style: {
                display: 'inline-block'
            }
        }, [
            h('i.fa.fa-circle-o-notch.spin', {
                style: {
                    marginRight: '10px'
                }
            }),
            h('span', [message])
        ]);
    }



    valueFromEvent(e) {
        return e.target.value;
    }
}

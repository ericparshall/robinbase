/*generated Fri Apr 13 2018 04:12:45 GMT+0000 (UTC)*/


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


(function(){

class BooleanFormField extends FormField {

    renderInputSection(value) {
        return [
            this.renderInput(value),
            this.renderLabel(value)
        ];
    }

    renderInput(value) {
        return h('input', {
            props: {
                name: this.formName(),
                id: 'f_'+this.key,
                type: 'checkbox',
                checked: value,
                disabled: !this.isMutable(),
            },
            on: {
                change: this.onChange
            }
        });
    }

    valueFromEvent(e) {
        return e.target.checked;
    }
}

RBForm.registerFieldType('boolean', BooleanFormField);

}).call(global);

(function(){

class DateTimeFormField extends FormField {

    renderInput(value) {

        let d = value;//isNaN(value) ? new Date(value) : new Date(parseInt(value));



        d = moment(value).format("MM/DD/Y h:mm A")
        //d = flatpickr.prototype.formatDate(d, "m/d/Y h:i K");

        let stamp = isNaN(value) ? '' : '1';
        return h('div', [
            h('i.fa.fa-calendar', {
                attrs: {
                    "aria-hidden": true
                },
                style: {
                    marginRight: '10px'
                }
            }),
            h('input.calendarInput', {
                props: {
                    name: this.formName(),
                    id: 'f_'+this.key,
                    value: d,
                    disabled: !this.isMutable(),
                },
                on: {
                    change: this.onChangeDate
                },
                attrs: {
                    stamp,
                },
                hook: {
                    insert: (vnode) => { vnode.elm.flatpickr({
                        dateFormat: "m/d/Y h:i K",
                        enableTime:true
                    })

                    }
                }
            })
        ]);
    }
}

RBForm.registerFieldType('time:datetime', DateTimeFormField);


}).call(global);

(function(){

class EmptyNode extends FormNode {
    constructor(parentNode, key, attr, initialValue, colW) {
        super(parentNode, key, attr);
        this.colW = colW;
    }
    render(value) {
        return h('div.inputContainer.desktopSpacer', {
            style: {
                width: this.colW == null ? '100%' : `${this.colW}%`,
                display: 'inline-block',
            }
        }, [h('br')]);
    }
}

RBForm.registerFieldType('empty', EmptyNode);


}).call(global);

(function(){

class FileFormField extends FormField {
    constructor(parentNode, key, attr, initialValue, colW) {
        super(parentNode, key, attr, initialValue, colW);

        this.initialDisplayValue = initialValue || 'No File Selected';
        this.initialValue = initialValue;
        this.displayValue = this.initialDisplayValue;
        this.initialImgUrl = initialValue ? (attr.baseUrl + initialValue) : '';
        this.imgUrl = this.initialImgUrl;
        this.fileInput = null;

        this.clientUpload = Boolean(attr.clientUpload);

        this.onInputClick = this.onInputClick.bind(this);
        this.onFileInputChange = this.onFileInputChange.bind(this);
    }

    renderInputSection(value) {
        return [
            this.renderPreview(value),
            h('div.formImgFile', [
                this.renderLabel(value),
                this.renderInput(value),
            ]),
        ];
    }

    renderPreview(value) {
        return h('div.formImgThumb', [
            h(`div#fPrev_${this.key}`, {
                style: {
                    maxWidth: '160px',
                    height: '50px',
                    backgroundSize: 'contain',
                    backgroundColor: '#efefef',
                    backgroundPosition: 'center center',
                    bacgkroundRepeat: 'no-repeat',
                    borderRadius: '10px',
                    backgroundImage: this.imgUrl ? `url(${this.imgUrl})` : 'none'
                }
            })
        ])
    }

    renderInput(value) {
        return h('div.editable', {
            style: {
                cursor: 'pointer',
                paddingBottom: '0px'
            },
            on: {
                click: this.onInputClick
            }
        }, [
            h('i.fa.fa-file', {
                style: {
                    marginRight: '10px',
                    color: '{{#data:key/"primaryColor"}}',
                }
            }),
            h('span', [this.displayValue]),
            h('input', {
                style: {
                    display: 'none',
                },
                props: {
                    type: 'file',
                    // value: value,
                    name: this.formName(),
                    id: 'f_' + this.key,
                    disabled: !this.isMutable(),
                },
                on: {
                    change: this.onFileInputChange,
                },
                hook: {
                    insert: (vnode) => {this.fileInput = vnode.elm;}
                }
            })
        ])
    }

    onInputClick(e) {
        if (this.fileInput) {
            this.fileInput.click();
        }
    }

    onFileInputChange(e) {
        let name = (e.target.value || '').split('\\');
        name = name[name.length - 1];

        this.displayValue = name || this.initialDisplayValue;

        let file = e.target.files[0] || null;
        if (file)
        {
            if (file.type.indexOf('image/') === 0)
            {
                let reader = new FileReader();
                reader.onload = (e) => {
                    this.imgUrl = e.target.result;
                    this.update();
                }
                reader.readAsDataURL(file);
            }
            else
            {
                this.imgUrl = '';
            }
        }
        else
        {
            this.imgUrl = this.initialImgUrl;
        }

        this.update();
    }
}

RBForm.registerFieldType('file', FileFormField);


}).call(global);

(function(){

class HRNode extends FormNode {
    constructor(parentNode, key, attr, initialValue, colW) {
        super(parentNode, key, attr, initialValue, colW);

        this.colW = colW;
        // console.log('HR: ', this.attr);

        this.initial = (attr.closed == true) ? true : false;
        this.closed = attr.closed || false;
        this.slideElm = null;
        this.onTitleClick = this.onTitleClick.bind(this);

      /*  let styleSheet = document.styleSheets[0];
        let fadeOutKeys =
                '@-webkit-keyframes fadeOut {'+
            '0% {opacity:1}'+
            '100% {opacity:0}'+
        '}';
        styleSheet.insertRule(fadeOutKeys, 0);
        let fadeInKeys =
            '@-webkit-keyframes fadeIn {'+
            '0% {opacity:0}'+
            '100% {opacity:1}'+
        '}';
        styleSheet.insertRule(fadeInKeys, 0);*/
    }

    resetData(newData) {
        const rootForm = this.getRootForm();

        this.childNodes.forEach((child) => {
            child.resetData(rootForm.calculateFieldValue(child))
        })
    }



    render(value) {
        const label = this.label();
        const initial = this.initial;

        if (label) {
            return h('div.inputContainer', {
                key: this.key,
                style: {
                    display: this.hidden() ? 'none' : 'inline-block',
                    width: isFinite(this.colW) ? `${this.colW}%` : '100%',
                    paddingBottom: this.closed ? '0px' : '15px',
                    animationName:'fadeIn',
                    animationDuration: '0.3s',
                    animationDelay: '0.3s',
                    animationIterationCount: 1,
                    animationDirection: 'normal',
                    animationFillMode: 'forwards',
                    position: 'relative',
                    overflow:'hidden',
                    opacity: '0',
                    remove: {animationName:'fadeOut',
                        animationDuration: '0.3s',
                        animationDelay: '0.0s',
                        animationIterationCount: 1,
                        animationDirection: 'normal',
                        animationFillMode: 'forwards'},
                },
                class: {
                    fakeContainer: label === '-',
                    initialLoadContainer: initial === true,
                    collapsedContainer: this.closed === true
                }
            }, [
                this.renderTitle(label),
                this.renderFormSection(label, value),
            ])
        } else {
            return h('hr');
        }
    }

    renderTitle(label) {
        return h('h3', {
            on: {
                click: this.onTitleClick
            },
        }, [label])
    }

    renderFormSection(label, value) {
        const children = this.visibleChildNodes().map(child => child.render(
            this.getForm().calculateFieldValue(child, value)
        ));

        return h('div.formSection', {
            style: {
                overflow: 'hidden',
                paddingBottom: this.closed ? '0px' : '20px',
                paddingTop: this.closed ? '0px' : '10px',
                transition: 'padding 400ms',
                width: '100%',
                padding: label == '-' ? '0px' : '10px'
            }
        }, [
            //http://jsfiddle.net/n5XfG/2596/
            h('div.slideWrapper', {
                style: {
                    marginTop: this.closed ? `-${this.getSlideElmHeight()}px` : '0px',
                    transition: 'margin-top 400ms',
                },
                hook: {
                    insert: (vnode) => this.slideElm = vnode.elm
                }
            }, children)
        ])
    }

    onTitleClick(e) {
        this.closed = !this.closed;
        this.initial = false;
        this.update();
    }

    getSlideElmHeight() {
        return $(this.slideElm).height();
    }
}

RBForm.registerFieldType('hr', HRNode);


}).call(global);

(function(){

class HiddenFormField extends FormField {
    render(value) {
        return h('div.inputContainer', {style: {display: 'none'}}, [this.renderInput(value)])
    }

    renderInput(value) {
        return h('input', {
            props: {
                name: this.formName(),
                id: 'f_'+this.key,
                type: 'hidden',
                value: value
            },
            on: {
                change: this.onChange
            }
        });
    }
}

RBForm.registerFieldType('hidden', HiddenFormField);

}).call(global);

(function(){

class ImageFileFormField extends FormField {
    constructor(parentNode, key, attr, initialValue, colW) {
        super(parentNode, key, attr, initialValue, colW);

        this.initialDisplayValue = initialValue || 'No File Selected';
        this.initialValue = initialValue;
        this.displayValue = this.initialDisplayValue;
        this.initialImgUrl = initialValue ? (attr.baseUrl + initialValue) : '';
        this.imgUrl = this.initialImgUrl;
        this.fileInput = null;

        this.onInputClick = this.onInputClick.bind(this);
        this.onFileInputChange = this.onFileInputChange.bind(this);
    }

    renderInputSection(value) {
        return [
            this.renderPreview(value),
            h('div.formImgFile', [
                this.renderLabel(value),
                this.renderInput(value),
            ]),
        ];
    }

    renderPreview(value) {
        return h('div.formImgThumb', [
            h(`div#fPrev_${this.key}`, {
                style: {
                    maxWidth: '160px',
                    height: '50px',
                    backgroundSize: 'contain',
                    backgroundColor: '#efefef',
                    backgroundPosition: 'center center',
                    bacgkroundRepeat: 'no-repeat',
                    borderRadius: '10px',
                    backgroundImage: this.imgUrl ? `url(${this.imgUrl})` : 'none'
                }
            })
        ])
    }

    renderInput(value) {
        return h('div.editable', {
            style: {
                cursor: 'pointer',
                paddingBottom: '0px'
            },
            on: {
                click: this.onInputClick
            }
        }, [
            h('i.fa.fa-photo', {
                style: {
                    marginRight: '10px',
                    color: '{{#data:key/"primaryColor"}}',
                }
            }),
            h('span', [this.displayValue]),
            h('input', {
                style: {
                    display: 'none',
                },
                props: {
                    type: 'file',
                    // value: value,
                    name: this.formName(),
                    id: 'f_' + this.key,
                    disabled: !this.isMutable(),
                },
                on: {
                    change: this.onFileInputChange,
                },
                hook: {
                    insert: (vnode) => {this.fileInput = vnode.elm}
                }
            })
        ])
    }

    onInputClick(e) {
        if (this.fileInput) {
            this.fileInput.click();
        }
    }

    onFileInputChange(e) {
        let name = (e.target.value || '').split('\\');
        name = name[name.length - 1];

        this.displayValue = name || this.initialDisplayValue;

        let file = e.target.files[0] || null;
        if (file)
        {
            if (file.type.indexOf('image/') === 0)
            {
                let reader = new FileReader();
                reader.onload = (e) => {
                    this.imgUrl = e.target.result;
                    this.update();
                }
                reader.readAsDataURL(file);
            }
            else
            {
                this.imgUrl = '';
            }
        }
        else
        {
            this.imgUrl = this.initialImgUrl;
        }

        this.update();
    }
}

RBForm.registerFieldType('file:image', ImageFileFormField);


}).call(global);

(function(){

class InlineFormField extends FormField {
    renderInput(value) {
        return h('div.inline-label', {
            hook: {
                update: (oldVnode, vnode) => {vnode.elm.innerHTML = value},
                insert: (vnode) => {vnode.elm.innerHTML = value},
            }
        });
    }
}

RBForm.registerFieldType('inline', InlineFormField);

}).call(global);

(function(){

class JoinNode extends FormNode {
    constructor(parentNode, key, attr, initialValue, colW) {
        super(parentNode, key, attr);
        this.colW = colW;
        this.initialValue = initialValue;

        if (Array.isArray(initialValue))
        {
            this.initialValue = {};
            initialValue.forEach((objData) => {
                this.initialValue[objData._id] = objData;
            });

            this.sendValueUpdate(this.initialValue);
        };

        this.buildSubForms();

        this.onAddItemClick = this.onAddItemClick.bind(this);

        this.deletedKeys = [];

        this.confirmingDeletions = {};

        this.getRootForm().on('updateValue', (key, value) => {
            if (key === this.key) {
                this.initialValue = value;
                this.childNodes = [];
                this.buildSubForms();

            }
        })
    }

    buildSubForms() {
        const initialValue = this.initialValue || {};
        Object.keys(initialValue).forEach((key) => {
            this.buildSubForm(initialValue[key], false);
        });
    }

    buildSubForm(objData, isNew = false) {
        const rootForm = this.getRootForm();
        const key = `${this.key}.${objData._id}`;
        const deleteAction = this.attr.canBeDeleted ? this.onItemDeleteClick.bind(this, key) : null;
        const deleteConfirmAction = this.attr.canBeDeleted ? this.onItemDeleteConfirmClick.bind(this, key) : null;
        const subTemplate = Object.assign({}, this.attr.subTemplate, {
            _attributes: this.attr.subTemplate._attributes || {},
            formLayouts: this.attr.subLayouts,
            isNew,
            deleteAction,
            deleteConfirmAction
        });
        if (this.attr.immutable == true) {
            const newAttrs = {};
            Object.keys(subTemplate._attributes).forEach((attrKey) =>
            {
                newAttrs[attrKey] = Object.assign({}, subTemplate._attributes[attrKey], {immutable: true});
            });

            subTemplate._attributes = newAttrs;
            subTemplate.deleteAction = null;
            subTemplate.deleteConfirmAction = null;
        }
        let subForm = new RBForm(this, subTemplate, objData, rootForm, key + '.');

        this.append(subForm);

        if(isNew)
        {
            rootForm.updateValue(key, objData);
        }
    }

    render(value) {
        return h('div.inputContainer.joinContainer', {
            style: {
                width: this.colW == null ? '100%' : `${this.colW}%`,
                display: this.hidden() ? 'none' : 'inline-block',
            }
        }, this.renderJoinWell(value));
    }

    renderJoinWell(value) {
        // console.log('JOIN WELL VALUE: ', value);
        let children = [this.renderChildSections(value)];
        if (this.attr.label) {
            children = [h('h3', {
                style: {
                    marginTop: '0px',
                    marginBottom: '10px',
                    background: 'none'
                }
            }, [this.attr.label])].concat(children);
        }

        if (this.attr.canBeDeleted == true && !this.attr.immutable)
        {
            children.push(this.renderAddItemButton());
        }

        return h('div.well.inner-well', {
            style: {
                maxHeight: this.attr.maxHeight || 'auto',
                overflowY: 'scroll',
            }
        }, children);
    }

    renderChildSections(value = {}) {
        const rootForm = this.getRootForm();
        return h('div', {

        }, this.childNodes.map((form) => h('div.subSection', {
            "class": {
                subSectionNew: form.formData.isNew
            },
            attrs: {
                // subSectionKey: null
            },
        }, [form.render(value[form.objData._id])].concat((this.attr.canBeDeleted && !this.attr.immutable) ? [this.renderChildSectionDeleteButton(form)] : [])))
          .concat(this.renderDeletedChildSections()));
    }

    renderDeletedChildSections() {
        // TODO
        return this.deletedKeys.map((key) => h('input', {
            props: {
                type: 'hidden',
                name: FormNode.keyToFormName(`${key}-DEL`),
                value: '',
            },
            attrs: {
                deleter: 'yes'
            }
        }));
    }

    renderAddItemButton() {
        return h('div.add', {
            on: {
                click: this.onAddItemClick
            }
        }, [h('i.fa.fa-plus-circle', {attrs: {'aria-hidden': "true"}})]);
    }

    renderChildSectionDeleteButton(form) {
        const confirming = this.confirmingDeletions[form.key];
        return h('div', {
            style: {
                textAlign: 'right',
                height: '41px',
                display: 'inline-block',
                position: 'absolute',
                width:'150px',
                pointerEvents:'none',
                left: 'calc(100% - 153px)',
                top: '0px',
            }
        }, [
            h('div.delete', {
                style: {
                    float: 'none',
                    display: confirming ? 'none' : 'inline-block',
                    opacity: '0',
                    transition: 'opacity 1s',
                    delayed: {opacity: confirming ? '0' : '1'}
                },
                on: {
                    click: form.formData.deleteAction
                }
            }, [
                h('i.fa.fa-times', {attrs: {'aria-hidden': "true"}})
            ]),
            h('div.delete', {
                style: {
                    float: 'none',
                    display: confirming ? 'inline-block' : 'none',
                    opacity: '0',
                    borderRadius:'8px',
                    padding:'5px',
                    backgroundColor:'#fff',
                    boxShadow:'0px 0px 10px #fff',
                    transition: 'opacity 1s',
                    fontSize:'13px',
                    delayed: {opacity: confirming ? '1' : '0'}
                },
                on: {
                    click: form.formData.deleteConfirmAction
                }
            }, [
                h('i.fa.fa-exclamation-triangle', {attrs: {'aria-hidden': 'true'}}),
                " Are you sure?"
            ])
        ]);
    }

    onAddItemClick(e) {
        const id = `${guid('xxxxxxxx')}-NEW`;
        const objData = Object.assign({}, clone(this.attr.defaultObject || {}), {_id: id});
        this.buildSubForm(objData, true);

        this.update();
    }

    onItemDeleteClick(key, e) {
        // console.log('DELETED: ', key);
        this.confirmingDeletions[key] = true;
        setTimeout(() => {
            if (this.confirmingDeletions[key]) {
                this.confirmingDeletions[key] = false;
                this.update();
            }
        }, 5000);

        this.update();
    }

    onItemDeleteConfirmClick(key, e) {
        this.childNodes = this.childNodes.filter((form) => {
            return form.key !== key;
        });

        this.confirmingDeletions[key] = false;

        if (key.indexOf('-NEW') === -1) {
            this.deletedKeys.push(key);
        }

        this.getRootForm().updateValue(key, undefined);

        this.update();
    }

    resetData(newData) {
        console.log('RESETTING JOIN NODE DATA', this.key, newData);
        const rootForm = this.getRootForm();
        this.initialValue = newData;
        this.deletedKeys = [];

        this.childNodes = [];

        this.buildSubForms();
        //this.sendValueUpdate(this.initialValue);



        // if (Array.isArray(newData))
        // {
        //     this.childNodes = [];
        //     this.initialValue = {};
        //     initialValue.forEach((objData) => {
        //         this.initialValue[objData._id] = objData;
        //     });
        //
        //     this.sendValueUpdate(this.initialValue);
        // };

        // this.childNodes.forEach((child) => {
        //     child.formData.isNew = false;
        //     if (child.key.indexOf('-NEW') > -1) {
        //         console.log('NEW CHILD KEY: ', child.key);
        //         console.log('NEW CHILD VALUE: ', rootForm.getValue(child.key));
        //     }
        //     child.resetData(rootForm.getValue(child.key));
        // });
    }
}

RBForm.registerFieldType('join', JoinNode);


}).call(global);

(function(){

class LinkNode extends FormField {
    // render(value) {
    //     return h('div.inputSection', {
    //
    //     })
    //
    // }

    renderInputSection(value) {
        return [h('a.formA', {
            props: {
                target: this.attr.target || '_self',
                href: value
            },
        }, [this.label()])];
    }
}

RBForm.registerFieldType('link', LinkNode);

}).call(global);

(function(){

class LongTextCodeFormField extends FormField {
    renderInput(value) {
        return h('div', {
            props: {
                id: 'f_'+this.key,
                type: 'checkbox',
                disabled: !this.isMutable(),
            },
            style:{
                height:'400px'
            },
            attrs: {
              //  contenteditable: this.isMutable(),
                name: this.formName(),
            },
            hook: {
                insert: (vnode) => {

                    console.log('build code editor');
                    this.editor = ace.edit(vnode.elm);
                    editor.resize();
                    editor.getSession().on('change', (e) => {
                        // e.type, etc
                        this.onChange(e);
                    });
                }
            }
        }, [value || '']);
    }

    valueFromEvent(e) {
        return this.editor.getValue();
    }
}

RBForm.registerFieldType('text:code', LongTextCodeFormField);

}).call(global);

(function(){

class LongTextFormField extends FormField {
    renderInput(value) {
        return h('div.editable', {
            props: {
                id: 'f_'+this.key,
                type: 'checkbox',
                disabled: !this.isMutable(),
            },
            attrs: {
                contenteditable: this.isMutable(),
                name: this.formName(),
            },
            on: {
                change: this.onChange,
                paste: this.sanitizePaste
            }
        }, [value || '']);
    }

    valueFromEvent(e) {
        return e.target.innerText;
    }
}

RBForm.registerFieldType('text:long', LongTextFormField);


}).call(global);

(function(){

class PasswordFormField extends FormField {

    renderInput(value) {
        return h('input', {
            props: {
                name: this.formName(),
                id: 'f_'+this.key,
                type: 'password',
                value: value,
                disabled: !this.isMutable(),
            },
            on: {
                change: this.onChange
            }
        });
    }
}

RBForm.registerFieldType('text:password', PasswordFormField);

}).call(global);

(function(){

class RelationshipFormField extends FormField {
    constructor(parentNode, key, attr, initialValue, colW) {
        initialValue = initialValue || '';
        super(parentNode, key, attr, initialValue, colW);

        this.loaded = false;
        this.selectField = null;
        this.load(initialValue);
    }

    renderInput(value = '') {
        return this.loaded ? this.selectField.renderInput(value) : this.renderLoadingMessage();
    }

    load(value) {
        if (this.attr.queryLink)
        {
            let useQueryLink = this.attr.queryLink;
            if (!this.isMutable())
            {
                const joinChar = useQueryLink.indexOf('?') > -1 ? '&' : '?';
                useQueryLink += `${joinChar}selected=${value}`;
            }

            console.log('USEE QUERY LINK:', useQueryLink);

            const processData = (data) => {
                let values = (this.attr.values || []).concat(data.data);
                let attr = Object.assign({}, this.attr, {values});

                let TextFormField = RBForm.getFieldType('text');
                this.selectField = new TextFormField(this, this.key, attr, this.initialValue, this.colW);
                this.selectField.on('change', (value) => {
                    this.emit('change', value);
                });
                this.loaded = true;
                this.update();
            }

            if (RelationshipFormField.queryCache.has(useQueryLink)) {
                RelationshipFormField.queryCache.get(useQueryLink).onValue(processData);
            } else {
                var futureValue = new FutureValue;

                RelationshipFormField.queryCache.set(useQueryLink, futureValue);
                futureValue.onValue(processData);

                $.get(useQueryLink, (data) => {
                    try
                    {
                        data = JSON.parse(data);
                        futureValue.setValue(data);
                    }
                    catch (e)
                    {
                        console.log('Error parsing data', e);
                        // show error
                    }
                });
            }
        } else {
            console.warn('missing query link');
        }
    }
}

RelationshipFormField.queryCache = new Map();

class FutureValue {
    constructor() {
        this.listeners = [];
        this.resolved = false;
    }

    setValue(value) {
        this.value = value;
        this.resolved = true;
        this.listeners.forEach((l) => {
            l(value);
        });

        this.listeners = [];
    }

    onValue(listener) {
        if (this.resolved) {
            listener(this.value);
        } else {
            this.listeners.push(listener);
        }
    }
}

RBForm.registerFieldType('relationship', RelationshipFormField);


}).call(global);

(function(){

class TextAreaFormField extends FormField {
    renderInput(value) {
        return h('textarea', {
            props: {
                id: 'f_'+this.key,
                disabled: !this.isMutable(),
            },
            attrs: {
                name: this.formName(),
            },
            style: {
                resize: 'none',
            },
            on: {
                change: this.onChange
            },
            hook: {
                insert: (vnode) => { autosize(vnode.elm) }
            }
        }, [value || '']);
    }

    valueFromEvent(e) {
        return e.target.innerText;
    }
}

RBForm.registerFieldType('text:textarea', TextAreaFormField);


}).call(global);

(function(){

class TextFormField extends FormField {

    renderInput(value) {
        if (Array.isArray(this.attr.values))
        {
            return this.renderDropdown(value);
        }


        return h('input', {
            props: {
                name: this.formName(),
                id: 'f_'+this.key,
                type: 'text',
                value: value,
                disabled: !this.isMutable(),
            },
            on: {
                change: this.onChange
            }
        });
    }

    renderDropdown(value) {
        const renderValue = (valueDef) => {
            if (!Array.isArray(valueDef) && typeof valueDef === 'object') {

                console.log('RENDERING OPT GROUPS:' ,valueDef);
                // optgroup
                const label = valueDef.label || '';
                const values = valueDef.values || [];
                return h('optgroup', {
                    props: {
                        label,
                    }
                }, values.map(renderValue));
            }

            if (!Array.isArray(valueDef))
            {
                valueDef = [valueDef, valueDef];
            }

            const [val, ...labels] = valueDef;
            const selected = val == value;

            return h('option', {
                props: {
                    value: val,
                    selected,
                }
            }, [labels.join(' - ')]);
        }
        let options = this.attr.values.map(renderValue);

        return h('select', {
            props: {
                name: this.formName(),
                id: 'f_'+this.key,
                disabled: !this.isMutable(),
            },
            on: {
                change: this.onChange
            }
        }, options);
    }
}

RBForm.registerFieldType('text', TextFormField);


}).call(global);

(function(){

class AssetFormField extends FormField {
    constructor(parentNode, key, attr, initialValue, colW) {
        super(parentNode, key, attr, initialValue, colW);

        this.displayValue = initialValue ? this.renderLoadingMessage() : 'No Asset Selected';

        this.onInputClick = this.onInputClick.bind(this);
        this.assetInputElm = null;
        this.asset = null;

        if (initialValue) {
            this.load(initialValue);
        }

        appendAssetScriptFile();
    }

    resetData(value) {
        console.log('ASSET FORM FIELD VALUE: ', value);
        this.initialValue = value;
        if (value) {
            this.load(value);
        }
    }

    renderInputSection(value) {
        return [
            this.renderPreview(value),
            h('div.formImgFile', {
                style: {
                    verticalAlign: 'top'
                }
            }, [
                this.renderLabel(value),
                this.renderInput(value),
            ]),
        ];
    }

    renderPreview(value) {
        return h('div.formImgThumb', {
            style: {
                position: 'relative',
                background: '#efefef',
                borderRadius: '10px',
                position: 'relative',
                overflow: 'hidden',
                textAlign: 'center',
                fontSize: '24px',
                verticalAlign: 'top',
                lineHeight: '50px'
            }
        }, this.renderPreviewType(value))
    }

    renderPreviewType(value) {
        if (!this.asset) {
            return [];
        }

        const asset = this.asset;

        switch(asset.assetType) {
            case 'Image':
                return [this.renderImagePreview(asset)];
            case 'Video':
                return [this.renderVideoPreview(asset)];
            case 'Audio':
                return [this.renderAudioPreview(asset)];
            case 'Document':
                return [this.renderDocumentPreview(asset)];
            default:
                return [];
        }
    }

    renderImagePreview(asset) {
        return h('div', {
            style: {
                backgroundImage: `url(${asset.downloadLink})`,
                position: 'absolute',
                left: '0px',
                right: '0px',
                top: '0px',
                bottom: '0px',
                backgroundSize: 'cover',
                backgroundPosition: 'center center',
                backgroundRepeat: 'no-repeat'
            },
        })
    }

    renderVideoPreview(asset) {
        // TODO: show real video
        return h('div.fa.fa-file-video-o');
    }

    renderAudioPreview(asset) {
        // TODO: show real audio
        return h('div.fa.fa-file-audio-o');
    }

    renderDocumentPreview(asset) {
        // TODO: adjust based on type of document
        return h('div.fa.fa-file-o');
    }

    renderInput(value) {
        return h('div.editable', {
            style: {
                cursor: 'pointer',
                paddingBottom: '0px'
            },
            on: {
                click: this.onInputClick
            }
        }, [
            h('i.fa.fa-photo', {
                style: {
                    marginRight: '10px',
                    color: '{{#data:key/"primaryColor"}}',
                }
            }),
            h('span', [this.displayValue]),
            h('input', {
                style: {
                    // display: 'none',
                },
                props: {
                    type: 'hidden',
                    // value: value,
                    name: this.formName(),
                    id: 'f_' + this.key,
                    disabled: !this.isMutable(),
                },
                hook: {
                    insert: (vnode) => {this.assetInputElm = vnode.elm; vnode.elm.value = this.initialValue}
                }
            })
        ])
    }

    showAsset(asset) {
        this.displayValue = asset.name;
        this.asset = asset;
        this.getRootForm().updateValue(`_temp.${this.key}.asset`, asset);
        this.update();
    }

    load(id) {
        var url = '/assets/view/' + id;
        $.ajax({
            dataType: 'json',
            url: url,
            method: 'get',
            headers: {
                'Accept': 'application/json'
            },
            success: (data) => {
                // console.log('DATA: ', data);
                var asset = data.data;
                whenDisplayAssetAvailable(this.showAsset.bind(this, asset));
            },
            error: (failure) => {
                console.error('FAIL: ', failure);
            }
        });
    }

    onInputClick(e) {
        showDirectorySelect(this.attr, (asset) => {
            // console.log('ASSET: ', asset);
            this.showAsset(asset);
            this.assetInputElm.value = asset._id;
        });
    }
}

RBForm.registerFieldType('asset', AssetFormField);

var assetScriptFileAppended = false;
function appendAssetScriptFile()
{
    if (!assetScriptFileAppended)
    {
        assetScriptFileAppended = true;

        var scriptEl = document.createElement('script');
        scriptEl.type = 'text/javascript';
        scriptEl.src = '/static/assets/scripts/asset-directory-view.js';
        document.body.appendChild(scriptEl);

        var styleEl = document.createElement('link');
        styleEl.rel = 'stylesheet';
        styleEl.href = '/static/assets/css/asset-directory-view.css';

        document.head.appendChild(styleEl);
    }
}

function showDirectorySelect(attr, callback)
{
    var ownerModelKey = attr.ownerModelKey;
    var ownerId = attr.ownerId;
    var currentSelection = null;

    var modalWrapper = $(document.createElement('div'));
    modalWrapper.css({
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
        background: "rgba(0,0,0,0.4)",
        padding: '20px',
    });

    var well = $(document.createElement('div'));
    well.addClass('well');
    well.addClass('modal');
    modalWrapper.append(well);

    var rowDiv = $(document.createElement('div'));
    rowDiv.addClass('clearfix');
    well.append(rowDiv);

    var directoryElWrapper = $(document.createElement('div'));
    directoryElWrapper.css({
        'width': 'calc(100% - 284px)',
        'min-height': '160px',
        display: 'inline-block',
        float: 'left'
    })
    var directoryEl = $(document.createElement('div'));
    directoryEl.attr('id', 'directory-container');

    directoryElWrapper.append(directoryEl);
    rowDiv.append(directoryElWrapper);

    var previewWrapper = $(document.createElement('div'));
    var preview = $(document.createElement('div'));

    previewWrapper.css({
        display: 'inline-block',
        float: 'left',
        padding: '0 10px 10px',
        'margin-left': '20px',
    });

    var previewTitle = $(document.createElement('h3'));
    previewTitle.css({
        'font-family': 'Poppins, sans-serif',
        'background': 'rgba(239,239,239,1)',
        'color': 'rgb(19, 68, 113)',
        'margin-bottom': '10px',
        'margin-top': '0px',
        'padding': '5px 10px',
        'border-radius': '10px',
    })

    previewTitle.text('Preview')

    preview.css({
        'height': '160px',
        'width': '240px',
        // border: '2px solid #333',
        'background': '#efefef',
        'border-radius': '10px',
        'position': 'relative',
        'overflow': 'hidden',
        'text-align': 'center',
        'font-size': '100px',
        'vertical-align': 'middle',
        'line-height': '160px'
    });

    previewWrapper.append(previewTitle);
    previewWrapper.append(preview);
    rowDiv.append(previewWrapper);

    var controlsDiv = $(document.createElement('div'));
    controlsDiv.addClass('modal-controls');

    well.append(controlsDiv);

    var cancelButton = $(document.createElement('a'));
    cancelButton.addClass('btn');
    cancelButton.text('Cancel');
    cancelButton.click(function(e)
    {
        e.preventDefault();
        modalWrapper.remove();
    })
    controlsDiv.append(cancelButton);

    var selectButton = $(document.createElement('a'));
    selectButton.addClass('btn');
    selectButton.text('Select');
    selectButton.click(function(e)
    {
        onChoose(currentSelection);
    })
    controlsDiv.append(selectButton);

    function onSelect(record) {
        console.log('SELECTED: ', record);
        RB.showAssetPreview(preview[0], record);
        currentSelection = record;
    }

    function onChoose(record) {
        console.log('CHOSEN: ', record);
        callback(record);
        modalWrapper.remove();
    }

    $(document.body).append(modalWrapper);

    RB.runDirectoryView(directoryEl[0], {
        onSelect: onSelect,
        onChoose: onChoose,
        allowDirectorySelect: attr.allowDirectorySelect,
        allowedTypes: attr.allowedTypes || [],
    });
}

var DISPLAY_ASSET_QUEUE = [];
var whenDisplayAssetAvailableTimeout = null;

function whenDisplayAssetAvailableTimeoutFn ()
{
    if (window.RB && window.RB.showAssetPreview)
    {
        DISPLAY_ASSET_QUEUE.forEach(function(fn)
        {
            fn();
        });
    }
    else
    {
        whenDisplayAssetAvailableTimeout = setTimeout(whenDisplayAssetAvailableTimeoutFn, 200);
    }
}

function whenDisplayAssetAvailable(callback) {

    if (window.RB && window.RB.displayAssetPreview)
    {
        return callback();
    }

    DISPLAY_ASSET_QUEUE.push(callback);

    if (!whenDisplayAssetAvailableTimeout)
    {
        whenDisplayAssetAvailableTimeout = setTimeout(whenDisplayAssetAvailableTimeoutFn, 200);
    }
}

AssetFormField.showDirectorySelect = showDirectorySelect;


}).call(global);

(function(){

class HtmlEditorField extends FormField {
    constructor(parentNode, key, attr, initialValue, colW) {
        super(parentNode, key, attr, initialValue, colW);

        this.editor = null;
        this.showingRaw = false;

        this.defaultToolbarHandlers = {
            'image': (value) => {
                const Emitter = this.editor.emitter.constructor;
                const Delta = this.editor.editor.getDelta().constructor;
                console.log('Delta', Delta);
                RBForm.getFieldType('asset').showDirectorySelect(this.attr, (asset) => {
                    console.log('ASSET: ', asset);
                    let range = this.editor.getSelection(true);
                    let delta = new Delta()
                        .retain(range.index)
                        .delete(range.length)
                        .insert({ image: asset.downloadLink });
                    this.editor.updateContents(delta, Emitter.sources.USER);
                });
            }
        }

        loadQuill();
    }

    renderLabel(value) {
        var self = this;
        var children = [this.label(value)];
        if (this.attr.rawEditor) {
            children.push(h('a.switch-link', {
                on: {
                    click: (e) => {
                        this.showingRaw = !this.showingRaw;
                        $(this.editorElm).parent().find('.ql-toolbar').children().css({visibility: this.showingRaw ? 'hidden' : 'visible'});
                        this.getRootForm().updateView();
                    }
                },
                style: {
                    marginLeft: '8px',
                    fontSize: '0.8em',
                    color: '#ccc',
                },
            }, [this.showingRaw ? 'Show Editor' : 'Show Raw HTML' ]));
        }

        return h('label', {
            props: {
                "for": "f_" + this.key,
            }
        }, children);
    }

    renderInput(value) {
        var self = this;
        return h('div', [
            h('div.editor-container', {
                attrs: {
                    // 'allowhtml': 'true',
                    // 'name': this.formName(),
                    // id: 'f_' + this.key,
                    // disabled: !this.isMutable(),
                },
                style: {
                    display: this.showingRaw ? 'none' : 'block',
                },
                hook: {
                    insert: (vnode) => {
                        self.editorElm = vnode.elm;
                        vnode.elm.innerHTML = value;
                        setTimeout(() => {
                            var editor = new Quill(vnode.elm, {
                                modules: { toolbar: HtmlEditorField.defaultToolbarOptions },
                                theme: 'snow'
                            });

                            this.editor = editor;

                            var field = $(this.editor.root);
                            // field.attr('name', this.formName());
                            field.attr('id', 'f_'+this.key);
                            // field.addClass('editable');
                            field.attr('allowhtml', true);
                            field.attr('disabled', !this.isMutable());

                            editor.on('text-change', function(newContents, oldContents, source) {
                                // var delta = editor.getContents();
                                if (source == 'user') {
                                    var html = field.html();
                                    console.log('UPDATE:', html);
                                    self.sendValueUpdate(html);
                                    this.emit('change', value);

                                    $(self.rawEditorElm).val(html);
                                }
                            });

                            var toolbar = this.editor.getModule('toolbar');
                            Object.keys(this.defaultToolbarHandlers).forEach((key) => {
                                toolbar.addHandler(key, this.defaultToolbarHandlers[key]);
                            });


                        }, 1000);

                    }
                }
            }),
            h('textarea.editor-textarea', {
                props: {
                    id: 'f_'+this.key,
                    // type: 'checkbox',
                    disabled: !this.isMutable(),
                },
                attrs: {
                    // contenteditable: true,
                    name: this.formName(),
                },
                style: {
                    display: this.showingRaw ? 'block' : 'none',
                },
                on: {
                    input: function (e) {
                        var delta = self.editor.clipboard.convert(e.target.value)
                        self.editor.setContents(delta);
                        console.log('setting text', e.target.value, delta);
                    }
                },
                hook: {
                    insert: (vnode) => {
                        this.rawEditorElm = vnode.elm;
                    }
                }
            }, [value || ''])
        ])

    }


}

HtmlEditorField.defaultToolbarOptions = [
    ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
    ['blockquote', 'code-block'],
    ['link', 'image', 'video'],

    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'script': 'sub'}, { 'script': 'super' }],      // superscript/subscript
    [{ 'indent': '-1'}, { 'indent': '+1' }],          // outdent/indent
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],

    [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults from theme
    //   [{ 'font': [] }],
    [{ 'align': [] }],

    ['clean']                                         // remove formatting button
];

// HtmlEditorField.

let quillLoading = false;
let style2Text = `
    .editor-container .editable {
        margin-bottom: 0;
        border-bottom-width: 0;
    }
    .editor-container .editable:hover {
        margin-bottom: 0;
        border-bottom-width: 0;
    }
    .editor-container .editable:focus {
        margin-bottom: 0;
        border-bottom-width: 0;
    }

    .editor-container .ql-editor p,
    .editor-container .ql-editor blockquote {
        margin-bottom: 1rem;
    }

    .editor-container {
        height: 375px;
        color: #333;
        /*overflow-y: scroll;*/
    }

    .editor-textarea {
        height: 375px;
        padding: 12px 15px;
        tab-size: 4;
        border: 1px solid #ccc;
        border-top-width: 0;
        outline: none;
        width: 100%;
        box-sizing: border-box;
        resize: none;
    }

    .editor-textarea:focus {
        border: 1px solid #ccc;
        border-top-width: 0;
    }

    .switch-link {
        cursor: pointer;
    }
`;

function loadQuill() {
    if (!quillLoading) {
        quillLoading = true;
        var scriptEl = document.createElement('script');
        scriptEl.src = '//cdn.quilljs.com/1.2.0/quill.js';
        document.body.appendChild(scriptEl);

        var styleEl = document.createElement('link');
        styleEl.rel = 'stylesheet';
        styleEl.href = '//cdn.quilljs.com/1.2.0/quill.snow.css';
        document.body.appendChild(styleEl);

        var styleEl2 = document.createElement('style');
        styleEl2.innerText = style2Text;
        document.body.appendChild(styleEl2);
    }
}

RBForm.registerFieldType('text:html', HtmlEditorField);


}).call(global);

(function(){

class CoordinateFormField extends FormField {
    constructor(parentNode, key, attr, initialValue, colW) {
        super(parentNode, key, attr, initialValue, colW);
        this.onPropChange = {
            x: this.onChange.bind(this, 'x'),
            y: this.onChange.bind(this, 'y'),
        };
    }

    render(value) {
        return h('div.inputContainer', {
            key: this.key,
            style: {
                width: this.colW == null ? '100%' : `${this.colW}%`,
                display: this.hidden() || this.attr.hidden ? 'none' : 'inline-block',
                transition: 'left 400ms',
                position: 'relative',
                left: '100%',
                delayed: {left: '0'},
                remove: {left: '-100%'},
            }
        }, this.renderInputSection(value));
    }

    renderInput({x = 0, y = 0} = {x: 0, y: 0}) {
        return h('div', {
            style: {
            },
        }, [
            this.renderInputItem('x', x),
            this.renderInputItem('y', y),
        ]);
    }

    renderInputItem(propKey, value) {
        // console.log('key', propKey, 'value', value);
        // console.log('PROP KEY: ', `${this.formName()}[${propKey}]`, 'VALUE: ', String(value));
        const name = `${this.formName()}[${propKey}]`;
        const id = `f_${this.key}.${propKey}`;
        return h('div', {
            style: {
                width: '49.5%',
                display: 'inline-block',
                marginLeft: propKey === 'x' ? '0%' : '1%',
            },
        }, [
            h('label', {
                style: {
                    width: '20px',
                },
                props: {
                    'for': id,
                },
            }, [`${propKey.toUpperCase()}: `]),
            h('input', {
                style: {
                    width: 'calc(100% - 20px)',
                    disabled: !this.isMutable(),
                },
                props: {
                    name,
                    id,
                    type: this.attr.hidden ? 'hidden' : 'text',
                    // value: String(value),
                },
                attrs: {
                    value: String(value),
                },
                on: {
                    change: this.onPropChange[propKey],
                },
            }),
        ]);
    }

    onChange(propKey, e) {
        this.sendKeyValueUpdate(`${this.key}.${propKey}`, parseFloat(e.target.value) || 0);
    }
}

RBForm.registerFieldType('coordinate', CoordinateFormField);


}).call(global);

(function(){

class HospotGenerator extends FormField {
    constructor(parentNode, key, attr, initialValue, colW) {
        super(parentNode, key, attr, initialValue, colW);

        let RelationshipFormField = RBForm.getFieldType('relationship');
        this.relationshipField = new RelationshipFormField(this, this.key, attr, this.initialValue, this.colW);

        this.relationshipField.on('change', (value) => {
            this.generate(value);
        });
    }

    renderInput(value) {
        if (this.generating) {
            return h('div', [
                this.renderLoadingMessage("Generating component hotspots..."),
            ]);
        }
        return this.relationshipField.renderInput(value);
    }

    generate(id) {
        var self = this;
        if (id) {
            // load the components
            self.generating = true;
            self.update();

            var done = false;
            var components = [];

            function iter(page) {
                const url = `/components/list/${page}?importId[eq]=${id}`;

                $.ajax(url, {
                    method: 'get',
                    headers: {
                        Accept: 'application/json'
                    },
                    success: (data) => {
                        try
                        {
                            data = JSON.parse(data);
                        }
                        catch (e)
                        {
                            console.log('Error parsing data', e);
                            // show error
                        }

                        console.log('data: ', data)

                        var list = data.data.list;

                        components = components.concat(list);
                        components.sort(function(left, right) {
                            var leftInt = parseInt(left.componentNumber);
                            var rightInt = parseInt(right.componentNumber);


                            if (leftInt < rightInt) {
                                return -1;
                            } else if (rightInt < leftInt) {
                                return 1;
                            } else {
                                return left.componentNumber.localeCompare(right.componentNumber);
                            }
                        });
                        var total = data.data.total;

                        if (components.length >= total) {
                            loaded();
                        } else {
                            iter(page + 1);
                        }
                    }
                });
            }

            function loaded() {
                console.log('Loaded all the components', components);
                const hotspots = components.reduce((items, component) => {
                    const id = `${guid('xxxxxxxx')}-NEW`;
                    const objData = Object.assign({}, {
                        _id: id,
                        componentId: component._id,
                        coordinate: {x: 50, y: 50},
                        pageNumber: '1',
                        dimensions: {x: 3, y: 3},
                    });

                    items[id] = objData;
                    return items;
                }, {});

                console.log('hotspots: ', hotspots);

                self.getRootForm().updateValue('hotSpots', hotspots);

            }

            iter(0);
        }

    }
}

RBForm.registerFieldType('hospotgenerator', HospotGenerator);


}).call(global);

(function(){

class LinkProfilePreview extends FormNode {
    constructor(parentNode, key, attr, initialValue, colW) {
        super(parentNode, key, attr);

        this.colW = colW;
        this.initialValue = initialValue;
        this.imgUrl = '';
        this.selectedHotSpot = '';
        this.pageNumber = 1;

        this.naturalWidth = 0;
        this.naturalHeight = 0;

        this.onHotSpotClick = this.onHotSpotClick.bind(this);
        this.onHotSpotMouseDown = this.onHotSpotMouseDown.bind(this);
        this.onHotSpotMouseMove = this.onHotSpotMouseMove.bind(this);
        this.onHotSpotMouseUp = this.onHotSpotMouseUp.bind(this);
        this.containerElm = null;

        this.onResizeAnchorMouseDown = this.onResizeAnchorMouseDown.bind(this);
        this.onResizeAnchorMouseMove = this.onResizeAnchorMouseMove.bind(this);
        this.onResizeAnchorMouseUp = this.onResizeAnchorMouseUp.bind(this);

        this.dragging = false;
        this.resizing = false;
        this.zoom = 1;
        this.offsetLeft = 0;
        this.offsetTop = 0;

        this.dragStart = [];
        this.dragPos = [];

        this.viewportWidth = 0;
        this.viewportHeight = 0;

        this.adjustX = 0;
        this.adjustY = 0;

        var self = this;
        global.setSelectedHotspot = (key) => {
            self.selectedHotSpot = key;
            var hotSpots = this.getRootForm().getValue(`hotSpots`);
            var hotSpot = hotSpots[key];
            if (hotSpot) {
                hotSpot.isSet = true;
                self.pageNumber = parseInt(hotSpot.pageNumber) || 1;
                self.getRootForm().updateValue(`hotSpots.${key}`, hotSpot);
            }

            self.update();
        }
    }

    render(value) {
        return h('div.inputContainer.joinContainer', {
            style: {
                width: this.colW == null ? '100%' : `${this.colW}%`,
                display: this.hidden() ? 'none' : 'inline-block',
            },
            hook: {
                insert: (vnode) => {this.containerElm = vnode.elm;},
            },
        }, [h('div.well.inner-well', [
            this.renderLabel(),
            // this.renderPageTabs(value),
            this.renderPreview(value),
            this.renderZoomToggles(),
        ])]);
    }

    renderLabel(value) {
        return h('h3', {
            props: {
                "for": "f_" + this.key,
            },
            style: {
                marginTop: '0px',
                marginBottom: '10px',
                background: 'none',
            },
        }, [this.label(value)]);
    }

    renderPageTabs(value) {
        const pages = value.pages;
        const pageKeys = Object.keys(pages || {});
        return h('div.tabs', pageKeys.map((pageKey) => {
            const page = pages[pageKey];

            return h('a.tab', {
                'class': {
                    selected: this.pageNumber === parseInt(page.pageNumber)
                },
                style: {
                    cursor: 'pointer',
                },
                on: {
                    click: (e) => {
                        e.preventDefault();
                        this.pageNumber = parseInt(page.pageNumber);
                        this.update();
                    }
                }
            }, [`Page ${page.pageNumber}`]);
        }));
    }

    renderPreview(value) {
        let image = '';
        // console.log('TMP', value._temp);
        if (value._temp && value._temp.sampleSchematicAssetId) {
            image = value._temp.sampleSchematicAssetId.asset.downloadLink;
        }
        // if (value._temp /*&& value._temp.pages*/) {
        //     const pages = value.pages;
        //     const assetPages = value._temp.pages;
        //     const pageKeys = Object.keys(pages);
        //     for (let i = 0; i < pageKeys.length; i++) {
        //         let pageKey = pageKeys[i];
        //         if (parseInt(pages[pageKey].pageNumber) === this.pageNumber) {
        //             image = assetPages[pageKey].sampleSchematicAssetId.asset.downloadLink;
        //             break;
        //         }
        //     }
        // }
        //
        // console.log('_temp', value._tmp);
        // console.log('_temp.sampleSchematicAssetId', value._tmp && value._tmp.sampleSchematicAssetId);
        // console.log('_temp.sampleSchematicAssetId.asset', value._tmp && value._tmp.sampleSchematicAssetId && value._tmp.sampleSchematicAssetId.asset);
        // console.log('IMAGE: ', image);

        var ratio = this.viewportWidth / this.naturalWidth;
        var height = this.naturalHeight * ratio;

        // var

        console.log('ratio: ', ratio, 'height: ', height);

        var left = this.offsetLeft - this.adjustX;
        var top = this.offsetTop - this.adjustY;

        console.log('LFET: ', left, 'offset left: ', this.offsetLeft, 'adjustX', this.adjustX);
        console.log('top', top);

        return h('div', {
            style: {
                position: 'relative',
                overflow: 'hidden',
                border: '1px solid black',
                userSelect: 'none',
                height: height + 'px',
            },
            hook: {
                insert: (vnode) => {
                    this.viewportWidth = vnode.elm.getBoundingClientRect().width;
                    this.viewportHeight = (this.viewportWidth / this.naturalWidth) * this.naturalHeight;
                    console.log('elm: ', vnode.elm);
                    console.log('VIEWPORT WIDTH: ', this.viewportWidth);
                    this.update();
                },
            },
        }, [
            h('div', {
                style: {
                    // width: '100%',
                    // marginBottom: '-8px',
                    position: 'absolute',
                    width: (this.viewportWidth * this.zoom) + 'px',
                    height: (this.viewportHeight * this.zoom) + 'px',
                    top: top + 'px',
                    left: left + 'px',
                    cursor: 'move',
                },
                on: {
                    mousedown: (e) => {
                        e.preventDefault();
                        console.log('MOUSE DOWN');

                        this.draggingSchematic = true;
                        var mouseStartX, mouseCurrentX, mouseStartY, mouseCurrentY;
                        mouseStartX = mouseCurrentX = e.clientX;
                        mouseStartY = mouseCurrentY = e.clientY;

                        var mousemoveListener = (e) => {
                            console.log('MOUSE MOVE');
                            e.preventDefault();
                            mouseCurrentX = e.clientX;
                            mouseCurrentY = e.clientY;

                            var adjustX = mouseStartX - mouseCurrentX;
                            var adjustY = mouseStartY - mouseCurrentY

                            this.adjustX = adjustX;
                            this.adjustY = adjustY;

                            this.update();
                        };

                        var mouseupListener = (e) => {
                            e.preventDefault();
                            console.log('MOUSE UP');
                            window.removeEventListener('mousemove', mousemoveListener);
                            window.removeEventListener('mouseup', mouseupListener);

                            var adjustX = mouseStartX - mouseCurrentX;
                            var adjustY = mouseStartY - mouseCurrentY

                            console.log('ADJUST X:', adjustX);
                            console.log('ADJUST Y: ', adjustY);

                            this.offsetLeft -= adjustX;
                            this.offsetTop -= adjustY;
                            this.adjustX = 0;
                            this.adjustY = 0;
                            this.draggingSchematic = false;

                            this.update();
                        };

                        window.addEventListener('mousemove', mousemoveListener);
                        window.addEventListener('mouseup', mouseupListener);
                    }
                }
            }, [
                h('img', {
                    props: {
                        src: image,
                    },
                    style: {
                        height: '100%',
                        width: '100%',
                    },
                    on: {
                        load: (e) => {
                            console.log('loaded', e, e.target);
                            this.naturalWidth = e.target.naturalWidth;
                            this.naturalHeight = e.target.naturalHeight;
                            this.viewportHeight = (this.viewportWidth / this.naturalWidth) * this.naturalHeight;
                            console.log('NATURAL WIDTH', this.naturalWidth);
                            console.log('NATURAL HEIGHT', this.naturalHeight);
                            console.log('VIEWPORT WIDTH', this.viewportWidth);
                            console.log('VIEWPORT HEIGHT', this.viewportHeight);
                            this.update();
                        },
                    },
                }),
            ].concat(this.renderHotSpots(value))),
        ]);
    }

    renderHotSpots(value) {
        let hotSpots = value.hotSpots;
        return Object.keys(hotSpots || {}).map((key) =>{
            const selected = key === this.selectedHotSpot;
            const color = selected ? LinkProfilePreview.SELECTED_COLOR : LinkProfilePreview.BG_COLOR;
            const hotSpot = hotSpots[key];
            if (!hotSpot.isSet || parseInt(hotSpot.pageNumber) !== this.pageNumber) {
                return null;
            }
            let _w = hotSpot.dimensions ? hotSpot.dimensions.x : 0;
            let _h = hotSpot.dimensions ? hotSpot.dimensions.y : 0;
            let _x = hotSpot.coordinate ? hotSpot.coordinate.x : 0;
            let _y = hotSpot.coordinate ? hotSpot.coordinate.y : 0;

            if (selected && this.dragging) {
                [_x, _y] = this.calculateDragPos(_x, _y);
            }

            if (selected && this.resizing) {
                [_w, _h] = this.calculateDragSize(_w, _h);
            }

            var _calcW = _w * this.zoom;
            var _calcH = _h * this.zoom;
            return h('div', {
                key,
                style: {
                    position: 'absolute',
                    left: `${_x - _w / 2}%`,
                    top: `${_y - _w / 2}%`,
                    width: `${_w}%`,
                    height: `${_h}%`,
                    borderRadius: `20px`,
                    background: `rgba(${color},0.2)`,
                    border: `2px solid rgba(${color},0.5)`,
                    transition: selected ? 'none' : 'left 200ms, top 200ms, width 200ms, height 200ms',
                    cursor: selected ? 'move' : 'pointer',
                },
                attrs: {
                    key: key,
                },
                on: {
                    click: selected ? null : this.onHotSpotClick,
                    mousedown: selected ? this.onHotSpotMouseDown : null,
                    // mouseup: selected ? this.onHotSpotMouseUp : null,
                    // mousemove: selected? this.onHotSpotMouseMove : null,
                },
            }, selected ? this.renderHotSpotAnchors(hotSpot, _w, _h, _x, _y) : []);
        }).filter((item) => !!item);
    }

    renderHotSpotAnchors(hotSpot, _w, _h, _x, _y) {
        const positions = [
            'tl',
            'tr',
            'br',
            'bl',
        ];

        return positions.map((pos) =>{
            let [vert,horiz] = pos.split('');

            let cursor = '';
            switch (pos) {
                case 'tr':
                case 'bl':
                    cursor = 'nesw-resize';
                    break;
                case 'tl':
                case 'br':
                    cursor = 'nwse-resize';
                    break;
            }


            return h('div', {
                style: {
                    position: 'absolute',
                    top: vert == 't' ? '-2px' : 'auto',
                    bottom: vert == 'b' ? '-2px' : 'auto',
                    left: horiz == 'l' ? '-2px' : 'auto',
                    right: horiz == 'r' ? '-2px' : 'auto',
                    width: '8px',
                    height: '8px',
                    // background: 'black',
                    opacity: 0,
                    cursor: cursor,
                },
                attrs: {
                    location: pos,
                },
                on: {
                    mousedown: this.onResizeAnchorMouseDown,
                },
            });
        });

        // return [];
    }

    renderZoomToggles() {
        return h('div', {
            style: {
                padding: '10px 0',
                // position: 'absolute',
                // left: left + 'px',
                // bottom: '160px',
            },
        }, [h('a', {
            style: {
                padding: '5px 16px',
                margin: '0px',
                fontSize: '16px',
                border: '1px solid #ccc',
                background: 'white',
                color: '#333',
                // userSelect: state.schematic.isDragging ? 'none' : 'initial',
                cursor: 'pointer',
            },
            on: {
                click: (e) => {
                    var x = (this.viewportWidth * this.zoom) / 2;
                    var y = (this.viewportHeight * this.zoom) / 2;
                    this.dozoom(0.5, x, y);
                },
            },

        }, [h('i.fa.fa-search-minus')]), h('a', {
            style: {
                padding: '5px 16px',
                margin: '0px',
                fontSize: '16px',
                border: '1px solid #ccc',
                background: 'white',
                color: '#333',
                // userSelect: state.schematic.isDragging ? 'none' : 'initial',
                cursor: 'pointer',
            },
            on: {
                click: (e) => {
                    var x = (this.viewportWidth * this.zoom) / 2;
                    var y = (this.viewportHeight * this.zoom) / 2;
                    this.dozoom(2, x, y);
                },
            },
        }, [h('i.fa.fa-search-plus')])]);
    }

    dozoom(change, x, y) {
        var {
            naturalWidth,
            naturalHeight,
            viewportWidth,
            viewportHeight,
            offsetLeft,
            offsetTop,
            zoom,
        } = this;

        var schematicWidth = Math.floor(naturalWidth * zoom);
        var schematicHeight = Math.floor(naturalHeight * zoom);


        console.log('X:', x, 'Y:', y);

        var newZoom = Math.min(4, Math.max(zoom * change, 1));

        var zoomout = change < 1;

        var ratioX = x / (schematicWidth * zoom);
        var ratioY = y / (schematicHeight * zoom);

        var offsetLeft, offsetTop;

        var magnitudeX = (newZoom - zoom) * schematicWidth;
        var magnitudeY = (newZoom - zoom) * schematicHeight;
        if (!zoomout) {
            var deltaX = magnitudeX * ratioX * -1;
            var deltaY = magnitudeY * ratioY * -1;
            var offsetLeft = Math.round(offsetLeft + deltaX);
            var offsetTop = Math.round(offsetTop + deltaY);
        } else {
            var oldMaxOffsetX = (zoom * schematicWidth) - schematicWidth;
            var newMaxOffsetX = (newZoom * schematicWidth) - schematicWidth;
            var oldMaxOffsetY = (zoom * schematicHeight) - schematicHeight;
            var newMaxOffsetY = (newZoom * schematicHeight) - schematicHeight;

            // console.log('OLDMAXOFFSETX', oldMaxOffsetX);
            // console.log('NEWMAXOFFSETX', newMaxOffsetX);
            // console.log('CURRENT OFFSET LEFT:', offsetLeft);
            // console.log('RATIO', (offsetLeft / oldMaxOffsetX));
            // console.log('OFFSETLEFT:', (offsetLeft / oldMaxOffsetX) * newMaxOffsetX);


            offsetLeft = (offsetLeft / oldMaxOffsetX) * newMaxOffsetX || 0;
            offsetTop = (offsetTop / oldMaxOffsetY) * newMaxOffsetY || 0;
        }

        this.offsetLeft = offsetLeft;
        this.offsetTop = offsetTop;
        this.zoom = newZoom;
        this.update();
    }

    onHotSpotClick(e) {
        const key = e.target.getAttribute('key');
        this.selectedHotSpot = key;
        // console.log(e);
        this.update();
    }

    onHotSpotMouseDown(e) {
        this.dragging = true;
        this.dragStart = [e.clientX, e.clientY];
        this.dragPos = this.dragStart;

        e.stopPropagation();

        window.addEventListener("mouseup", this.onHotSpotMouseUp);
        window.addEventListener("mousemove", this.onHotSpotMouseMove);
    }

    onHotSpotMouseMove(e) {
        if (this.dragging) {
            this.dragPos = [e.clientX, e.clientY];
            this.update();
        }
    }

    onHotSpotMouseUp(e) {
        if (this.dragging) {
            this.dragging = false;
            let key = `hotSpots.${this.selectedHotSpot}.coordinate`;
            let coordinate = this.getRootForm().getValue(key) || {};
            // console.log('COORDINATE: ', coordinate);
            let {x = 0 , y = 0} = coordinate;
            let [newX, newY] = this.calculateDragPos(x, y);

            // console.log('NEW X:', newX);
            // console.log('NEW Y: ', newY);
            this.sendKeyValueUpdate(key, {x: parseFloat(newX.toFixed(2)), y: parseFloat(newY.toFixed(2))});
            // this.update();
        }

        window.removeEventListener("mouseup", this.onHotSpotMouseUp);
        window.removeEventListener("mousemove", this.onHotSpotMouseMove);
    }

    onResizeAnchorMouseDown(e) {
        e.preventDefault();
        e.stopPropagation();

        this.resizing = true;
        this.resizingFrom = e.target.getAttribute('location');
        this.dragStart = [e.clientX, e.clientY];
        this.dragPos = this.dragStart;

        window.addEventListener("mousemove", this.onResizeAnchorMouseMove);
        window.addEventListener("mouseup", this.onResizeAnchorMouseUp);
    }

    onResizeAnchorMouseMove(e) {
        // console.log('MOVING:', e);
        if (this.resizing) {
            this.dragPos = [e.clientX, e.clientY];
            this.update();
        }
    }

    onResizeAnchorMouseUp(e) {
        if (this.resizing) {
            this.resizing = false;
            let key = `hotSpots.${this.selectedHotSpot}.dimensions`;
            let dimensions = this.getRootForm().getValue(key) || {};
            // console.log('DIMENSIONS: ', dimensions);
            let {x = 0, y = 0} = dimensions;
            let [newX, newY] = this.calculateDragSize(x, y);

            // console.log('NEW X:', newX);
            // console.log('NEW Y: ', newY);
            this.sendKeyValueUpdate(key, {x: parseFloat(newX.toFixed(2)), y: parseFloat(newY.toFixed(2))});
            // this.update();
        }
        window.removeEventListener("mousemove", this.onResizeAnchorMouseMove);
        window.removeEventListener("mouseup", this.onResizeAnchorMouseUp);
    }

    calculateDragPos(_x, _y) {
        let [startX, startY] = this.dragStart;
        let [currentX, currentY] = this.dragPos;

        let [offsetX, offsetY] = [
            startX - currentX,
            startY - currentY,
        ];

        // let [clientWidth, clientHeight] = [window.innerWidth, window.innerHeight];
        let [containerWidth, containerHeight] = [this.containerElm.clientWidth, this.containerElm.clientHeight];

        let [offsetXPercent, offsetYPercent] = [
            offsetX / containerWidth * 100,
            offsetY / containerHeight * 100,
        ];

        _x -= offsetXPercent;
        _y -= offsetYPercent;

        return [Math.max(Math.min(_x,100), 0), Math.max(Math.min(_y,100), 0)];
    }

    calculateDragSize(_w, _h) {
        let resizingFrom = this.resizingFrom;
        let [startX, startY] = this.dragStart;
        let [currentX, currentY] = this.dragPos;

        let [offsetX, offsetY] = [
            startX - currentX,
            startY - currentY,
        ];

        let [containerWidth, containerHeight] = [this.containerElm.clientWidth, this.containerElm.clientHeight];

        let [offsetXPercent, offsetYPercent] = [
            offsetX / containerWidth * 100,
            offsetY / containerHeight * 100,
        ];

        if (resizingFrom[1] === 'r') {
            _w -= offsetXPercent * 2;
        }
        else {
            _w += offsetXPercent * 2;
        }

        if (resizingFrom[0] === 'b') {
            _h -= offsetYPercent * 2;
        }
        else {
            _h += offsetYPercent * 2;
        }

        return [Math.max(Math.min(_w,100), 0), Math.max(Math.min(_h,100), 0)];
    }
}

LinkProfilePreview.BG_COLOR = "100,100,255";
LinkProfilePreview.SELECTED_COLOR = "255,100,100";

RBForm.registerFieldType('linkprofilepreview', LinkProfilePreview);


}).call(global);
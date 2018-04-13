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

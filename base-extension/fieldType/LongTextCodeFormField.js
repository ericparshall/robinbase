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
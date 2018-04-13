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

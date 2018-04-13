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

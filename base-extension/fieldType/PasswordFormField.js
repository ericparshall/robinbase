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
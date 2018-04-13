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
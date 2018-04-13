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
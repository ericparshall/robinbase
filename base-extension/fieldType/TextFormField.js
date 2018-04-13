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

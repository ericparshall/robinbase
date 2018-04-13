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
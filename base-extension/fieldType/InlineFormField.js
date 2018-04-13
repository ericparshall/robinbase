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
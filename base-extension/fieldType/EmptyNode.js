class EmptyNode extends FormNode {
    constructor(parentNode, key, attr, initialValue, colW) {
        super(parentNode, key, attr);
        this.colW = colW;
    }
    render(value) {
        return h('div.inputContainer.desktopSpacer', {
            style: {
                width: this.colW == null ? '100%' : `${this.colW}%`,
                display: 'inline-block',
            }
        }, [h('br')]);
    }
}

RBForm.registerFieldType('empty', EmptyNode);

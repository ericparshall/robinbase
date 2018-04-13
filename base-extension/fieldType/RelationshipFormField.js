class RelationshipFormField extends FormField {
    constructor(parentNode, key, attr, initialValue, colW) {
        initialValue = initialValue || '';
        super(parentNode, key, attr, initialValue, colW);

        this.loaded = false;
        this.selectField = null;
        this.load(initialValue);
    }

    renderInput(value = '') {
        return this.loaded ? this.selectField.renderInput(value) : this.renderLoadingMessage();
    }

    load(value) {
        if (this.attr.queryLink)
        {
            let useQueryLink = this.attr.queryLink;
            if (!this.isMutable())
            {
                const joinChar = useQueryLink.indexOf('?') > -1 ? '&' : '?';
                useQueryLink += `${joinChar}selected=${value}`;
            }

            console.log('USEE QUERY LINK:', useQueryLink);

            const processData = (data) => {
                let values = (this.attr.values || []).concat(data.data);
                let attr = Object.assign({}, this.attr, {values});

                let TextFormField = RBForm.getFieldType('text');
                this.selectField = new TextFormField(this, this.key, attr, this.initialValue, this.colW);
                this.selectField.on('change', (value) => {
                    this.emit('change', value);
                });
                this.loaded = true;
                this.update();
            }

            if (RelationshipFormField.queryCache.has(useQueryLink)) {
                RelationshipFormField.queryCache.get(useQueryLink).onValue(processData);
            } else {
                var futureValue = new FutureValue;

                RelationshipFormField.queryCache.set(useQueryLink, futureValue);
                futureValue.onValue(processData);

                $.get(useQueryLink, (data) => {
                    try
                    {
                        data = JSON.parse(data);
                        futureValue.setValue(data);
                    }
                    catch (e)
                    {
                        console.log('Error parsing data', e);
                        // show error
                    }
                });
            }
        } else {
            console.warn('missing query link');
        }
    }
}

RelationshipFormField.queryCache = new Map();

class FutureValue {
    constructor() {
        this.listeners = [];
        this.resolved = false;
    }

    setValue(value) {
        this.value = value;
        this.resolved = true;
        this.listeners.forEach((l) => {
            l(value);
        });

        this.listeners = [];
    }

    onValue(listener) {
        if (this.resolved) {
            listener(this.value);
        } else {
            this.listeners.push(listener);
        }
    }
}

RBForm.registerFieldType('relationship', RelationshipFormField);

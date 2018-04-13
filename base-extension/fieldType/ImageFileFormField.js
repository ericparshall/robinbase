class ImageFileFormField extends FormField {
    constructor(parentNode, key, attr, initialValue, colW) {
        super(parentNode, key, attr, initialValue, colW);

        this.initialDisplayValue = initialValue || 'No File Selected';
        this.initialValue = initialValue;
        this.displayValue = this.initialDisplayValue;
        this.initialImgUrl = initialValue ? (attr.baseUrl + initialValue) : '';
        this.imgUrl = this.initialImgUrl;
        this.fileInput = null;

        this.onInputClick = this.onInputClick.bind(this);
        this.onFileInputChange = this.onFileInputChange.bind(this);
    }

    renderInputSection(value) {
        return [
            this.renderPreview(value),
            h('div.formImgFile', [
                this.renderLabel(value),
                this.renderInput(value),
            ]),
        ];
    }

    renderPreview(value) {
        return h('div.formImgThumb', [
            h(`div#fPrev_${this.key}`, {
                style: {
                    maxWidth: '160px',
                    height: '50px',
                    backgroundSize: 'contain',
                    backgroundColor: '#efefef',
                    backgroundPosition: 'center center',
                    bacgkroundRepeat: 'no-repeat',
                    borderRadius: '10px',
                    backgroundImage: this.imgUrl ? `url(${this.imgUrl})` : 'none'
                }
            })
        ])
    }

    renderInput(value) {
        return h('div.editable', {
            style: {
                cursor: 'pointer',
                paddingBottom: '0px'
            },
            on: {
                click: this.onInputClick
            }
        }, [
            h('i.fa.fa-photo', {
                style: {
                    marginRight: '10px',
                    color: '{{#data:key/"primaryColor"}}',
                }
            }),
            h('span', [this.displayValue]),
            h('input', {
                style: {
                    display: 'none',
                },
                props: {
                    type: 'file',
                    // value: value,
                    name: this.formName(),
                    id: 'f_' + this.key,
                    disabled: !this.isMutable(),
                },
                on: {
                    change: this.onFileInputChange,
                },
                hook: {
                    insert: (vnode) => {this.fileInput = vnode.elm}
                }
            })
        ])
    }

    onInputClick(e) {
        if (this.fileInput) {
            this.fileInput.click();
        }
    }

    onFileInputChange(e) {
        let name = (e.target.value || '').split('\\');
        name = name[name.length - 1];

        this.displayValue = name || this.initialDisplayValue;

        let file = e.target.files[0] || null;
        if (file)
        {
            if (file.type.indexOf('image/') === 0)
            {
                let reader = new FileReader();
                reader.onload = (e) => {
                    this.imgUrl = e.target.result;
                    this.update();
                }
                reader.readAsDataURL(file);
            }
            else
            {
                this.imgUrl = '';
            }
        }
        else
        {
            this.imgUrl = this.initialImgUrl;
        }

        this.update();
    }
}

RBForm.registerFieldType('file:image', ImageFileFormField);

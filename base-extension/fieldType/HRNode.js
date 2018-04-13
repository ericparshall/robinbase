class HRNode extends FormNode {
    constructor(parentNode, key, attr, initialValue, colW) {
        super(parentNode, key, attr, initialValue, colW);

        this.colW = colW;
        // console.log('HR: ', this.attr);

        this.initial = (attr.closed == true) ? true : false;
        this.closed = attr.closed || false;
        this.slideElm = null;
        this.onTitleClick = this.onTitleClick.bind(this);

      /*  let styleSheet = document.styleSheets[0];
        let fadeOutKeys =
                '@-webkit-keyframes fadeOut {'+
            '0% {opacity:1}'+
            '100% {opacity:0}'+
        '}';
        styleSheet.insertRule(fadeOutKeys, 0);
        let fadeInKeys =
            '@-webkit-keyframes fadeIn {'+
            '0% {opacity:0}'+
            '100% {opacity:1}'+
        '}';
        styleSheet.insertRule(fadeInKeys, 0);*/
    }

    resetData(newData) {
        const rootForm = this.getRootForm();

        this.childNodes.forEach((child) => {
            child.resetData(rootForm.calculateFieldValue(child))
        })
    }



    render(value) {
        const label = this.label();
        const initial = this.initial;

        if (label) {
            return h('div.inputContainer', {
                key: this.key,
                style: {
                    display: this.hidden() ? 'none' : 'inline-block',
                    width: isFinite(this.colW) ? `${this.colW}%` : '100%',
                    paddingBottom: this.closed ? '0px' : '15px',
                    animationName:'fadeIn',
                    animationDuration: '0.3s',
                    animationDelay: '0.3s',
                    animationIterationCount: 1,
                    animationDirection: 'normal',
                    animationFillMode: 'forwards',
                    position: 'relative',
                    overflow:'hidden',
                    opacity: '0',
                    remove: {animationName:'fadeOut',
                        animationDuration: '0.3s',
                        animationDelay: '0.0s',
                        animationIterationCount: 1,
                        animationDirection: 'normal',
                        animationFillMode: 'forwards'},
                },
                class: {
                    fakeContainer: label === '-',
                    initialLoadContainer: initial === true,
                    collapsedContainer: this.closed === true
                }
            }, [
                this.renderTitle(label),
                this.renderFormSection(label, value),
            ])
        } else {
            return h('hr');
        }
    }

    renderTitle(label) {
        return h('h3', {
            on: {
                click: this.onTitleClick
            },
        }, [label])
    }

    renderFormSection(label, value) {
        const children = this.visibleChildNodes().map(child => child.render(
            this.getForm().calculateFieldValue(child, value)
        ));

        return h('div.formSection', {
            style: {
                overflow: 'hidden',
                paddingBottom: this.closed ? '0px' : '20px',
                paddingTop: this.closed ? '0px' : '10px',
                transition: 'padding 400ms',
                width: '100%',
                padding: label == '-' ? '0px' : '10px'
            }
        }, [
            //http://jsfiddle.net/n5XfG/2596/
            h('div.slideWrapper', {
                style: {
                    marginTop: this.closed ? `-${this.getSlideElmHeight()}px` : '0px',
                    transition: 'margin-top 400ms',
                },
                hook: {
                    insert: (vnode) => this.slideElm = vnode.elm
                }
            }, children)
        ])
    }

    onTitleClick(e) {
        this.closed = !this.closed;
        this.initial = false;
        this.update();
    }

    getSlideElmHeight() {
        return $(this.slideElm).height();
    }
}

RBForm.registerFieldType('hr', HRNode);

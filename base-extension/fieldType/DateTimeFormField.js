class DateTimeFormField extends FormField {

    renderInput(value) {

        let d = value;//isNaN(value) ? new Date(value) : new Date(parseInt(value));



        d = moment(value).format("MM/DD/Y h:mm A")
        //d = flatpickr.prototype.formatDate(d, "m/d/Y h:i K");

        let stamp = isNaN(value) ? '' : '1';
        return h('div', [
            h('i.fa.fa-calendar', {
                attrs: {
                    "aria-hidden": true
                },
                style: {
                    marginRight: '10px'
                }
            }),
            h('input.calendarInput', {
                props: {
                    name: this.formName(),
                    id: 'f_'+this.key,
                    value: d,
                    disabled: !this.isMutable(),
                },
                on: {
                    change: this.onChangeDate
                },
                attrs: {
                    stamp,
                },
                hook: {
                    insert: (vnode) => { vnode.elm.flatpickr({
                        dateFormat: "m/d/Y h:i K",
                        enableTime:true
                    })

                    }
                }
            })
        ]);
    }
}

RBForm.registerFieldType('time:datetime', DateTimeFormField);

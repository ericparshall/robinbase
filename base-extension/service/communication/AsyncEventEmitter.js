const handlers$ = Symbol('events');

function AsyncEventEmitter()
{
    const self = this;

    AsyncEventEmitter.mixin(self);
}

AsyncEventEmitter.addEventProperties = function(target)
{
    target[handlers$] = {};
}

AsyncEventEmitter.addEventMethods = function(target)
{
    /**
     * Register an event handler with the emitter
     *
     * The action should have the signature (data, callback) => *
     * It should callback with any errors that have occurred.
     *
     * @param {string|string[]} eventNames An event name or array of event names to register a handler for
     * @param {function} action A handler to be called when the event name is emitted
     * @param {boolean} once If true, the event listener will be deregistered after it is called the first time
     * @returns {this} Returns the event emitter the event is registered on
     */
    target.on = function on(eventNames, action, once)
    {
        once = Boolean(once);
        eventNames = Array.isArray(eventNames) ? eventNames : [eventNames];
        eventNames.forEach(function(eventName)
        {
            target[handlers$][eventName] = Array.isArray(target[handlers$][eventName]) ? target[handlers$][eventName] : [];
            target[handlers$][eventName] = target[handlers$][eventName].concat([{
                once,
                action,
                called: false
            }]);
        });

        return target;
    }

    /**
     * Register an event handler with the emitter that will only be called once and then deregistered
     *
     * The action should have the signature (data, callback) => *
     * It should callback with any errors that have occurred.
     *
     * @param {string|string[]} eventNames An event name or array of event names to register a handler for
     * @param {function} action A handler to be called when the event name is emitted
     * @returns {this} Returns the event emitter the event is registered on
     */
    target.once = function once(eventNames, action)
    {
        return target.on(eventNames, action, true);
    }

    /**
     * Register an event handler with the emitter but put it at the front of the handler list
     *
     * The action should have the signature (data, callback) => *
     * It should callback with any errors that have occurred.
     *
     * @param {string|string[]} eventNames An event name or array of event names to register a handler for
     * @param {function} action A handler to be called when the event name is emitted
     * @param {boolean} once If true, the event listener will be deregistered after it is called the first time
     * @returns {this} Returns the event emitter the event is registered on
     */
    target.prependOn = function prefixOn(eventNames, action, once)
    {
        once = Boolean(once);
        eventNames = Array.isArray(eventNames) ? eventNames : [eventNames];
        eventNames.forEach(function(eventName)
        {
            target[handlers$][eventName] = Array.isArray(target[handlers$][eventName]) ? target[handlers$][eventName] : [];
            target[handlers$][eventName] = [{
                once,
                action,
                called: false
            }].concat(target[handlers$][eventName]);
        })

        return target;
    }

    /**
     * Register an event handler with the emitter that will only be called once and then deregistered
     *
     * The handler will be put at the front of the handler list.
     *
     * The action should have the signature (data, callback) => *
     * It should callback with any errors that have occurred.
     *
     * @param {string|string[]} eventNames An event name or array of event names to register a handler for
     * @param {function} action A handler to be called when the event name is emitted
     * @returns {this} Returns the event emitter the event is registered on
     */
    target.prependOnce = function prefixOnce(eventName, action)
    {
        return target.prependOn(eventName, action, true);
    }

    /**
     * Emit an event
     *
     * @param {string|string[]} eventNames The name or names of events being emitted
     * @param {*} data The data being sent to all handlers for the event
     * @param {boolean} collectErrors If false, callback will be called with the first error and no more handlers will be called
     *                                If true, all handlers will be called and callback will be called with an array of returned errors
     * @param {function} callback Will be called with any errors that occured after the process finishes
     */
    target.emit = function emit(eventNames, data, collectErrors, callback)
    {
        if (arguments.length === 3)
        {
            callback = collectErrors;
            collectErrors = false;
        }

        eventNames = Array.isArray(eventNames) ? eventNames : [eventNames];
        let errors = collectErrors ? [] : null;

        function eventNameIter(eventNameIndex)
        {

            if (eventNameIndex >= eventNames.length)
            {
                return callback(errors);
            }

            const eventName = eventNames[eventNameIndex];

            const handlers = Array.isArray(target[handlers$][eventName]) ? target[handlers$][eventName] : [];

            function finish()
            {
                target[handlers$][eventName] = handlers.filter(function(handler)
                {
                    return !(handler.once && handler.called);
                });

                if (!collectErrors && errors)
                {
                    return callback(errors);
                }

                process.nextTick(eventNameIter, eventNameIndex + 1);
            }

            function iter(index)
            {
                const handler = handlers[index];

                if (typeof handler === 'undefined')
                {
                    return finish();
                }

                // this should prevent the handler from being called more than once
                if (handler.once && handler.called)
                {
                    return process.nextTick(iter, index + 1);
                }

                handler.called = true;

                handler.action(data, function(err)
                {
                    if (err)
                    {
                        if (collectErrors)
                        {
                            errors.push(err);
                        }
                        else
                        {
                            // if not collection errors, we are failing on the first error
                            errors = err;
                            return finish();
                        }
                    }

                    process.nextTick(iter, index + 1);
                });
            }

            iter(0);
        }

        eventNameIter(0);
    }

    /**
     * Removes the first instance of an action from an event handler list
     *
     * @param {string} eventName The name of the event the handler is being removed from
     * @param {function} action The function that has been set as a handler
     */
    target.removeEventHandler = function(eventName, action)
    {
        const handlers = target[handlers$][eventName];
        if (!Array.isArray(handlers))
        {
            return;
        }

        for (let i = 0; i < handlers.length; i++)
        {
            if (handlers[i].action === action)
            {
                target[handlers$] = handlers.slice(0, i).concat(handlers.slice(i+1));
                return;
            }
        }
    }

    /**
     * Gets a copy of all the handlers for an event
     *
     * @param {string} eventName
     * @returns {object[]} An array of eventHandlers with the shape {once: boolean, action: function, called: boolean}
     */
    target.handlers = function(eventName)
    {
        const handlers = target[handlers$][eventName] || [];

        // make a copy
        return handlers.map(function(handler)
        {
            return Object.assign({}, handler);
        });
    }


    /**
     * Removes all handlers for one or more event names.
     *
     * @param {...string} eventNames One or more event names to remove all handlers for
     * @returns {this} The emitter the handlers are being removed from
     */
    target.removeAllHandlers = function(...eventNames)
    {
        eventNames.forEach(eventName)
        {
            target[handlers$][eventName] = [];
        }

        return target;
    }
}

AsyncEventEmitter.mixin = function(target)
{
    AsyncEventEmitter.addEventProperties(target);
    AsyncEventEmitter.addEventMethods(target);
}

module.exports = AsyncEventEmitter;

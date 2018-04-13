const PathFinder = require('../../base-extension/service/util/PathFinder');



describe('PathFinder', () =>
{
    describe('smartSplit', () =>
    {

        it('splits a comma-separated string into its parts', () =>
        {
            expect(PathFinder.smartSplit('key1')).toEqual(['key1']);
            expect(PathFinder.smartSplit('key1.key2')).toEqual(['key1', 'key2']);
            expect(PathFinder.smartSplit('key1.key2.key3.key4')).toEqual(['key1', 'key2', 'key3', 'key4']);
        });

        it('handles bracket syntax', () =>
        {
            expect(PathFinder.smartSplit('key1[key2]')).toEqual(['key1', 'key2']);
            expect(PathFinder.smartSplit('key1[key2][key3][key4]')).toEqual(['key1', 'key2', 'key3', 'key4']);
            expect(PathFinder.smartSplit('key1[key2].key3[key4]')).toEqual(['key1', 'key2', 'key3', 'key4']);
        });

        it('allows dots within the bracket', () =>
        {
            expect(PathFinder.smartSplit('key1[key2.key3]')).toEqual(['key1', 'key2.key3']);
            expect(PathFinder.smartSplit('key1.key2[key3.key4].key5')).toEqual(['key1', 'key2', 'key3.key4', 'key5']);
        });

        it('handles array iteration syntax', () =>
        {
            expect(PathFinder.smartSplit('key1[]')).toEqual(['key1', '[]']);
        });

        it('handles numeric indices', () =>
        {
            expect(PathFinder.smartSplit('key1[1]')).toEqual(['key1', '1']);
            expect(PathFinder.smartSplit('key1.1')).toEqual(['key1', '1']);
        });

        it('removes whitespace around dot paths, but does not within brackets', () =>
        {
            expect(PathFinder.smartSplit('key1 . key2')).toEqual(['key1', 'key2']);
            expect(PathFinder.smartSplit('key1 [ key2 ]')).toEqual(['key1', ' key2 ']);
            expect(PathFinder.smartSplit('key1\t[\tkey2\t]')).toEqual(['key1', '\tkey2\t']);

        });

        it('allows escaping of the brackets', () =>
        {
            expect(PathFinder.smartSplit('key1\\[key2\\]')).toEqual(['key1[key2]']);
            expect(PathFinder.smartSplit('key1[\\[key2\\]]')).toEqual(['key1', '[key2]']);
            expect(PathFinder.smartSplit('key1\\{key2\\}')).toEqual(['key1{key2}']);
            expect(PathFinder.smartSplit('key1[\\{key2\\}]')).toEqual(['key1', '{key2}']);
        });

        it('allows for a bracket at the beginning of the path', () =>
        {
            expect(PathFinder.smartSplit('[].a')).toEqual(['[]','a']);
            expect(PathFinder.smartSplit('{}.a')).toEqual(['{}','a']);

        });
    });

    describe('lookup', () =>
    {
        it('lookups up a value in a data structure', () =>
        {
            const data = {a: {b: 6}}
            expect(PathFinder.lookup(data, ['a', 'b'])).toBe(6);
        });

        it('accepts a path as a string', () =>
        {
            const data = {a: {b: 6}}
            expect(PathFinder.lookup(data, 'a.b')).toBe(6);
            expect(PathFinder.lookup(data, 'a[b]')).toBe(6);
        });

        it('returns undefined if the  value is not found', () =>
        {
            const data = {a: {b: 6}};
            expect(PathFinder.lookup(data, ['a', 'c'])).toBe(undefined);

            const data2 = {a: {b: {c: 6}}};
            expect(PathFinder.lookup(data, ['a', 'c', 'd'])).toBe(undefined);
        });

        it('returns undefined if the data is undefined', () =>
        {
            const data = undefined;
            expect(PathFinder.lookup(data, ['a'])).toBe(undefined);
            expect(PathFinder.lookup(data, ['a', 'b'])).toBe(undefined);
        });

        it('maps an array with the array syntax', () =>
        {
            const data = {a: [
                {b: 6},
                {b: 8}
            ]};

            expect(PathFinder.lookup(data, ['a', '[]', 'b'])).toEqual([6, 8]);
        });

        it('wraps the item in an array if the item at the index is not an array', () =>
        {
            const data = {a: 1};
            expect(PathFinder.lookup(data, ['a', '[]'])).toEqual([1]);

            const data3 = {a: {b:1}};
            expect(PathFinder.lookup(data3, ['a', '[]'])).toEqual([{b:1}]);

            const data4 = {a: {b:1}};
            expect(PathFinder.lookup(data4, ['a', '[]', 'b'])).toEqual([1]);

            const data2 = {a: 1};
            expect(PathFinder.lookup(data2, ['a', '[]', 'b'])).toEqual([undefined]);

            const data5 = {a: 1};
            expect(PathFinder.lookup(data5, ['a', '[]', 'b', 'c'])).toEqual([undefined]);

            const data6 = {a: {b: 1}};
            expect(PathFinder.lookup(data6, ['a', '[]', 'b', 'c'])).toEqual([undefined]);

            const data7 = {a: [{b: 1}]};
            expect(PathFinder.lookup(data7, ['a', '[]', 'b'])).toEqual([1]);
        });

        it('returns an array with an undefined value if any portion of the path does not exist', () =>
        {
            const data = {a: [
                {b: 6},
                {b: 8}
            ]};

            // expect(['a[]', 'c'].reduce(PathFinder.lookup, data)).toEqual([undefined, undefined]);
            expect(PathFinder.lookup(data, ['a', '[]', 'c'])).toEqual([undefined, undefined]);


            const data2 = {a: [
                {b: 6},
                {b: 8}
            ]};

            // expect(['a', '[]', 'c', 'd'].reduce(PathFinder.lookup, data2)).toEqual([undefined, undefined]);
            expect(PathFinder.lookup(data2, ['a', '[]', 'c', 'd'])).toEqual([undefined, undefined]);
        });

        it('handles multiple layers of iteration', () =>
        {
            const data = {
                a: [
                    {b: [{c: 6}, {c: 7}]},
                    {b: [{c: 12}, {c: 5}]},
                    {b: [{c: 19}, {c: 15}]},
                    {b: [{c: 2}, {c: 12}]},
                ]
            };

            // expect(['a', '[]', 'b', '[]', 'c'].reduce(PathFinder.lookup, data)).toEqual([[6, 7], [12, 5], [19, 15], [2, 12]]);
            expect(PathFinder.lookup(data, ['a', '[]', 'b', '[]', 'c'])).toEqual([[6, 7], [12, 5], [19, 15], [2, 12]])
        });

        it('handles nested arrays', () =>
        {
            const data = {
                a: [
                    [{c: 6}, {c: 7}],
                    [{c: 12}, {c: 5}],
                    [{c: 19}, {c: 15}],
                    [{c: 2}, {c: 12}],
                ]
            };

            // expect(['a', '[]', '[]', 'c'].reduce(PathFinder.lookup, data)).toEqual([[6, 7], [12, 5], [19, 15], [2, 12]]);
            expect(PathFinder.lookup(data, ['a', '[]', '[]', 'c'])).toEqual([[6, 7], [12, 5], [19, 15], [2, 12]]);
        });

        it('maps an object with curly brace syntax', () =>
        {
            const data = {a: {
                q: {b: 6},
                r: {b: 8}
            }};

            expect(PathFinder.lookup(data, ['a', '{}', 'b'])).toEqual({q: 6, r: 8});
        });

        it('returns an empty object when curly brace syntax is used and the value at the path is not an object', () =>
        {
            const data = {a: 1234};
            expect(PathFinder.lookup(data, ['a', '{}'])).toEqual({});
            expect(PathFinder.lookup(data, ['a', '{}', 'b'])).toEqual({});
        });

        it('maps a map object with curly brace syntax', () =>
        {
            const data = {
                a: new Map([
                    ['q', {b: 6}],
                    ['r', {b: 8}],
                ])
            }

            expect(PathFinder.lookup(data, ['a', '{}', 'b'])).toEqual(new Map([
                ['q', 6],
                ['r', 8],
            ]));
        });

        it('allows for top-level iterator keys', () =>
        {
            const data1 = [
                {a: 'test'},
            ];

            const data2 = {
                a: {b: 'test'},
            };

            expect(PathFinder.lookup(data1, ['[]', 'a'])).toEqual(['test']);
            expect(PathFinder.lookup(data1, '[].a')).toEqual(['test']);

            expect(PathFinder.lookup(data2, ['{}', 'b'])).toEqual({a: 'test'});
            expect(PathFinder.lookup(data2, '{}.b')).toEqual({a: 'test'});
        });

        it('returns undefined if path is not a string or array', () =>
        {
            const data = {

            };

            expect(PathFinder.lookup(data, 123)).toBe(undefined);
            expect(PathFinder.lookup(data, new Date())).toBe(undefined);
            expect(PathFinder.lookup(data, /regex/g)).toBe(undefined);
            expect(PathFinder.lookup(data, {})).toBe(undefined);
        });

        it('returns undefined if a path part is not a string', () =>
        {
            const data = {

            };

            expect(PathFinder.lookup(data, [123])).toBe(undefined);
            expect(PathFinder.lookup(data, [new Date()])).toBe(undefined);
            expect(PathFinder.lookup(data, [/regex/g])).toBe(undefined);
            expect(PathFinder.lookup(data, [{}])).toBe(undefined);
        });

        it('will lookup a value in a map', () =>
        {
            const data = {a: new Map([['b', 6]])};
            expect(PathFinder.lookup(data, ['a', 'b'])).toBe(6);
        });

        it('will give a maps size if the key is size and size is not set as a key in the map', () =>
        {
            const data = {a: new Map([['b', 6]])};
            expect(PathFinder.lookup(data, ['a', 'size'])).toBe(1);

            const data2 = {a: new Map([['size', 6]])};
            expect(PathFinder.lookup(data2, ['a', 'size'])).toBe(6);
        });

    });

    describe('lookupApply', () =>
    {
        it('lookups up a value and returns the value with a function applied to it', () =>
        {
            const data = {a: {b: 2}};
            expect(PathFinder.lookupApply(data, 'a.b', (v) => v + 10)).toBe(12);
        });

        it('applies the function te everyr item when used within an iterator', () =>
        {
            const data1 = {a: [
                {b: 1},
                {b: 15},
                {b: 29},
            ]};
            expect(PathFinder.lookupApply(data1, 'a[].b', (v) => v + 10)).toEqual([11, 25, 39]);

            const data2 = {a: [
                {b: [{c:1},{c:4},{c:19}]},
                {b: [{c:5},{c:12},{c:14}]},
                {b: [{c:6},{c:23},{c:91}]},
            ]};
            expect(PathFinder.lookupApply(data2, 'a[].b[].c', (v) => v + 10)).toEqual([
                [11,14,29],
                [15,22,24],
                [16,33,101],
            ]);
        });
    });

    describe('lookupSet', () =>
    {
        it('sets a value in an object with a specific key', () =>
        {
            const out = {};
            const key = ['a', 'b'];
            const value = 'value';

            PathFinder.lookupSet(out, key, value);

            expect(out).toEqual({a: {b: 'value'}});
        });

        it('handles a single key', () =>
        {
            const out = {};
            const key = ['a'];
            const value = 'value';

            PathFinder.lookupSet(out, key, value);

            expect(out).toEqual({a: 'value'});
        });

        it('does not remove existing keys that are not meant to be removed', () =>
        {
            const out = {a: {c: 1}};
            const key = ['a', 'b'];
            const value = 'value';

            PathFinder.lookupSet(out, key, value);

            expect(out).toEqual({a: {b: 'value', c: 1}});
        });

        it('overrides values in the path that are not pojos, maps, or arrays', () =>
        {
            const out = {a: 1};
            const key = ['a', 'b'];
            const value = 'value';

            PathFinder.lookupSet(out, key, value);

            expect(out).toEqual({a: {b: 'value'}});

            const out2 = {a: new Date()};
            const key2 = ['a', 'b'];
            const value2 = 'value';

            PathFinder.lookupSet(out2, key2, value2);

            expect(out2).toEqual({a: {b: 'value'}});

            const out3 = {a: /birdling/g};
            const key3 = ['a', 'b'];
            const value3 = 'value';

            PathFinder.lookupSet(out3, key3, value3);

            expect(out3).toEqual({a: {b: 'value'}});
        });

        it('updates a map if found in the path', () =>
        {
            const out = {a: new Map([['c', 'value1']])};

            const key = ['a', 'b'];
            const value = 'value2';

            PathFinder.lookupSet(out, key, value);

            expect(out).toEqual({a: new Map([['c', 'value1'], ['b', 'value2']])})
        });

        it('keeps an array value as an array if the key is numeric', () =>
        {
            const out = {a: [1,2,3]};
            const key = ['a', '1'];
            const value = 4;

            PathFinder.lookupSet(out, key, value);

            expect(out).toEqual({a: [1,4,3]});
        });

        it('replaces an array with an object if a key is not numeric', () =>
        {
            const out = {a: [1,2,3]};
            const key = ['a', 'b'];
            const value = 4;

            PathFinder.lookupSet(out, key, value);

            // is this correct?
            expect(out).toEqual({a: {'0': 1,'1': 2, '2': 3, b: 4}});
        });

        it('keeps an object as an object with a numeric key', () =>
        {
            const out = {a: {b: 1}};
            const key = ['a', '1'];
            const value = 4;

            PathFinder.lookupSet(out, key, value);

            expect(out).toEqual({a: {b: 1, '1': 4}});
        });

        it('creates an object even with a numeric index', () =>
        {
            const out = {};
            const key = ['a', '0'];
            const value = 4;

            PathFinder.lookupSet(out, key, value);

            // expect(out).toEqual({a: [4]});
            expect(out).toEqual({a: {'0': 4}});
        });

        it('sets an array value if no bracket syntax used', () =>
        {
            const out = {};
            const key = ['a', 'b'];
            const value = ['value'];

            PathFinder.lookupSet(out, key, value);

            expect(out).toEqual({a: {b: ['value']}});
        });

        it('handles deep keys', () =>
        {
            const out = {};
            const key = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
            const value = 'value';

            PathFinder.lookupSet(out, key, value);

            expect(out).toEqual({a: {b: {c: {d: {e: {f: {g: {h: 'value'}}}}}}}});
        });

        it('properly handles undefined values', () =>
        {
            const out = {};
            const key = ['a', 'b'];
            const value = undefined;

            PathFinder.lookupSet(out, key, value);

            expect(out).toEqual({a: {b: undefined}});
        });

        it('properly handles null values', () =>
        {
            const out = {};
            const key = ['a', 'b'];
            const value = null;

            PathFinder.lookupSet(out, key, value);

            expect(out).toEqual({a: {b: null}});
        });

        it('sets a value into an array with bracket syntax', () =>
        {
            const out = {};
            const key = ['a', '[]'];
            const value = ['value1', 'value2'];

            PathFinder.lookupSet(out, key, value);

            expect(out).toEqual({a: ['value1', 'value2']});

            const out2 = {};
            const key2 = ['a', '[]', 'b'];
            const value2 = ['value1', 'value2'];

            PathFinder.lookupSet(out2, key2, value2);

            expect(out2).toEqual({a: [{b: 'value1'}, {b: 'value2'}]});
        });

        it('sets a value into an array with bracket syntax with an undefined value', () =>
        {
            const out = {};
            const key = ['a', '[]'];
            const value = undefined;

            PathFinder.lookupSet(out, key, value);

            expect(out).toEqual({a: [undefined]});
        });

        it('sets a value into an array with bracket syntax and additional keys', () =>
        {
            const out = {};
            const key = ['a', '[]', 'b'];
            const value = ['value1', 'value2'];

            PathFinder.lookupSet(out, key, value);

            expect(out).toEqual({a: [{b: 'value1'}, {b: 'value2'}]});
        });


        it('does not fail if given bracket syntax and it did not receive an array', () =>
        {
            const out = {};
            const key = ['a', '[]', 'b'];
            const value = 'value1';

            PathFinder.lookupSet(out, key, value);

            expect(out).toEqual({a: [{b: 'value1'}]});
        });

        it('handles undefined values in the value array', () =>
        {
            const out = {};
            const key = ['a', '[]', 'b'];
            const value = ['value1', undefined, 'value2'];

            PathFinder.lookupSet(out, key, value);

            expect(out).toEqual({a: [{b: 'value1'}, {b: undefined}, {b: 'value2'}]});
        });

        it('handles null values in the value array', () =>
        {
            const out = {};
            const key = ['a', '[]', 'b'];
            const value = ['value1', null, 'value2'];

            PathFinder.lookupSet(out, key, value);

            expect(out).toEqual({a: [{b: 'value1'}, {b: null}, {b: 'value2'}]});
        });

        it('maintains existing array values when setting an array', () =>
        {
            const out = {
                a: [
                    {c: 'apple'},
                    {c: 'bear'},
                    {c: 'cherry'}
                ]
            };
            const key = ['a', '[]', 'b'];
            const value = ['value1', 'value2'];

            PathFinder.lookupSet(out, key, value);

            expect(out).toEqual({
                a: [
                    {c: 'apple', b: 'value1'},
                    {c: 'bear', b: 'value2'},
                    {c: 'cherry'},
                ]
            });

            const out2 = {
                a: [
                    {c: 'apple'},
                ]
            };
            const key2 = ['a', '[]', 'b'];
            const value2 = ['value1', 'value2'];

            PathFinder.lookupSet(out2, key2, value2);

            expect(out2).toEqual({
                a: [
                    {c: 'apple', b: 'value1'},
                    {b: 'value2'},
                ]
            });
        });

        it('works with an iterator as the last key part', () =>
        {
            const out = {};
            const key = ['a', 'b', '[]'];
            const value = ['value1', 'value2'];

            PathFinder.lookupSet(out, key, value);
            expect(out).toEqual({
                a: {
                    b: ['value1', 'value2'],
                }
            });
        });

        it('works with an iterator as the first key part', () =>
        {
            const out = [];
            const key = ['[]', 'a', 'b'];
            const value = ['value1', 'value2'];

            PathFinder.lookupSet(out, key, value);
            expect(out).toEqual([
                {a: {b: 'value1'}},
                {a: {b: 'value2'}},
            ]);
        });

        it('replaces non-array preset values with an array', () =>
        {
            const out = {
                a: 'banana'
            };
            const key = ['a', '[]', 'b'];
            const value = ['value1', 'value2'];

            PathFinder.lookupSet(out, key, value);

            expect(out).toEqual({
                a: [
                    {b: 'value1'},
                    {b: 'value2'},
                ]
            });
        });


        it('sets an array as is without bracket syntax', () =>
        {
            const out = {};
            const key = ['a', 'b'];
            const value = ['value1', 'value2'];

            PathFinder.lookupSet(out, key, value);

            expect(out).toEqual({a: {b: ['value1', 'value2']}});
        });

        it('handles multiple array layers', () =>
        {
            const out = {};
            const key = ['a', '[]', 'b', 'c', '[]', 'd'];
            const value = [['value1', 'value2'], ['value3', 'value4', 'value5']];

            PathFinder.lookupSet(out, key, value);

            expect(out).toEqual({
                a: [
                    {
                        b: {
                            c: [
                                {d: 'value1'},
                                {d: 'value2'},
                            ]
                        }
                    },
                    {
                        b: {
                            c: [
                                {d: 'value3'},
                                {d: 'value4'},
                                {d: 'value5'},
                            ]
                        }
                    },
                ]
            });
        });

        it('handles undefined values in multiple array layers', () =>
        {
            const out = {};
            const key = ['a', '[]', 'b', 'c', '[]', 'd'];
            const value = [['value1', 'value2'], undefined, ['value3', 'value4']];

            PathFinder.lookupSet(out, key, value);

            expect(out).toEqual({
                a: [
                    {
                        b: {
                            c: [
                                {d: 'value1'},
                                {d: 'value2'},
                            ]
                        }
                    },
                    {
                        b: {
                            c: [
                                {d: undefined},
                            ],
                        }
                    },
                    {
                        b: {
                            c: [
                                {d: 'value3'},
                                {d: 'value4'},
                            ]
                        }
                    },
                ]
            });
        });

        it('handles null values in multiple array layers', () =>
        {
            const out = {};
            const key = ['a', '[]', 'b', 'c', '[]', 'd'];
            const value = [['value1', 'value2'], null, ['value3', 'value4']];

            PathFinder.lookupSet(out, key, value);

            expect(out).toEqual({
                a: [
                    {
                        b: {
                            c: [
                                {d: 'value1'},
                                {d: 'value2'},
                            ]
                        }
                    },
                    {
                        b: {
                            c: [
                                {d: null},
                            ],
                        }
                    },
                    {
                        b: {
                            c: [
                                {d: 'value3'},
                                {d: 'value4'},
                            ]
                        }
                    },
                ]
            });
        });

        it('handles nested array layers', () =>
        {
            const out = {};
            const key = ['a', '[]', '[]', 'd'];
            const value = [['value1', 'value2'], ['value3', 'value4']];

            PathFinder.lookupSet(out, key, value);

            expect(out).toEqual({
                a: [
                    [
                        {d: 'value1'},
                        {d: 'value2'},
                    ],
                    [
                        {d: 'value3'},
                        {d: 'value4'},
                    ]
                ]
            });
        });

        it('sets a value into an object with curly bracket syntax and additional keys', () =>
        {
            const out = {};
            const key = ['a', '{}', 'b'];
            const value = {r: 'value1', s: 'value2'};

            PathFinder.lookupSet(out, key, value);

            expect(out).toEqual({
                a: {
                    r: {
                        b: 'value1',
                    },
                    s: {
                        b: 'value2',
                    },
                },
            });
        });

        it('sets an empty object when using bracket syntax and the value is not an object', () =>
        {
            const out = {};
            const key = ['a', '{}', 'b'];
            const value = 'test';

            PathFinder.lookupSet(out, key, value);

            expect(out).toEqual({
                a: {

                },
            });
        });

        it('iterates over a map with curly bracket syntax and additional keys', () =>
        {
            const out = {};
            const key = ['a', '{}', 'b'];
            const value = new Map([
                ['r', 'value1'],
                ['s', 'value2'],
            ]);

            PathFinder.lookupSet(out, key, value);

            expect(out).toEqual({
                a: {
                    r: {
                        b: 'value1',
                    },
                    s: {
                        b: 'value2',
                    },
                },
            });
        });

        it('iterates over a map with curly bracket syntax and additional keys and sets into an existing map', () =>
        {
            const out = {a: new Map([['q', 'value3']])};
            const key = ['a', '{}', 'b'];
            const value = new Map([
                ['r', 'value1'],
                ['s', 'value2'],
            ]);

            PathFinder.lookupSet(out, key, value);

            expect(out).toEqual({
                a: new Map([
                    ['q', 'value3'],
                    ['r', {
                        b: 'value1',
                    }],
                    ['s', {
                        b: 'value2',
                    }]
                ]),
            });
        });


        it('converts a string key into an array', () =>
        {
            const out = {};
            const key = 'a.b';
            const value = 'value';

            PathFinder.lookupSet(out, key, value);

            expect(out).toEqual({a: {b: 'value'}});

            const out2 = {};
            const key2 = 'a[].b';
            const value2 = ['value1', 'value2'];

            PathFinder.lookupSet(out2, key2, value2);

            expect(out2).toEqual({a: [{b: 'value1'}, {b: 'value2'}]});

            const out3 = {};
            const key3 = 'a[b]';
            const value3 = 'value';

            PathFinder.lookupSet(out3, key3, value3);

            expect(out3).toEqual({a: {b: 'value'}});

            const out4 = {};
            const key4 = 'a[b.c]';
            const value4 = 'value';

            PathFinder.lookupSet(out4, key4, value4);

            expect(out4).toEqual({a: {'b.c': 'value'}});
        });

        it('does not break when given a broken key', () =>
        {
            const out = {};
            const key = {this: 'isbad'};
            const value = 'value';

            PathFinder.lookupSet(out, key, value);

            expect(out).toEqual({});
        });

        it('does not break when given a broken key part', () =>
        {
            const out = {};
            const key = [{this: 'isbad'}];
            const value = 'value';

            PathFinder.lookupSet(out, key, value);

            expect(out).toEqual({});
        });
    });
});

// run();

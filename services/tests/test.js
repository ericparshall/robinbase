/**
 * Created by cj on 4/6/16.
 */

function testMongoInstance()
{
    //todo.  Add mocha or mocha style expects here.
    Debug.test(['Mongo should insert one document.', function(d){
        Mon.go('mgoTests', 'insertOne', {a:1}, function(err, result) {
            /* if (err){Debug.error('Mongo call error', err); return;}
             */
            //Debug.log('insert result', result);
            Debug.assert(
                'error did not occur', !err,
                'call worked okay?', result.result.ok == 1,
                'inserted one document?', result.result.n == 1
            );
            Debug.next();
        });
    }]);

    Debug.test(['Mongo should insert 4 documents', function(d){
        Mon.go('mgoTests', 'insertMany', [{a:1},{b:1},{c:1},{d:1}], function(err, result) {
            /* if (err){Debug.error('Mongo call error', err); return;}
             */
            Debug.assert(
                'error did not occur', !err,
                'call worked okay?', result.result.ok == 1,
                'inserted 4 documents', result.result.n == 4
            );
            Debug.next();
        });
    }]);

    Debug.test(['Should return all documents', function(d){
        Mon.go('mgoTests', 'find', {}).toArray(function(err, result) {
            /* if (err){Debug.error('Mongo call error', err); return;}
             */
            Debug.assert(
                'error did not occur', !err,
                'result is an array', Array.isArray(result),
                'result has the expected 5 documents.', result.length == 5
            );
            Debug.next();
        });
    }]);

    Debug.test.begin(cleanTest);

    function cleanTest(passed)
    {
        Mon.go('mgoTests', 'remove', {}, function(err, result) {
            if (err){Debug.error('Mongo call error', err); return;}
        });


        //startUp();
    }
}
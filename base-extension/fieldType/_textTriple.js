registerFieldType('triple:multiple', function(key, attr, value, container)
{
    container.append(attr.label+'<br/>');
    container.append(displayMultiTriple(key, attr, value));
});

function displayMultiTriple(key, attr, value)
{
    var container = $(document.createElement('div'));
    container.css('vertical-align', 'top');

    var idInd = 0;

    function createRow(i,v)
    {
        var field1, field2, field3, fieldRow, removeBtn;

        fieldRow = $(document.createElement('div'));
        fieldRow.css('display', 'flex');

        field1 = $(document.createElement('input'));
        field1.attr('value', v[0]);
        field1.attr('name', key + '['+i+'][0]');
        field1.attr('id', 'f_'+key+'_'+(idInd++));
        checkMutable(attr, field1);
        field1.css('margin-right', '10px');

        field2 = $(document.createElement('input'));
        field2.attr('value', v[1]);
        field2.attr('name', key + '['+i+'][1]');
        field2.attr('id', 'f_'+key+'_'+(idInd++));
        checkMutable(attr, field2);
        field2.css('margin-right', '10px');


        field3 = $(document.createElement('input'));
        field3.attr('value', v[2]);
        field3.attr('name', key + '['+i+'][2]');
        field3.attr('id', 'f_'+key+'_'+(idInd++));
        checkMutable(attr, field3);

        removeBtn = $(document.createElement('a'))
        removeBtn.html('<i class="fa fa-minus"></i>');
        removeBtn.css('margin-right', '10px');
        removeBtn.click(function(e)
        {
            e.preventDefault();
            fieldRow.remove();
        });
//            removeBtn.addClass('delete');
        checkMutable(attr, removeBtn);
        if (removeBtn.attr('disabled') !== 'disabled')
        {
            removeBtn.css('cursor', 'pointer');
        }

        fieldRow.append(removeBtn);
        fieldRow.append(field1);
        fieldRow.append(field2);
        fieldRow.append(field3);

        return fieldRow
    }

    for (var i = 0; i < value.length; i++)
    {
        var row = createRow(i, value[i]);
        container.append(row);
    }

    var finalRow = $(document.createElement('div'));
    var addBtn = $(document.createElement('a'));
    addBtn.html('<i class="fa fa-plus"></i>');
    addBtn.click(function(e)
    {
        e.preventDefault();
        var newRow = createRow(idInd, "");
        finalRow.before(newRow);
    });
    addBtn.css('cursor', 'pointer');

    finalRow.append(addBtn);
    container.append(finalRow);

    return container;
}
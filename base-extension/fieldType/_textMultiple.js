registerFieldType('text:multiple', function(key, attr, value, container)
{
    container.append(attr.label+'<br/>');
    container.append(displayMultiText(key, attr, value));
});

function displayMultiText(key, attr, value)
{
    var container = $(document.createElement('div'));
    container.css('vertical-align', 'top');

    var idInd = 0;

    function createRow(i,v)
    {
        var field, fieldRow, removeBtn;

        fieldRow = $(document.createElement('div'));
        fieldRow.css('display', 'flex');

        if (attr.values)
        {
            var field = $(document.createElement('select'));

            for (var i =0; i<attr.values.length; i++)
            {
                var selected = '';

                var label = '';
                var val = attr.values[i][0];
                if (attr.values[i].length == 2)
                {
                    label = attr.values[i][1];
                }

                if (value == val)
                {
                    selected = 'selected="selected"';
                }
                field.append('<option value="'+val+'" '+selected+'>'+label+'</option>');

            }
        }
        else
        {
            field = $(document.createElement('input'));
            field.attr('value', v);
            checkMutable(attr, field);
        }

        field.attr('name', key + '[]');
        field.attr('id', 'f_'+key+'_'+(idInd++));



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
        fieldRow.append(field);

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
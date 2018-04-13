

var j_subTemplates = {};

registerFieldType('join', function(key, attr, value, container)
{
    attr.subTemplate.context = context;
    attr.subTemplate.formLayouts = attr.subLayouts || null;
    attr.subTemplate.modelKey = attr.modelKey;
    var well = $(document.createElement('div'));
    well.addClass('well');
    well.addClass('inner-well');

    if (attr.canBeAdded == true)
    {
        if (typeof j_subTemplates == 'undefined')
        {
            j_subTemplates = {};
        }
        attr.well = well;
        j_subTemplates[attr.modelKey] = attr;
    }
    var valueLen = 0;
    if (Array.isArray(value))
    {
        valueLen = value.length;
    }

    var limit = ((attr.limit) && (attr.limit < valueLen)) ? attr.limit : valueLen;
    for (var i=0; i<limit; i++)
    {
        var subWell = $(document.createElement('div'));

        var subKey = value[i]._id+"_"+attr.modelKey;
        subWell.attr('subSectionKey', subKey);
        subWell.addClass('subSection');
        well.append(subWell);
        buildForm(subWell, attr.subTemplate, value[i]);

        if (attr.canBeDeleted == true)
        {
            var deleteKey = attr.modelKey+'['+value[i]._id+'-DEL]';
            var subTools = $(document.createElement('div'));
            subTools.css('text-align', 'right');
            subTools.css('height', 41);
            subTools.append('<div deleteKey="'+deleteKey+'" class="delete" onclick="javascript:showInlineConfirm(this);" style="float:none; display:inline-block;"><i class="fa fa-trash" aria-hidden="true"></i></div>');
            subTools.append('<div containerKey="'+subKey+'" deleteConfirmKey="'+deleteKey+'" class="delete" style="display:none; float:none;" onclick="javascript:deleteInlineItem(this);">'+
                '<i class="fa fa-exclamation-triangle" aria-hidden="true"></i> Are you sure?'+
            '</div>');

            subWell.append(subTools);
        }
    }

    if (attr.canBeAdded == true)
    {
        well.append('<div addKey="'+attr.modelKey+'" class="add" onclick="javascript:addInlineDocument(this);"><i class="fa fa-plus-circle" aria-hidden="true"></i></div>');
    }

    if ((limit > 0) | (attr.canBeAdded == true))
    {
        if ((typeof attr.label == 'string') && (attr.label.length > 0))
        {
            well.prepend('<h3 style="margin-top:0px; margin-bottom:10px; background:none;">'+attr.label+'</h3>');
        }
        container.append(well);
    }

});

function addInlineDocument(obj)
{
    var modelKey = $(obj).attr('addKey');
    if (typeof j_subTemplates[modelKey] == 'undefined')
    {
        console.log('can\'t add sub document as there is no template.');
        return;
    }
    buildInlineDocument(j_subTemplates[modelKey].well, j_subTemplates[modelKey], {_id:guid('xxxxxxxx')+'-NEW'})
}

function buildInlineDocument(well, attr, value)
{
    var subWell = $(document.createElement('div'));

    var subKey = value._id+"_"+attr.modelKey;
    subWell.attr('subSectionKey', subKey);
    subWell.addClass('subSection');
    subWell.addClass('subSectionNew');
    $('div[addKey="'+attr.modelKey+'"]').before(subWell);
    buildForm(subWell, attr.subTemplate, value);

    if (attr.canBeDeleted == true)
    {
        var deleteKey = attr.modelKey+'['+value._id+'-DEL]';
        var subTools = $(document.createElement('div'));
        subTools.css('text-align', 'right');
        subTools.css('height', 41);
        subTools.append('<div deleteKey="'+deleteKey+'" class="delete" onclick="javascript:showInlineConfirm(this);" style="float:none; display:inline-block;"><i class="fa fa-trash" aria-hidden="true"></i></div>');
        subTools.append('<div containerKey="'+subKey+'" deleteConfirmKey="'+deleteKey+'" class="delete" style="display:none; float:none;" onclick="javascript:deleteInlineItem(this);">'+
            '<i class="fa fa-exclamation-triangle" aria-hidden="true"></i> Are you sure?'+
            '</div>');
        subWell.append(subTools);
    }
}
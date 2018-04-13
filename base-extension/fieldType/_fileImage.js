registerFieldType('file:image', function(key, attr, value, container)
{
    var imgDiv = $(document.createElement('div'));
    imgDiv.css('width', '100%');
    //imgDiv.append(attr.label+'<br/>');
    //displayImageInputPreview
    imgDiv.append(displayImageInputPreview(key, attr, value));
    imgDiv.append(displayImageInput(key, attr, value));
    container.append(imgDiv);
});

function displayFileInput(key, attr, value, iconClass, change)
{
    var original = value || 'No File Selected';
    iconClass = iconClass || 'fa-file';
    var wrapper = $(document.createElement('div'));
    wrapper.addClass('editable');
    wrapper.css('cursor', 'pointer').css('padding-bottom', '0');
    var icon = $(document.createElement('i'));
    icon.addClass('fa').addClass(iconClass);
    icon.css('margin-right', '10px');
    icon.css('color', '{{#data:key/"primaryColor"}}');
    wrapper.append(icon);
    var fileName = $(document.createElement('span'));
    fileName.text(original);
    fileName.attr('id', 'f_'+key+'__display');
    wrapper.append(fileName);
    var field = $(document.createElement('input'));
    field.attr('type', 'file');
    field.attr('value', value);
    field.attr('name', key);
    field.attr('id', 'f_'+key);
    field.css('display', 'none');

    wrapper.append(field);

    var clicking = false;
    wrapper.click(function(e){
        // prevent recursive loop
        if (!clicking)
        {
            clicking = true;
            field.click();
            clicking = false;
        }

    });
    field.change(function(e){
        var name = (e.target.value || '').split('\\');
        name = name[name.length - 1];

        fileName.text(name || original);
        if (typeof change === 'function')
        {
            change(e);
        }
    })

    checkMutable(attr, field);
    return wrapper;
}

function displayImageInput(key, attr, value)
{
    function onChange(e)
    {
        var preview = $('#fPrev_'+key);
        var input = e.target;
        var file = input.files[0] || null;
        if (file)
        {
            if (file.type.indexOf('image/') === 0)
            {
                var reader = new FileReader();
                reader.onload = function(e) {
                    preview.css('background-image', 'url('+e.target.result+')');
                }

                reader.readAsDataURL(file);
            }
            else
            {
                preview.css('background-image', 'none');
            }

        }
        else if (value)
        {
            preview.css('background-image', 'url('+value+')');
        }
        else
        {
            preview.css('background-image', 'none');
        }
    }

    var fileInput = displayFileInput(key, attr, value, "fa-camera", onChange);
    var imageInputWrapper = $(document.createElement('div'));
    imageInputWrapper.append(attr.label+'<br/>');
    imageInputWrapper.addClass('formImgFile');
    imageInputWrapper.append(fileInput);
    return imageInputWrapper;

}

function displayImageInputPreview(key, attr, value)
{
    var imageInputWrapper = $(document.createElement('div'));

    var preview = $(document.createElement('div'));
    preview.height('50px');
    preview.attr('id', 'fPrev_'+key);
    preview.css('max-width', '160px');
    preview.css({
//            'margin-right': 'auto',
//            'margin-left': 'auto',
        'background-size': 'contain',
        'margin-top': '10px',
        'background-color': '#efefef',
        'background-position': 'center center',
        'background-repeat': 'no-repeat',
//            'border': '2px solid #efefef',
        'border-radius': '10px'
    });


    imageInputWrapper.append(preview);

    var imageUrl = '';
    if (value)
    {
        imageUrl = attr.baseUrl + value;
        preview.css('background-image', 'url('+imageUrl+')');
    }

    imageInputWrapper.addClass('formImgThumb');
    return imageInputWrapper;
}
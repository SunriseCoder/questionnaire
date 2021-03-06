var translationData;
var keywordsMap;
var languagesMap;
var translationsMap;

function refreshTranslationData() {
    clearEditForm();

    // Load data via Ajax
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            data = JSON.parse(this.responseText);
            updateTranslationData(data);
        }
    };
    xhttp.open("GET", "translation_ajax.php", true);
    xhttp.send();
}

function updateTranslationData(data) {
    postProcessJsonData(data);
    translationData = data;
    updateLanguageFilters();
    renderTranslationTable();
}

function postProcessJsonData(data) {
    // Converting translations date strings into real dates
    data.translations.forEach(function(translation) {
        translation.lastChangedTime = new Date(translation.lastChangedTime);
    });
}

function updateLanguageFilters() {
    var allLanguages = translationData.languages;

    // Save Language Filters state before its removal
    var state = [];
    var languageFilter = document.getElementById('languageFilter');
    var children = Array.from(languageFilter.childNodes);
    for (var i = 0; i < children.length; i++) {
        var child = children[i];
        if (child.tagName == 'INPUT' && child.type == 'button') {
            // Skipping buttons
            continue;
        }
        if (child.id && child.id.startsWith('languageFilter-') && child.checked) {
            state[child.id.replace('languageFilter-', '')] = true;
        }
        languageFilter.removeChild(child);
    }

    // Restore Language Filters state after creation them for new Languages
    for (var i = 0; i < allLanguages.length; i++) {
        var language = allLanguages[i];
        if (language == undefined) {
            continue;
        }

        var element = createElement('input', languageFilter);
        element.setAttribute('id', 'languageFilter-' + language.id);
        element.setAttribute('type', 'checkbox');
        if (state[language.id]) {
            element.setAttribute('checked', 'checked');
        }
        element.setAttribute('onclick', 'renderTranslationTable();');

        createTextElement(language.nameEnglish, languageFilter);
    }
}

function selectAllLanguageFilters(checked) {
    var languageFilter = document.getElementById('languageFilter');
    for (var i = 0; i < languageFilter.children.length; i++) {
        var child = languageFilter.children[i];
        if (child.tagName == 'INPUT' && child.type == 'button') {
            // Skipping buttons
            continue;
        }
        child.checked = checked;
    }

    renderTranslationTable();
}

function renderTranslationTable() {
    var translationRoot = document.getElementById('translationsRoot');
    translationRoot.innerHTML = '';

    var keywords = translationData.keywords;
    keywordsMap = mapById(keywords);

    var languages = getFilteredLanguages();

    var translations = translationData.translations;
    translationsMap = createTranslationsMap(translationData.translations);

    var table = createElement('table', translationRoot);
    table.classList.add('admin-table');
    var tr = createElement('tr', table);

    // Table Header
    createElementWithText('th', 'Keyword', tr);
    languages.forEach(function(element) {
        createElementWithText('th', element.nameEnglish, tr);
    });

    // Table Content
    for (var i = 0; i < keywords.length; i++) {
        var keyword = keywords[i];
        var keywordMap = translationsMap[keyword.id];
        if (!matchFilters(keyword, keywordMap)) {
            continue;
        }

        var tr = createElement('tr', table);

        createElementWithText('td', keyword.code, tr);
        for (var j = 0; j < languages.length; j++) {
            var language = languages[j];
            if (language == undefined) {
                continue;
            }
            var translation = keywordMap == undefined ? undefined : keywordMap[language.id];
            var element;
            if (translation == undefined) {
                element = createElement('td', tr);
                element.innerHTML = '<font color="red"><b>Empty</b></font>';
            } else {
                element = createElementWithText('td', translation.text, tr);
                var defaultTranslation = keywordMap[translationData.defaultLanguageId];
                var elementLastChangeData = '';
                if (language.id != translationData.defaultLanguageId) {
                    if (translation.lastChangedTime.getTime() < defaultTranslation.lastChangedTime.getTime()) {
                        translation.outdated = true;
                        element.classList.add('translation-cell-outdated');
                    }
                    elementLastChangeData += 'Default changed: ' + defaultTranslation.lastChangedTime +
                        '\nDefault changed by: ' + defaultTranslation.lastChangedBy + '\n';
                }
                elementLastChangeData += 'Translation changed: ' + translation.lastChangedTime + '\nTranslation changed by: ' + translation.lastChangedBy;
                element.setAttribute('title', elementLastChangeData);
            }
            element.setAttribute('onclick', 'editTranslation(' + keyword.id + ', ' + language.id + ');');
        }
    }

    clearEditForm();
}

function getFilteredLanguages() {
    var allLanguages = translationData.languages;
    var languages = [];
    for (var i = 0; i < allLanguages.length; i++) {
        var language = allLanguages[i];
        var filterElement = document.getElementById('languageFilter-' + language.id);
        if (filterElement != undefined && filterElement.checked) {
            languages.push(language);
        }
    }
    languagesMap = mapById(languages);
    return languagesMap;
}

function matchFilters(keyword, keywordMap) {
    var textFilterValue = document.getElementById('textFilter').value;
    var emptyCellsFilterValue = document.getElementById('emptyCellsFilter').checked;
    var emptyRowsFilterValue = document.getElementById('emptyRowsFilter').checked;
    var outdatedCellsFilterValue = document.getElementById('outdatedCellsFilter').checked;

    // If no Languages selected in the Filter, keywords cannot be empty
    if (emptyRowsFilterValue && languagesMap.length == 0) {
        return false;
    }

    var foundEmpty = false;
    var foundOutdated = false;
    var foundMatch = textFilterValue.length >= 2 && keyword.code.toLowerCase().includes(textFilterValue.toLowerCase());
    for (var i = 0; i < languagesMap.length; i++) {
        var language = languagesMap[i];
        if (language == undefined) {
            continue;
        }

        var translation = keywordMap == undefined ? undefined : keywordMap[language.id];

        if (translation == undefined) {
            // No need to apply any other filters to the empty values
            foundEmpty = true;
            continue;
        } else if (emptyRowsFilterValue) {
            // If any non-empty value found with Empty Rows filter, the row doesn't match
            return false;
        }

        // Text Filter
        if (textFilterValue.length >= 2 && translation.text.toLowerCase().includes(textFilterValue.toLowerCase())) {
            foundMatch = true;
        }

        // Outdated Filter
        if (translation.outdated) {
            foundOutdated = true;
        }
    }

    // Empty Cells Checkbox
    if (emptyCellsFilterValue && !foundEmpty) {
        return false;
    }

    // Outdated Cells Checkbox
    if (outdatedCellsFilterValue && !foundOutdated) {
        return false;
    }

    // Text Filter Result
    if (textFilterValue.length >= 2 && !foundMatch) {
        return false;
    }

    return true;
}

// Copying Translation from selected Cell to the Edit Form
function editTranslation(keywordId, languageId) {
    clearEditForm();

    var translation = translationsMap[keywordId] == undefined ? undefined : translationsMap[keywordId][languageId];
    if (translation != undefined) {
        document.getElementById('translationId').value = translation.id;
    }
    document.getElementById('keywordId').value = keywordId;
    document.getElementById('languageId').value = languageId;

    var keyword = keywordsMap[keywordId];
    var keywordCell = document.getElementById('keywordCell');
    createTextElement(keyword.code, keywordCell);

    var language = languagesMap[languageId];
    var languageCell = document.getElementById('languageCell');
    createTextElement(language.nameEnglish, languageCell);

    var originalText = '';
    if (languageId != translationData.defaultLanguageId) {
        var originalTranslation = translationsMap[keywordId][translationData.defaultLanguageId];
        if (originalTranslation != null) {
            originalText = originalTranslation.text;
        }
    }
    var originalTextCell = document.getElementById('originalTextCell');
    createTextElement(originalText, originalTextCell);

    var translationCell = document.getElementById('translationCell');
    if (translation) {
        // Translation into selected Language
        translationCell.value = translation.text;
    } else if (document.getElementById('copyDefaultLanguageValueIfEmpty').checked) {
        // Translation into Default Language
        translation = translationsMap[keywordId] == undefined ? undefined : translationsMap[keywordId][translationData.defaultLanguageId];
        if (translation) {
            translationCell.value = translation.text;
        }
    }

    document.getElementById('editFormSubmit').disabled = false;
    window.scrollTo(0, 0); // Scroll to the top of the page
    document.getElementById('translationCell').focus();
}

function clearEditForm() {
    document.getElementById('translationId').value = '';
    document.getElementById('keywordId').value = '';
    document.getElementById('languageId').value = '';

    document.getElementById('keywordCell').innerHTML = '';
    document.getElementById('languageCell').innerHTML = '';
    document.getElementById('originalTextCell').innerHTML = '';
    document.getElementById('translationCell').value = '';

    document.getElementById('editFormSubmit').disabled = true;
    document.getElementById('saveTranslationStatus').innerHTML = '';
}

function saveTranslation() {
    // Locking "Save" Button and Clearing Status Label
    document.getElementById('editFormSubmit').disabled = true;
    document.getElementById('saveTranslationStatus').innerHTML = '';

    var form = document.getElementById('translationForm');
    var query = '';
    for (var i = 0; i < form.elements.length; i++) {
        var name = form.elements[i].name;
        var value = encodeURIComponent(form.elements[i].value);
        if (name && value) {
            query += query != '' ? '&' : '';
            query += name + '=' + value;
        }
    }

    // Sending Ajax to Server
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function() {
        if (this.readyState == 4 && this.status == 200) {
            try {
                // If we get Error Message instead of JSON Text, an Exception will be thrown
                data = JSON.parse(this.responseText);
                updateTranslationData(data);

                // Clear EditForm after the confirmation about successful Save only
                clearEditForm();
                document.getElementById('saveTranslationStatus').innerHTML = '<font color="green">Saved</font>';
            } catch (e) {
                document.getElementById('saveTranslationStatus').innerHTML = '<font color="red">' + this.responseText + '</font>';
                document.getElementById('editFormSubmit').disabled = false;
            }
        }
    };
    xhttp.open("POST", "translation_ajax.php", true);
    xhttp.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
    xhttp.send(query);
}

function mapById(elements) {
    var resultMap = [];
    for (var i = 0; i < elements.length; i++) {
        var element = elements[i];
        resultMap[element.id] = element;
    }
    return resultMap;
}

function createTranslationsMap(translations) {
    var resultMap = [];
    for (var i = 0; i < translations.length; i++) {
        var translation = translations[i];

        var keywordMap = resultMap[translation.keywordId];
        if (keywordMap == null) {
            keywordMap = [];
            resultMap[translation.keywordId] = keywordMap;
        }

        keywordMap[translation.languageId] = translation;
    }

    return resultMap;
}

function handleHotkey(e) {
    if (e.ctrlKey && e.keyCode == 13) { // Ctrl + Enter
        var submitButton = document.getElementById('editFormSubmit');
        if (!submitButton.disabled) {
            submitButton.click();
        }
    }
}
document.addEventListener('keydown', handleHotkey, false);

function onGoogleTransliterationLoad() {
    var options = {
      sourceLanguage: 'en',
      destinationLanguage: ['bn', 'hi', 'or', 'sa'],
      shortcutKey: 'ctrl+m',
      transliterationEnabled: false
    }

    var control = new google.elements.transliteration.TransliterationControl(options);
    control.makeTransliteratable(["translationCell"]);
    control.showControl('google-transliteration');
}

//TODO Move to Utils Library
function createElementWithText(name, text, parent) {
    var element = document.createElement(name);
    createTextElement(text, element);

    if (parent != null) {
        parent.appendChild(element);
    }

    return element;
}

// TODO Move to Utils Library
function createElement(name, parent) {
    var element = document.createElement(name);
    if (parent != null) {
        parent.appendChild(element);
    }

    return element;
}

// TODO Move to Utils Library
function createTextElement(text, parent) {
    var element = document.createTextNode(text);
    if (parent != null) {
        parent.appendChild(element);
    }

    return element;
}

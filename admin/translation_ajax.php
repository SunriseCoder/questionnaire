<?php
    // TODO Check Login and Permissions, otherwise redirect to main page in admin section

    include $_SERVER["DOCUMENT_ROOT"].'/dao/i18n.php';
    if (!class_exists('Utils')) { include $_SERVER["DOCUMENT_ROOT"].'/utils/utils.php'; }
    if (!class_exists('Json')) { include $_SERVER["DOCUMENT_ROOT"].'/utils/json.php'; }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if (Utils::areSet($_POST, ['id', 'text'])) {
            $translation = new Translation();
            $translation->id = $_POST['id'];
            $translation->text = $_POST['text'];
            TranslationDao::update($translation);
        } else if (Utils::areSet($_POST, ['keyword_id', 'language_id', 'text'])) {
            $translations = TranslationDao::getByKeywordAndLanguage($_POST['keyword_id'], $_POST['language_id']);
            if (count($translations) == 0) {
                $translation = new Translation();
                $translation->keywordId = $_POST['keyword_id'];
                $translation->languageId = $_POST['language_id'];
                $translation->text = $_POST['text'];
                TranslationDao::insert($translation);
            } else {
                $translation = array_values($translations)[0];
                $translation->text = $_POST['text'];
                TranslationDao::update($translation);
            }
        }
    }

    $data = [];
    $data['keywords'] = array_values(KeywordDao::getAll());
    $data['languages'] = array_values(LanguageDao::getAll());
    $data['translations'] = array_values(TranslationDao::getAll());

    echo Json::encode($data);
?>
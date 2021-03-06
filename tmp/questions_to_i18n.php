<?php
    if (!class_exists('LoginDao')) { include $_SERVER["DOCUMENT_ROOT"].'/dao/permissions.php'; }
    LoginDao::checkPermissionsAndRedirect(Permission::TechnicalChange, './');

    if (!class_exists('Db')) { include $_SERVER["DOCUMENT_ROOT"].'/utils/db.php'; }
    if (!class_exists('Question')) { include $_SERVER["DOCUMENT_ROOT"].'/dao/questions.php'; }
    if (!class_exists('Language')) { include $_SERVER["DOCUMENT_ROOT"].'/dao/i18n.php'; }

    class QuestionToI18n {
        public static function runMigration() {
            $allQuestions = QuestionDao::getAll();
            $allQuestionOptions = QuestionOptionDao::getAll();

            // Injecting Text and Markup to the Questions
            $queryResult = Db::query('SELECT id, text, markup FROM questions ORDER BY id');
            foreach ($queryResult as $queryRow) {
                $question = $allQuestions[$queryRow['id']];
                $question->text = $queryRow['text'];
                $question->markup = $queryRow['markup'];
            }

            // Inject Text to the QuestionOptions
            $queryResult = Db::query('SELECT id, text FROM question_options ORDER BY id');
            foreach ($queryResult as $queryRow) {
                $questionOption = $allQuestionOptions[$queryRow['id']];
                $questionOption->text = $queryRow['text'];
            }

            // Filling Questions with their QuestionOptions
            foreach ($allQuestionOptions as $questionOption) {
                $question = $allQuestions[$questionOption->questionId];
                $question->options[$questionOption->id] = $questionOption;
            }

            foreach ($allQuestions as $question) {
                Db::beginTransaction(0, 'questions_i18n');

                // Migrating Question Text and Markup
                if (isset($question->text) && !empty($question->text)) {
                    TranslationDao::saveQuestion($question);

                    // Update Question
                    $sql = 'UPDATE questions SET text = NULL, markup = NULL WHERE id = ?';
                    Db::prepStmt($sql, 'i', [$question->id]);
                }

                if (isset($question->options)) {
                    foreach ($question->options as $questionOption) {
                        TranslationDao::saveQuestionOption($questionOption);
                        $sql = 'UPDATE question_options SET text = NULL WHERE id = ?';
                        Db::prepStmt($sql, 'i', [$questionOption->id]);
                    }
                }
                Db::commit();

                echo 'Question with ID: '.$question->id.' is processed<br />';
            }

            echo 'All Questions has been processed. Please check Database tables "questions" (columns "text" and "markup" and then manually delete them)<br />';
            echo 'Check also table "question_options" (column "text" and delete it)';
        }
    }

    QuestionToI18n::runMigration();
?>

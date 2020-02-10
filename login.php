<?php
    include $_SERVER["DOCUMENT_ROOT"].'/dao/permissions.php';

    if (LoginDao::isLogged()) {
        header("Location: /", true);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        if (isset($_POST['email']) && isset($_POST['password'])) {
            $email = $_POST['email'];
            $pass = $_POST['password'];
            $error = LoginDao::login($email, $pass);
            if (!$error) {
                header("Location: /", true);
                exit;
            }
        }
    }
?>

<html>
    <?
        $browser_title = 'Chaitanya Academy - Astrology';
        $page_title = 'Astrology';

        include $_SERVER["DOCUMENT_ROOT"].'/templates/metadata.php';
    ?>
    <body>
        <table>
            <tr>
                <td colspan="2">
                    <? include $_SERVER["DOCUMENT_ROOT"].'/templates/page_top.php'; ?>
                </td>
            </tr>
            <tr>
                <td class="menu">
                    <? include $_SERVER["DOCUMENT_ROOT"].'/templates/menu.php'; ?>
                </td>
                <td>
                    <? include $_SERVER["DOCUMENT_ROOT"].'/templates/body_top.php'; ?>

                    <? /* Body Area Start */ ?>

                    <?php
                        echo '<font color="red">'.$error.'</font><br /><br />';
                        include $_SERVER["DOCUMENT_ROOT"].'/templates/login.php';
                    ?>

                    <? /* Body Area End */ ?>

                </td>
            </tr>
            <tr>
                <td colspan="2">
                    <? include $_SERVER["DOCUMENT_ROOT"].'/templates/page_footer.php'; ?>
                </td>
            </tr>
        </table>
    </body>
</html>
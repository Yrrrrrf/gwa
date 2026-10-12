DEFINE ACCESS account ON DATABASE TYPE RECORD
 SIGNUP (CREATE account SET email = $email, pass = crypto::argon2::generate($pass))
 SIGNIN (SELECT * FROM account WHERE email = $email AND crypto::argon2::compare(pass, $pass))
 DURATION FOR TOKEN 15m, FOR SESSION 12h;

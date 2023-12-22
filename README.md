# DB to XLSX


## Overview

- 以下２つの REST API が実装されている：

  - 指定したデータベースの内容をエクセルワークブックファイル化してダウンロードする
    - `POST /db2xlsx`
    - POST データの `database_url` パラメータで対象データベース（PosgreSQL or MySQL）を指定する
      - PostgreSQL の場合はこのフォーマットの接続文字列
        - `postgres://user:pass@hostname:port/db`
      - MySQL の場合はこのフォーマットの接続文字列
        - `mysql://user:pass@hostname:port/db`
    - １つのテーブルを１つのワークシートにする
    - ファイル名は `（データベース名）.xlsx`
    - ワークシートの１行目はカラム名、２行目以降がデータレコード

  - アップロードしたエクセルワークブックファイルの内容をもとにデータベース化する
    - `POST /xlsx2db`
    - POST データの `database_url` パラメータで対象データベース（PosgreSQL or MySQL）を指定する
      - PostgreSQL の場合はこのフォーマットの接続文字列
        - `postgres://user:pass@hostname:port/db`
      - MySQL の場合はこのフォーマットの接続文字列
        - `mysql://user:pass@hostname:port/db`
    - １つのワークシートを１つのテーブルとして処理する
      - ワークシート名＝テーブル名　でテーブルを作成し、レコードを挿入する
    - POST データに `drop_table` パラメータが `true` 値で指定されていた場合、該当テーブルを `drop table` し、`create table` してから `insert into table` が実行される（デフォルトは `false`）
    - POST データに `create_table` パラメータが `true` 値で指定されていた場合、該当テーブルを `create table` してから `insert into table` が実行される（デフォルトは `false`）
    - ワークシートの１行目はカラム名、２行目以降がデータレコードとみなす
      - カラム定義は全て `text` にする
      - ただし API 実行時の POST データに `col_attr` パラメータが `true` に指定されていた場合、シートの２行目をカラム定義内容とし、３行目以降がデータレコードとみなす
      - 例： １行目が "id" で２行目が "varchar(10) primary key" 、３行目が "id0001" となっているカラムの場合、
        - `col_attr` = `true` の場合は `id varchar(10) primary key` の列が定義され、"id0001" という１つのデータが挿入される
        - `col_attr` != `true` の場合は `id text` の列が定義され、"varchar(10) primary key" と "id0001" という２つのデータが挿入される
      - カラムタイプが `datetime` や `timestamp` など日付型の場合、データレコードの日付フォーマットは **ISO 8601** に従い `YYYY-MM-DD` とする

- 補足的に以下の REST API も必要であれば実装する：
  - 現時点では未実装
  - 指定したデータベース＆テーブルの内容を JSON などのフォーマットで返す
    - `POST /db2json`


## How to run Swagger API document on localhost

- Node.js をセットアップ

- `$ git clone https://github.com/dotnsf/db2xlsx`

- `$ cd db2xlsx`

- `$ npm install`

- `$ npm start`

- ウェブブラウザで `http://localhost:8080/_doc` にアクセス


## (F.Y.I.)How to run Database on localhost with docker

### Docker コンテナ版 PostgreSQL を起動する

- `$ docker run -d --name postgres -p 5432:5432 -e POSTGRES_USER=user -e POSTGRES_PASSWORD=pass -e POSTGRES_DB=db postgres`

  - この場合であればパラメータ `database_url` は `postgres://user:pass@localhost:5432/db` になる

  - 起動した DB コンテナにログインして `psql` CLI コマンドを実行する場合は以下：

    - `$ docker exec -it postgres bash`

    - `# psql "postgres://user:pass@localhost:5432/db"`

    - `db=# `（終了コマンドは `\q`）

### Docker コンテナ版 MySQL(5.7) でデフォルト文字コードを指定して起動する

- `$ docker run -d --name mysql -e MYSQL_ROOT_PASSWORD=P@ssw0rd -e MYSQL_USER=user -e MYSQL_PASSWORD=pass -e MYSQL_DATABASE=db -p 3306:3306 mysql:5.7 --character-set-server=utf8mb4 --collation-server=utf8mb4_unicode_ci`

  - この場合であればパラメータ `database_url` は `mysql://user:pass@localhost:3306/db` になる

  - 起動した DB コンテナにログインして `mysql` CLI コマンドを実行する場合は以下：

    - `$ docker exec -it mysql bash`

    - `# mysql -u user -ppass -h localhost db --default-character-set=utf8mb4`

      - 最後のオプションを付けないと日本語が文字化けする

    - `mysql> `（終了コマンドは `quit`）


### MySQL CLI 内での文字化け解消

1. mysql CLI でログイン後に対処する方法

  - mysql CLI コマンドで MySQL にログイン

  - 以下を１回実行

    - `> charset utf8;`

2. mysql CLI ログイン時に対処する方法

  - mysql CLI コマンド実行時にオプションを指定する

    - `$ mysql -u user -p -h mysqlhost db --default-character-set=utf8mb4`

  
## Restriction

- データベース接続時に認証鍵ファイルが必要になるケースは対象外とします。ユーザー名とパスワードで接続できるケースにのみ対応しています。


## References

- [SheetJS CE API References](https://docs.sheetjs.com/docs/api/)

- [Docker公式イメージのMySQLで文字コードを指定する](https://qiita.com/neko-neko/items/de8ea13bbad32140de87)

- [コンソールでのMySQLの文字化け](http://taustation.com/mysql-garbled-characters/)


## Licensing

This code is licensed under MIT.


## Copyright

2023  [K.Kimura @ Juge.Me](https://github.com/dotnsf) all rights reserved.

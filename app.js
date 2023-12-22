//. app.js
var express = require( 'express' ),
    bodyParser = require( 'body-parser' ),
    multer = require( 'multer' ),
    fs = require( 'fs' ),
    app = express();

var XLSX = require( 'xlsx-js-style' );

require( 'dotenv' ).config();

app.use( express.static( __dirname + '/public' ) );
app.use( bodyParser.urlencoded( { extended: true } ) );
app.use( bodyParser.json( {/* limit: '10mb' */} ) );
app.use( express.Router() );
app.use( multer( { dest: './tmp/' } ).single( 'file' ) );

//. CORS
var settings_cors = 'CORS' in process.env ? process.env.CORS : '';  //. "http://localhost:8080,https://xxx.herokuapp.com"
app.all( '/*', function( req, res, next ){
  if( settings_cors ){
    var origin = req.headers.origin;
    if( origin ){
      var cors = settings_cors.split( " " ).join( "" ).split( "," );

      //. cors = [ "*" ] への対応が必要
      if( cors.indexOf( '*' ) > -1 ){
        res.setHeader( 'Access-Control-Allow-Origin', '*' );
        res.setHeader( 'Access-Control-Allow-Methods', '*' );
        res.setHeader( 'Access-Control-Allow-Headers', '*' );
        res.setHeader( 'Vary', 'Origin' );
      }else{
        if( cors.indexOf( origin ) > -1 ){
          res.setHeader( 'Access-Control-Allow-Origin', origin );
          res.setHeader( 'Access-Control-Allow-Methods', '*' );
          res.setHeader( 'Access-Control-Allow-Headers', '*' );
          res.setHeader( 'Vary', 'Origin' );
        }
      }
    }
  }
  next();
});

app.get( '/ping', function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  res.write( JSON.stringify( { status: true, message: 'PONG' }, null, 2 ) );
  res.end();
});

//. DB -> xlsx
app.post( '/db2xlsx', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var outputfilename = '';
  try{
    var database_url = req.body.database_url ? req.body.database_url : '';
    var dbtype = check_dbtype( database_url );
    if( database_url && dbtype ){
      var DB = require( './api/db_' + dbtype );
      var db = await DB.connectDB( database_url );

      //. ワークブックを作成
      var wb = XLSX.utils.book_new();

      //. テーブル一覧
      var r0 = await DB.displayTables( db );
      if( r0 && r0.status ){
        var results = r0.results;
        for( var idx = 0; idx < results.length; idx ++ ){
          var tablename = results[idx];
          var r1 = await DB.selectFromTable( db, tablename );
          if( r1 && r1.status ){
            if( r1.results && r1.results.length > 0 ){
              //. ワークシートを作成
              var row = [[]];
              var ws = XLSX.utils.aoa_to_sheet([row]);

              var rows = [];
              for( var i = 0; i < r1.results.length; i ++ ){
                var record = r1.results[i];

                if( i == 0 ){
                  //. １行目を列名で埋める
                  rows = Object.keys( record );
                  for( var j = 0; j < rows.length; j ++ ){
                    var cname = cellname( j, 0 );
                    ws[cname] = { v: rows[j], f: undefined, t: 's', s: { fill: { fgColor: { rgb: 'cccccc' } } } };
                  }
                }

                //. ２行目以降をデータレコードで埋める
                rows = Object.keys( record );
                for( var j = 0; j < rows.length; j ++ ){
                  var cname = cellname( j, i + 1 );
                  ws[cname] = { v: record[rows[j]], f: undefined, t: 's', s: { fill: { fgColor: { rgb: 'ffffff' } } } };
                }
              }

              //. 値が適用される範囲を指定
              var cname = cellname( rows.length - 1, r1.results.length );
              ws['!ref'] = 'A1:' + cname;

              //. ワークシートをワークブックに追加
              XLSX.utils.book_append_sheet( wb, ws, tablename );
            }
          }
        }
      }
      
      //. DB名
      var dbname = 'db';
      var tmp = database_url.split( '/' );
      if( tmp.length > 0 ){
        dbname = tmp.pop();
      }

      //. XLSX ファイル名
      outputfilename = dbname + '.xlsx';

      //. xlsx化
      XLSX.writeFileSync( wb, 'tmp/' + outputfilename );

      res.contentType( 'application/vnd.ms-excel' );
      res.setHeader( 'Content-Disposition', 'attachment; filename="' + outputfilename + '"' );
      var bin = fs.readFileSync( 'tmp/' + outputfilename );
      res.write( bin );
      res.end();
    }else{
      res.status( 400 );
      res.write( JSON.stringify( { status: false, error: 'no database_url specified.' }, null, 2 ) );
      res.end();
    }
  }catch( e ){
    console.log( e );
    res.status( 400 );
    res.write( JSON.stringify( { status: false, error: e } ) );
    res.end();
  }finally{
    if( fs.existsSync( 'tmp/' + outputfilename ) ){
      fs.unlinkSync( 'tmp/' + outputfilename );
    }
  }
});

//. xlsx -> DB
app.post( '/xlsx2db', async function( req, res ){
  res.contentType( 'application/json; charset=utf-8' );

  var filepath = req.file.path;
  try{
    //var mimetype = req.file.mimetype;
    //var filename = req.file.originalname;
    var database_url = req.body.database_url ? req.body.database_url : '';
    var dbtype = check_dbtype( database_url );
    if( database_url && dbtype ){
      var DB = require( './api/db_' + dbtype );
      var db = await DB.connectDB( database_url );

      var col_attr = req.body.col_attr ? true : false;
      var drop_table = req.body.drop_table ? true : false;
      var create_table = req.body.create_table ? true : false;

      //. ワークブックを開く
      var wb = XLSX.readFile( filepath, {} );

      //. ワークシート毎に処理する
      var wss = wb.Sheets;
      var sheets_cnt = 0;
      var sheets = Object.keys( wss );
      for( var k = 0; k < sheets.length; k ++ ){
        var sheet = sheets[k];
        var ws = wss[sheet];
        var ref = ws['!ref'];  //. "A1:E100"
        
        var tmp = ref.split( ':' );
        var ws_position = ( tmp.length == 2 ? cellnum( tmp[1] ) : { x: -1, y: -1 } );

        //. １行目の読み取り
        var cols = [];
        for( var i = 0; i <= ws_position.x; i ++ ){
          var cname = cellname( i, 0 );
          var cell = ws[cname]; //{ v: "" + cols.length, f: undefined, t: 'n', s: { /*fill: { fgColor: { rgb: rrggbb } } */} };
          if( cell ){
            var cell_value = cell.w; //cell.v;
            cols.push( cell_value );
          }
        }
        
        var start_y = 1;
        var col_attrs = [];
        if( col_attr ){
          //. ２行目の読み取り
          for( var i = 0; i < cols.length; i ++ ){
            var cname = cellname( i, 1 );
            var cell = ws[cname];
            if( cell ){
              var cell_value = cell.w; //cell.v;
              col_attrs.push( cell_value );
            }
          }
          start_y = 2;
        }

        //. データ行の読み取り
        var records = [];
        for( var y = start_y; y <= ws_position.y; y ++ ){
          var record = [];
          for( var x = 0; x <= ws_position.x; x ++ ){
            var cname = cellname( x, y );
            var cell = ws[cname];
            if( cell ){
              var cell_value = cell.w; //cell.v;
              record.push( cell_value );
            }
          }
          records.push( record );
        }

        //. DB へインポート
        if( drop_table ){
          var r0 = await DB.dropTable( db, sheet );
        }
        if( drop_table || create_table ){
          var r1 = await DB.createTable( db, sheet, cols, col_attrs );
          if( r1 && r1.status ){
            for( var i = 0; i < records.length; i ++ ){
              var r2 = await DB.insertIntoTable( db, sheet, records[i] );
            }
          }
        }else{
          for( var i = 0; i < records.length; i ++ ){
            var r2 = await DB.insertIntoTable( db, sheet, records[i] );
          }
        }

        sheets_cnt ++;
      }

      res.write( JSON.stringify( { status: true, sheets_cnt: sheets_cnt }, null, 2 ) );
      res.end();
    }else{
      res.status( 400 );
      res.write( JSON.stringify( { status: false, error: 'no database_url specified.' }, null, 2 ) );
      res.end();
    }
  }catch( e ){
    console.log( e );
    res.status( 400 );
    res.write( JSON.stringify( { status: false, error: e } ) );
    res.end();
  }finally{
    if( fs.existsSync( filepath ) ){
      fs.unlinkSync( filepath );
    }
  }
});


function cellname( x, y ){
  //. String.fromCharCode( 65 ) = 'A';
  var c = '';
  var r = ( y + 1 );

  while( x >= 0 ){
    var m = x % 26;
    x = Math.floor( x / 26 );

    c = String.fromCharCode( 65 + m ) + c;
    if( x == 0 ){
      x = -1;
    }else{
      x --;
    }
  }

  return ( c + r );
}

function cellnum( name ){
  var idx = -1;
  for( var i = 0; i < name.length && idx == -1; i ++ ){
    var c = name.charAt( i );
    if( '0' <= c && c <= '9' ){
      idx = i;
    }
  }

  if( idx > 0 ){
    var col = name.substr( 0, idx );
    var row = name.substr( idx );

    var y = parseInt( row ) - 1;
    var x = 0;
    for( var i = 0; i < col.length; i ++ ){
      x *= 26;
      var c = col.charAt( i );
      x += ( c.charCodeAt( 0 ) - 65 ) + 1;
    }
    x --;

    return { x: x, y: y };
  }else{
    return { x: -1, y: -1 };
  }
}

function check_dbtype( database_url ){
  var dbtype = null;
  if( database_url && database_url.indexOf( 'postgres:' ) == 0 ){
    dbtype = 'postgres';
  }else if( database_url && database_url.indexOf( 'mysql:' ) == 0 ){
    dbtype = 'mysql';
  }

  return dbtype;
}


var port = process.env.PORT || 8080;
app.listen( port );
console.log( "server starting on " + port + " ..." );

module.exports = app;

//. db_mysql.js
var Mysql = require( 'mysql' );

var api = {};

//. connect to DB
api.connectDB = async function( database_url ){
  return new Promise( async ( resolve, reject ) => {
    console.log( 'database_url = ' + database_url );

    var mysql = null;
    //. database_url = mysql://user:pass@hostname:port/db
    //. mysql = Mysql.createPool( database_url );
    var tmp = database_url.split( '/' );
    if( tmp.length > 3 ){
      var mysql_db = tmp[3];
      tmp = tmp[2].split( ':' );
      if( tmp.length > 2 ){
        var mysql_user = tmp[0];
        var mysql_port = parseInt( tmp[2] );
        tmp = tmp[1].split( '@' );
        if( tmp.length > 1 ){
          var mysql_pass = tmp[0];
          var mysql_host = tmp[1];
          mysql = Mysql.createPool({
            connectionLimit: 10,
            host: mysql_host,
            user: mysql_user,
            password: mysql_pass,
            port: mysql_port,
            database: mysql_db,
            charset: 'utf8mb4'
          });
          resolve( mysql );
        }else{
          resolve( null );
        }
      }else{
        resolve( null );
      }
    }else{
      resolve( null );
    }
  });
}

//. drop table
api.dropTable = async function( mysql, table ){
  return new Promise( async ( resolve, reject ) => {
    if( mysql ){
      mysql.getConnection( function( err, conn ){
        if( err ){
          resolve( { status: false, error: err } );
        }else{
          try{
            var sql = 'drop table ' + table;
            conn.query( sql, [], function( err, result ){
              if( err ){
                console.log( err );
                resolve( { status: false, error: err } );
              }else{
                resolve( { status: true, result: result } );
              }
            });
          }catch( e ){
            console.log( e );
            resolve( { status: false, error: e } );
          }finally{
            if( conn ){
              conn.release();
            }
          }
        }
      });
    }else{
      console.log( 'no db instance' );
      resolve( { status: false, error: 'no db instance' } );
    }
  });
}

//. create table
api.createTable = async function( mysql, table, cols, col_attrs ){
  return new Promise( async ( resolve, reject ) => {
    if( mysql ){
      mysql.getConnection( function( err, conn ){
        if( err ){
          resolve( { status: false, error: err } );
        }else{
          try{
            var sql = 'create table ' + table + ' (';
            for( var i = 0; i < cols.length; i ++ ){
              if( i > 0 ){ sql += ','; }
              sql += ' ' + cols[i] + ' ';
              if( col_attrs && col_attrs[i] ){
                sql += col_attrs[i] + ' ';
              }else{
                sql += 'text ';
              }
            }
            sql += ') character set utf8mb4';

            conn.query( sql, [], function( err, result ){
              if( err ){
                console.log( err );
                resolve( { status: false, error: err } );
              }else{
                resolve( { status: true, result: result } );
              }
            });
          }catch( e ){
            console.log( e );
            resolve( { status: false, error: e } );
          }finally{
            if( conn ){
              conn.release();
            }
          }
        }
      });
    }else{
      console.log( 'no db instance' );
      resolve( { status: false, error: 'no db instance' } );
    }
  });
}

//. display tables
api.displayTables = async function( mysql ){
  return new Promise( async ( resolve, reject ) => {
    if( mysql ){
      mysql.getConnection( function( err, conn ){
        if( err ){
          resolve( { status: false, error: err } );
        }else{
          try{
            var sql = 'show tables';
            conn.query( sql, [], function( err, result ){
              if( err ){
                console.log( {err} );
                resolve( { status: false, error: err } );
              }else{
                //console.log( {result} );
                var results = [];
                result.forEach( function( row ){
                  results.push( row.Tables_in_db );
                });
                resolve( { status: true, results: results } );
              }
            });
          }catch( e ){
            console.log( e );
            resolve( { status: false, error: e } );
          }finally{
            if( conn ){
              conn.release();
            }
          }
        }
      });
    }else{
      console.log( 'no db instance' );
      resolve( { status: false, error: 'no db instance' } );
    }
  });
}

//. display table
api.displayTable = async function( mysql, table ){
  return new Promise( async ( resolve, reject ) => {
    if( mysql ){
      mysql.getConnection( function( err, conn ){
        if( err ){
          resolve( { status: false, error: err } );
        }else{
          try{
            var sql = 'desc ' + table;
            conn.query( sql, [], function( err, result ){
              if( err ){
                console.log( {err} );
                resolve( { status: false, error: err } );
              }else{
                //console.log( {result} );
                var columns = [];
                result.forEach( function( row ){
                  columns.push( { name: row.Field, type: api.convertType( row.Type ) } );
                });
                resolve( { status: true, results: columns } );
              }
            });
          }catch( e ){
            console.log( e );
            resolve( { status: false, error: e } );
          }finally{
            if( conn ){
              conn.release();
            }
          }
        }
      });
    }else{
      console.log( 'no db instance' );
      resolve( { status: false, error: 'no db instance' } );
    }
  });
}

//. convert column type
api.convertType = function( type ){
  type = type.toLowerCase();
  var newtype = "";
  if( type.indexOf( 'char' ) > -1 || type.indexOf( 'text' ) > -1 ){
    newtype = "string";
  }else if( type.indexOf( 'int' ) > -1 ){
    newtype = "int";
  }else if( type.indexOf( 'num' ) > -1 || type.indexOf( 'double' ) > -1 || type.indexOf( 'float' ) > -1 || type.indexOf( 'real' ) > -1 ){
    newtype = "float";
  }else if( type.indexOf( 'bool' ) > -1 ){
    newtype = "bool";
  }else if( type.indexOf( 'date' ) > -1 || type.indexOf( 'time' ) > -1 ){
    newtype = "datetime";
  }

  return newtype;
}

//. select from table
api.selectFromTable = async function( mysql, table ){
  return new Promise( async ( resolve, reject ) => {
    if( mysql ){
      mysql.getConnection( function( err, conn ){
        if( err ){
          resolve( { status: false, error: err } );
        }else{
          try{
            var sql = 'select * from ' + table;
            conn.query( sql, [], function( err, results ){
              if( err ){
                console.log( err );
                resolve( { status: false, error: err } );
              }else{
                resolve( { status: true, results: results } );
              }
            });
          }catch( e ){
            console.log( e );
            resolve( { status: false, error: e } );
          }finally{
            if( conn ){
              conn.release();
            }
          }
        }
      });
    }else{
      console.log( 'no db instance' );
      resolve( { status: false, error: 'no db instance' } );
    }
  });
}

//. insert into table
api.insertIntoTable = async function( mysql, table, values ){
  return new Promise( async ( resolve, reject ) => {
    if( mysql ){
      mysql.getConnection( async function( err, conn ){
        if( err ){
          resolve( { status: false, error: err } );
        }else{
          try{
            if( values && values.length > 0 ){
              var r = await api.displayTable( mysql, table );
              if( r && r.status ){
                var columns = r.results;

                var cols = [];
                for( var i = 0; i < columns.length; i ++ ){
                  cols.push( columns[i].name );
                }

                var sql = 'insert into ' + table + ' (' + cols.join( ',' ) + ') values('; 
                for( var i = 0; i < values.length; i ++ ){
                  if( i > 0 ){ sql += ','; }
                  if( columns[i].type == 'string' || columns[i].type == 'datetime' || columns[i].type == '' ){
                    sql += " '" + values[i] + "' ";  //. 文字列
                  }else{
                    sql += ' ' + values[i] + ' ';  //. 文字列以外
                  }
                }
                sql += ')';
  
                conn.query( sql, [], function( err, result ){
                  if( err ){
                    console.log( err );
                    resolve( { status: false, error: err } );
                  }else{
                    resolve( { status: true, result: result } );
                  }
                });
              }else{
                resolve( { status: false, error: r.error } );
              }
            }else{
              resolve( { status: false, error: 'no values specified.' } );
            }
          }catch( e ){
            console.log( e );
            resolve( { status: false, error: e } );
          }finally{
            if( conn ){
              conn.release();
            }
          }
        }
      });
    }else{
      console.log( 'no db instance' );
      resolve( { status: false, error: 'no db instance' } );
    }
  });
}

//. api をエクスポート
module.exports = api;

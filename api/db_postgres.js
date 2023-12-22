//. db_postgres.js
var PG = require( 'pg' );

var api = {};

//. connect to DB
api.connectDB = async function( database_url ){
  return new Promise( async ( resolve, reject ) => {
    console.log( 'database_url = ' + database_url );
    var pg = new PG.Pool({
      connectionString: database_url,
      //ssl: { require: true, rejectUnauthorized: false },
      idleTimeoutMillis: ( 3 * 86400 * 1000 )
    });
    resolve( pg );
  });
}

//. drop table
api.dropTable = async function( pg, table ){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        try{
          var sql = 'drop table ' + table;
          var query = { text: sql, values: [] };
          conn.query( query, function( err, result ){
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
      }else{
        console.log( 'no db connection' );
        resolve( { status: false, error: 'no db connection' } );
      }
    }else{
      console.log( 'no db instance' );
      resolve( { status: false, error: 'no db instance' } );
    }
  });
}

//. create table
api.createTable = async function( pg, table, cols, col_attrs ){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
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
          sql += ')';

          var query = { text: sql, values: [] };
          conn.query( query, function( err, result ){
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
      }else{
        console.log( 'no db connection' );
        resolve( { status: false, error: 'no db connection' } );
      }
    }else{
      console.log( 'no db instance' );
      resolve( { status: false, error: 'no db instance' } );
    }
  });
}

//. display tables
api.displayTables = async function( pg ){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        try{
          //var sql = '\dt';
          var sql = "select schemaname, tablename from pg_tables where schemaname = 'public'";
          var query = { text: sql, values: [] };
          conn.query( query, function( err, result ){
            if( err ){
              console.log( err );
              resolve( { status: false, error: err } );
            }else{
              var results = [];
              result.rows.forEach( function( row ){
                results.push( row.tablename );
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
      }else{
        console.log( 'no db connection' );
        resolve( { status: false, error: 'no db connection' } );
      }
    }else{
      console.log( 'no db instance' );
      resolve( { status: false, error: 'no db instance' } );
    }
  });
}

//. display table
api.displayTable = async function( pg, table ){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        try{
          //var sql = '\dt';
          var sql = 'select * from ' + table;
          var query = { text: sql, values: [] };
          conn.query( query, function( err, result ){
            if( err ){
              console.log( err );
              resolve( { status: false, error: err } );
            }else{
              var fields = result.fields;
              var types = result._types._types.builtins;
              var columns = [];
              fields.forEach( function( f ){
                var dt = Object.keys( types ).reduce( function( r, key ){
                  return types[key] === f.dataTypeID ? key : r;
                }, null );
                columns.push( { name: f.name, type: api.convertType( dt ) } );
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
      }else{
        console.log( 'no db connection' );
        resolve( { status: false, error: 'no db connection' } );
      }
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
api.selectFromTable = async function( pg, table ){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        try{
          var sql = 'select * from ' + table;
          var query = { text: sql, values: [] };
          conn.query( query, function( err, result ){
            if( err ){
              console.log( err );
              resolve( { status: false, error: err } );
            }else{
              resolve( { status: true, results: result.rows } );
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
      }else{
        console.log( 'no db connection' );
        resolve( { status: false, error: 'no db connection' } );
      }
    }else{
      console.log( 'no db instance' );
      resolve( { status: false, error: 'no db instance' } );
    }
  });
}

//. insert into table
api.insertIntoTable = async function( pg, table, values ){
  return new Promise( async ( resolve, reject ) => {
    if( pg ){
      var conn = await pg.connect();
      if( conn ){
        try{
          var r = await api.displayTable( pg, table );
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

            var query = { text: sql, values: [] };
            conn.query( query, function( err, result ){
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
        }catch( e ){
          console.log( e );
          resolve( { status: false, error: e } );
        }finally{
          if( conn ){
            conn.release();
          }
        }
      }else{
        console.log( 'no db connection' );
        resolve( { status: false, error: 'no db connection' } );
      }
    }else{
      console.log( 'no db instance' );
      resolve( { status: false, error: 'no db instance' } );
    }
  });
}

//. api をエクスポート
module.exports = api;

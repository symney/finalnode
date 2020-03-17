const mongo =require("mongodb").MongoClient
const async =require("async")
const mongoip=require("./secret.js").secret.mongo
var db=null;

exports.init=
function(callback){
  async.waterfall([
    (cb)=>{
      mongo.connect(mongoip,{w:1,poolSize:20,useUnifiedTopology:true},(err,database)=>{
        db=database.db("Yuur")
        cb(null)
        
      })
    },
    (cb)=>{
      db.collection("users",(err,user_coll)=>{
        exports.users=user_coll
        cb(null)
      })
    },
    (cb)=>{
      db.collection("chats",(err,chats)=>{
        exports.chats=chats;
        cb(null);
      })
    }
  ]
  ,callback)
}
//exports.users=null
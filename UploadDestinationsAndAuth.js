const createUser=require("./usercreate").createUser
const db= require("./db.js");
const ObjectID = require('mongodb').ObjectID;
const path = require("path");
const fs =require("fs")

multerStorageObject={
    filename:nameHandler,
    destination:destinationHandler
}
module.exports.storageObject=multerStorageObject

function nameHandler(req,file,callback){
    if(req.path=="/create"){
        callback(null,"profile.jpg")
    }
    else if(req.path=="/api/creategroup"){
        callback(null,"chatpic.jpg")
    }
    else{
        callback(null,Date.now()+path.extname(file.originalname))
    }

}

function destinationHandler(req,file,callback){
    if(req.path=="/create"){
        createUser(req,(err)=>{
            if(err){callback(err,null);return}
            multerStorageObject.filename="profile.jpg"
            callback(null,__dirname+"/database/uploads/"+req.body.username)
        })
    }
     else if(req.path=="/api/upload"){
         if(!req.body||!req.body.id){callback("invalid upload body");return}
            db.chats.find({_id:ObjectID(req.body.id),usersin:req.user.username}).toArray((err,chatObj)=>{
            if(err){
                callback(err)
            }
            else if(!chatObj[0]){
                callback("you are not in a chat with that id unable to upload")
            }
            else{
                multerStorageObject.filename=Date.now()+path.extname(file.originalname)
                if(fs.existsSync(__dirname+"/database/uploads/chats/"+req.body.id)==false){
                    fs.mkdir(__dirname+"/database/uploads/chats/"+req.body.id,{recursive:true},(err)=>{
                        if(err){ callback(err,null);return}
                        callback(null,__dirname+"/database/uploads/chats/"+req.body.id);
                    })
                }
                else{
                    callback(null,__dirname+"/database/uploads/chats/"+req.body.id);
                }
            }
        })
     }
     else if(req.path=="/api/creategroup"){
        if(!req.body){callback("invalid upload body");return}
            db.chats.insertOne({log:[],usersin:req.body.chatwith,name:req.body.name,read:false,group:"true"},{safe:true},(err,suc)=>{
                if(err){
                //database error
                console.log(err);
                }
                else{
                    console.log(suc.ops[0]._id);
                    fs.mkdir(__dirname+"/database/uploads/chats/"+suc.ops[0]._id,{recursive:true},(err)=>{
                        if(err){ callback(err,null);return}
                        callback(null,__dirname+"/database/uploads/chats/"+suc.ops[0]._id);
                    })
                }
            })
        }
     else{
         callback("unknown upload location")
     }
 }
 
 
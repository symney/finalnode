var io = require('socket.io')(require("./app.js").http);
var ws = null
module.exports.io=io
const db = require("./db.js")
const ObjectID = require('mongodb').ObjectID;

io.on("connection",(ws)=>{
    ws=ws
    module.exports.ws=ws
    console.log("connection successful");

    ws.on("chat",(msgobj)=>{
      if(msgobj.chat != ""){
        msgobj.time=Date.now()
        console.log("updating the chat in database");
        db.chats.updateOne({_id:ObjectID(msgobj.id)},{$push:{log:msgobj},$set:{read:false}},(err)=>{
          if(err){
            console.log(err);
            ws.emit(msgobj.id,{error:"your last chat could not be sent"});
          }
          else{
            console.log("sending event:"+msgobj.id);
            io.emit(msgobj.id,msgobj);
          }
        });
      }
      else{
        console.log("?")
      }
      
    })

    /*ws.on("read",(chatid)=>{
      db.chats.updateOne({_id:ObjectID(chatid)},{$set:{read:true}},(err,suc)=>{
        if(err){
          console.log(err);
          //database err
        }
        else{
          console.log("read");
         io.emit("read",chatid);
        }
      })
    })*/

    ws.on("disconnect",(ws)=>{
      console.log("someone has disconnected");
    })

    ws.on("createc",(cobj)=>{//(not an todo just description)createchat event when you create a new chat
        db.chats.insertOne({log:[],usersin:[cobj.creator,cobj.chatwith],name:cobj.creator+" and "+cobj.chatwith,read:false},{safe:true},(err,suc)=>{
        if(err){
          //database error
          console.log(err);
          ws.emit("createc",{error:"Having trouble creating chat"});
        }
        else{
            console.log(suc.ops[0]._id);
            db.users.updateOne({username:cobj.creator},{$push:{chats:{name:cobj.chatwith,id:String(suc.ops[0]._id),other:cobj.chatwith,pic:"/data/uploads/"+cobj.chatwith+"/profile.jpg"}}},(err)=>{
                if(err){
                //database error
                }
                else{
                db.users.updateOne({username:cobj.chatwith},{$push:{chats:{name:cobj.creator,id:String(suc.ops[0]._id),other:cobj.creator,pic:"/data/uploads/"+cobj.creator+"/profile.jpg"}}},(err)=>{
                    if(err){
                    //database error
                    }
                    else{
                        ws.emit("createc",{name:cobj.chatwith,id:String(suc.ops[0]._id),other:cobj.chatwith,pic:"/data/uploads/"+cobj.chatwith+"/profile.jpg",group:false});
                        ws.broadcast.emit(cobj.chatwith,{name:cobj.creator,id:String(suc.ops[0]._id),other:cobj.creator,pic:"/data/uploads/"+cobj.creator+"/profile.jpg",group:false})
                    }
                })
                }
            })
        }
      })
    })
    
  })
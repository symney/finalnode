const bcrypt = require("bcrypt")
const fs= require("fs")
const db = require("./db.js")
const async = require("async")
module.exports.createUser=createUser

function createUser(req,callback){
  const userPostObj={
    username:req.body.username.toLowerCase(),
    password:req.body.password,
    email:req.body.email.toLowerCase(),
    fname:req.body.fname.toLowerCase(),
    lname:req.body.lname.toLowerCase(),
    gender:req.body.gender,
    phone:req.body.pnum,
    profile:"arbitrary string to place profile field in database and send it as string",
    pics:[]
  }
  let inputcheck=inputCheck(userPostObj);
  if(inputcheck != "good"){
      callback(inputcheck)
  }
  else{
      insertNewUser(userPostObj,(err)=>{
          if(err){
              callback(err)
              return
          }
          callback(null)
      })
  } 
}

function inputCheck(obj){
  var s=obj.username.search(/\W/);
  var len=obj.username.length;
  var plen=obj.password.length;
  var pdig=obj.password.search(/\d/);
  var pnlen=obj.phone.length;
  var pndig=obj.phone.search(/\D/);
  var fnamea=obj.fname.search(/[^a-zA-Z]+/);
  var lnamea=obj.fname.search(/[^a-zA-Z]+/);
  if(s!=-1||len<6){
    return "username must be atleast 6 characters and cannot contain special characters";
  }
  
  else if(plen<8||pdig==-1){
    return "password must be atleast 8 characters and contain one number"
  }
  else if(fnamea!=-1||lnamea!=-1){
    return "name fields must only contain letters"
  }
  else if(obj.gender.toLowerCase()!="male"&&obj.gender.toLowerCase()!="female"){
    return "Gender must be male or female"
  }
  else if(pnlen!=10||pndig!=-1){
    return "phone number must be 10 digits with no dashs"
  }
  else{
    return "good";
  }

}
 
  function insertNewUser(userobj,cb){
    async.waterfall([
    function(callback){ 
        db.users.find({$or:[{username:userobj.username},{phone:userobj.phone},{email:userobj.email}]}).toArray(callback)
    }
    ,

    function(user,callback){
        console.log("test")
        if(user[0]){
            console.log(user);
            for(obj in user){
                if(userobj.username.toLowerCase()==user[obj].username){
                callback("your username matches another username",null);
                return;
                }
                else if(userobj.email.toLowerCase()==user[obj].email){
                callback("your email matches an email in a different account",null);
                return;
                }
                else if(userobj.phone==user[obj].phone){
                callback("your phone number matches a phone number in a different account",null);
                return;
                }
            }
        }
        else{
            console.log("database\n"+db.users)
            db.users.insertOne(userobj,{safe:true},callback)
        }
    }
    ,

    function(emptyresult,callback){
        bcrypt.hash(userobj.password, 10,callback)
    }
    ,

    function(hashedPassword,callback){
        db.users.updateOne(userobj,{
            $set:{password:hashedPassword,profile:"/data/uploads/"+userobj.username+"/profile.jpg"},
            $push:{chats:{name:"Live",id:"5d435235d269d7285c9f0f44",pic:"/data/uploads/Live/Live.jpg"}}
            },(err,sum)=>{
                callback(null,{username:userobj.username,password:hashedPassword})
            })
        
    }
    ,
    function(result,callback){
        console.log("account successfully created about to upload photo\n"+{result})
        fs.mkdir(__dirname+"/database/uploads/"+userobj.username,{recursive:true},(err)=>{
            if(err){ callback(err,null);return}
            callback(null,__dirname+"/database/uploads/"+userobj.username);
        })
    }
    ],
    (err)=>{
        if(err){
            console.log(err);
            cb(err,null)
        }
        else{
            cb(null)
        }
    })
  }
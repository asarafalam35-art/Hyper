
const express = require("express");
const cookieParser = require("cookie-parser");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 10000;
const DB = path.join(__dirname, "data");
if (!fs.existsSync(DB)) fs.mkdirSync(DB);

function read(name, fallback) {
  const f = path.join(DB, name);
  if (!fs.existsSync(f)) { fs.writeFileSync(f, JSON.stringify(fallback, null, 2)); return fallback; }
  try { return JSON.parse(fs.readFileSync(f, "utf8")); } catch { return fallback; }
}
function write(name, value) {
  fs.writeFileSync(path.join(DB, name), JSON.stringify(value, null, 2));
}

let users = read("users.json", []);
let posts = read("posts.json", [
  {id:"demo1", userId:"demo", userName:"hyper_user", avatar:"H", caption:"Welcome to Hyper! 🚀",
   image:"", likes:3, likedBy:[], savedBy:[], comments:[{id:"c1",userId:"demo",userName:"hyper_user",text:"Welcome to Hyper!"}]},
  {id:"demo2", userId:"demo", userName:"creator", avatar:"C", caption:"Share your world.", image:"",
   likes:8, likedBy:[], savedBy:[], comments:[]}
]);
const sessions = new Map();

app.use(express.json({limit:"12mb"}));
app.use(cookieParser());
app.use(express.static(__dirname));

function safeUser(u) {
  if (!u) return null;
  return {id:u.id, username:u.username, email:u.email, name:u.name, bio:u.bio||"",
          avatar:u.avatar||u.username[0].toUpperCase(), privateProfile:!!u.privateProfile,
          notifications:u.notifications!==false};
}
function auth(req,res,next) {
  const sid=req.cookies.hyper_sid;
  const uid=sid && sessions.get(sid);
  req.user=uid ? users.find(u=>u.id===uid) : null;
  next();
}
app.use(auth);

app.get("/api/me",(req,res)=>res.json({user:safeUser(req.user)}));

app.post("/api/register",(req,res)=>{
  const {username,email,password,name}=req.body||{};
  if(!username||!email||!password) return res.status(400).json({error:"Username, email and password are required."});
  if(password.length<6) return res.status(400).json({error:"Password must be at least 6 characters."});
  if(users.some(u=>u.username.toLowerCase()===username.toLowerCase())) return res.status(409).json({error:"Username already exists."});
  if(users.some(u=>u.email.toLowerCase()===email.toLowerCase())) return res.status(409).json({error:"Email already exists."});
  const u={id:crypto.randomUUID(),username:username.replace(/\s+/g,"").slice(0,30),email:email.toLowerCase(),
    password:bcrypt.hashSync(password,10),name:name||username,bio:"",avatar:(name||username)[0].toUpperCase(),
    privateProfile:false,notifications:true};
  users.push(u); write("users.json",users);
  const sid=crypto.randomUUID(); sessions.set(sid,u.id); res.cookie("hyper_sid",sid,{httpOnly:true,sameSite:"lax",secure:false,maxAge:1000*60*60*24*30});
  res.json({user:safeUser(u)});
});

app.post("/api/login",(req,res)=>{
  const {email,password}=req.body||{};
  const u=users.find(x=>x.email.toLowerCase()===String(email||"").toLowerCase());
  if(!u||!bcrypt.compareSync(password||"",u.password)) return res.status(401).json({error:"Invalid email or password."});
  const sid=crypto.randomUUID(); sessions.set(sid,u.id); res.cookie("hyper_sid",sid,{httpOnly:true,sameSite:"lax",secure:false,maxAge:1000*60*60*24*30});
  res.json({user:safeUser(u)});
});

app.post("/api/logout",(req,res)=>{
  const sid=req.cookies.hyper_sid; if(sid)sessions.delete(sid); res.clearCookie("hyper_sid"); res.json({ok:true});
});

app.put("/api/profile",(req,res)=>{
  if(!req.user)return res.status(401).json({error:"Login required."});
  const {name,bio,avatar,username}=req.body||{};
  if(username && users.some(u=>u.id!==req.user.id && u.username.toLowerCase()===username.toLowerCase()))
    return res.status(409).json({error:"Username already exists."});
  if(name!==undefined)req.user.name=String(name).slice(0,60);
  if(bio!==undefined)req.user.bio=String(bio).slice(0,160);
  if(avatar!==undefined)req.user.avatar=String(avatar).slice(0,2000000);
  if(username!==undefined)req.user.username=String(username).replace(/\s+/g,"").slice(0,30);
  write("users.json",users); res.json({user:safeUser(req.user)});
});

app.put("/api/settings",(req,res)=>{
  if(!req.user)return res.status(401).json({error:"Login required."});
  if(req.body.privateProfile!==undefined)req.user.privateProfile=!!req.body.privateProfile;
  if(req.body.notifications!==undefined)req.user.notifications=!!req.body.notifications;
  write("users.json",users); res.json({user:safeUser(req.user)});
});

app.get("/api/posts",(req,res)=>{
  const out=posts.map(p=>{
    const u=users.find(x=>x.id===p.userId);
    return {...p, username:u?.username||p.userName, name:u?.name||p.userName,
      avatar:u?.avatar||p.avatar, likedBy:p.likedBy||[], savedBy:p.savedBy||[]};
  });
  res.json({posts:out,currentUser:req.user?.id||null});
});

app.post("/api/posts",(req,res)=>{
  if(!req.user)return res.status(401).json({error:"Login required."});
  const {caption,image}=req.body||{};
  const p={id:crypto.randomUUID(),userId:req.user.id,userName:req.user.username,avatar:req.user.avatar,
    caption:String(caption||"").slice(0,1000),image:image||"",likes:0,likedBy:[],savedBy:[],comments:[]};
  posts.unshift(p); write("posts.json",posts); res.json({post:p});
});

app.post("/api/posts/:id/like",(req,res)=>{
  if(!req.user)return res.status(401).json({error:"Login required."});
  const p=posts.find(x=>x.id===req.params.id); if(!p)return res.status(404).json({error:"Post not found."});
  p.likedBy=p.likedBy||[]; const i=p.likedBy.indexOf(req.user.id);
  if(i>=0){p.likedBy.splice(i,1);p.likes=Math.max(0,p.likes-1)}else{p.likedBy.push(req.user.id);p.likes++}
  write("posts.json",posts); res.json({liked:i<0,likes:p.likes});
});

app.post("/api/posts/:id/save",(req,res)=>{
  if(!req.user)return res.status(401).json({error:"Login required."});
  const p=posts.find(x=>x.id===req.params.id); if(!p)return res.status(404).json({error:"Post not found."});
  p.savedBy=p.savedBy||[]; const i=p.savedBy.indexOf(req.user.id);
  if(i>=0)p.savedBy.splice(i,1);else p.savedBy.push(req.user.id);
  write("posts.json",posts); res.json({saved:i<0});
});

app.put("/api/posts/:id/comments/:commentId",(req,res)=>{
  if(!req.user)return res.status(401).json({error:"Login required."});
  const p=posts.find(x=>x.id===req.params.id); if(!p)return res.status(404).json({error:"Post not found."});
  const c=(p.comments||[]).find(x=>x.id===req.params.commentId);
  if(!c)return res.status(404).json({error:"Comment not found."});
  if(c.userId!==req.user.id)return res.status(403).json({error:"You can only edit your own comment."});
  const text=String(req.body?.text||"").trim(); if(!text)return res.status(400).json({error:"Comment is empty."});
  c.text=text.slice(0,500); c.edited=true; write("posts.json",posts); res.json({comment:c});
});

app.delete("/api/posts/:id/comments/:commentId",(req,res)=>{
  if(!req.user)return res.status(401).json({error:"Login required."});
  const p=posts.find(x=>x.id===req.params.id); if(!p)return res.status(404).json({error:"Post not found."});
  const i=(p.comments||[]).findIndex(x=>x.id===req.params.commentId);
  if(i<0)return res.status(404).json({error:"Comment not found."});
  if(p.comments[i].userId!==req.user.id)return res.status(403).json({error:"You can only delete your own comment."});
  p.comments.splice(i,1); write("posts.json",posts); res.json({ok:true});
});

app.post("/api/posts/:id/comments",(req,res)=>{
  if(!req.user)return res.status(401).json({error:"Login required."});
  const p=posts.find(x=>x.id===req.params.id); if(!p)return res.status(404).json({error:"Post not found."});
  const text=String(req.body?.text||"").trim(); if(!text)return res.status(400).json({error:"Comment is empty."});
  p.comments=p.comments||[]; const c={id:crypto.randomUUID(),userId:req.user.id,userName:req.user.username,text:text.slice(0,500)};
  p.comments.push(c); write("posts.json",posts); res.json({comment:c});
});

app.get("*",(req,res)=>res.sendFile(path.join(__dirname,"index.html")));
app.listen(PORT,"0.0.0.0",()=>console.log("Hyper Social V4 on "+PORT));

const express=require('express');
const cookieParser=require('cookie-parser');
const bcrypt=require('bcryptjs');
const path=require('path');
const crypto=require('crypto');
const fs=require('fs');
let createClient=null; try{({createClient}=require('@supabase/supabase-js'))}catch{}
const DATA_FILE=path.join(__dirname,'hyper_data.json');

class LocalQuery{
  constructor(db,table,op='select'){this.db=db;this.table=table;this.op=op;this.rows=null;this.filters=[];this.orderSpec=null;this.limitN=null;this.selectCols='*';this.updatePatch=null;this.insertRows=null;this.countMode=false;this.head=false}
  _base(){this.rows=this.db.tables[this.table]||[];return this}
  select(cols='*',opts={}){this.selectCols=cols;this.countMode=opts.count==='exact';this.head=opts.head===true;return this._base()}
  insert(payload){this.op='insert';this.insertRows=Array.isArray(payload)?payload:[payload];return this}
  update(patch){this.op='update';this.updatePatch=patch;return this._base()}
  delete(){this.op='delete';return this._base()}
  eq(field,value){this.filters.push(r=>String(r[field]??'')===String(value??''));return this}
  neq(field,value){this.filters.push(r=>String(r[field]??'')!==String(value??''));return this}
  ilike(field,value){let v=String(value??'').replace(/^%|%$/g,'').toLowerCase();this.filters.push(r=>String(r[field]??'').toLowerCase().includes(v));return this}
  in(field,values){let set=new Set((values||[]).map(String));this.filters.push(r=>set.has(String(r[field])));return this}
  lt(field,value){this.filters.push(r=>new Date(r[field]).getTime()<new Date(value).getTime());return this}
  is(field,value){this.filters.push(r=>value===null ? r[field]===null || r[field]===undefined : r[field]===value);return this}
  or(expr){
    const parts=String(expr||'').split(/,(?=(?:and|or)\()/);
    const tests=[];
    for(const part of parts){
      const m=part.match(/^and\((.+)\)$/);
      const body=m?m[1]:part;
      const conds=body.split(',').map(x=>x.trim()).filter(Boolean).map(x=>{const z=x.match(/^([\w]+)\.(eq|ilike)\.(.*)$/);if(!z)return ()=>false;let val=z[3];return r=>z[2]==='eq'?String(r[z[1]]??'')===String(val):String(r[z[1]]??'').toLowerCase().includes(String(val).replace(/^%|%$/g,'').toLowerCase())});
      tests.push(r=>conds.every(fn=>fn(r)));
    }
    this.filters.push(r=>tests.some(fn=>fn(r)));return this
  }
  order(field,{ascending=true}={}){this.orderSpec={field,ascending};return this}
  limit(n){this.limitN=Number(n);return this}
  async _exec(){
    if(this.op==='insert'){
      const out=this.insertRows.map(x=>({...x}));
      this.db.tables[this.table].push(...out);this.db.save();return {data:out,error:null};
    }
    let rows=[...(this.db.tables[this.table]||[])];
    for(const f of this.filters) rows=rows.filter(f);
    if(this.orderSpec){const {field,ascending}=this.orderSpec;rows.sort((a,b)=>{const av=a[field],bv=b[field];if(av===bv)return 0;return (av>bv?1:-1)*(ascending?1:-1)})}
    if(this.limitN!=null) rows=rows.slice(0,this.limitN);
    if(this.op==='delete'){const all=this.db.tables[this.table]||[];const keep=all.filter(r=>!rows.includes(r));this.db.tables[this.table]=keep;this.db.save();return {data:null,error:null};}
    if(this.op==='update'){for(const r of rows)Object.assign(r,this.updatePatch);this.db.save();return {data:rows.map(r=>({...r})),error:null};}
    const data=rows.map(r=>{if(this.selectCols==='*')return {...r};const cols=String(this.selectCols).split(',').map(x=>x.trim());const o={};for(const c of cols)o[c]=r[c];return o});
    if(this.countMode)return {data:this.head?null:data,count:data.length,error:null};
    return {data,error:null};
  }
  async single(){const r=await this._exec();if(!r.data||!r.data.length)return {data:null,error:{message:'No rows'}};return {data:r.data[0],error:null}}
  async maybeSingle(){const r=await this._exec();return {data:r.data&&r.data.length?r.data[0]:null,error:null}}
  then(resolve,reject){return this._exec().then(resolve,reject)}
}
class LocalDB{
  constructor(){this.tables={users:[],posts:[],stories:[],story_likes:[],messages:[],calls:[],sessions:[]};this.load()}
  load(){try{if(fs.existsSync(DATA_FILE)){const x=JSON.parse(fs.readFileSync(DATA_FILE,'utf8'));for(const k of Object.keys(this.tables))this.tables[k]=Array.isArray(x[k])?x[k]:[]}}catch(e){console.error('Could not read local data:',e.message)}}
  save(){try{fs.writeFileSync(DATA_FILE,JSON.stringify(this.tables))}catch(e){console.error('Could not save local data:',e.message)}}
  from(table){if(!this.tables[table])this.tables[table]=[];return new LocalQuery(this,table)}
}
const app=express();
const PORT=process.env.PORT||10000;
const remoteUrl=String(process.env.SUPABASE_URL||'').trim();
const remoteKey=String(process.env.SUPABASE_SERVICE_ROLE_KEY||'').trim();
const db=(remoteUrl&&remoteKey&&createClient)?createClient(remoteUrl,remoteKey,{auth:{persistSession:false,autoRefreshToken:false}}):new LocalDB();
app.set('trust proxy',1);
app.use(express.json({limit:'12mb'}));
app.use(cookieParser());
app.use(express.static(__dirname));

const adminEmail=String(process.env.ADMIN_EMAIL||'asarafalamt20@gmail.com').trim().toLowerCase();
const adminPassword=String(process.env.ADMIN_PASSWORD||'A2aryann');
function requireDb(res){return true}
function id(){return crypto.randomUUID()}
function isAdmin(u){return !!u&&String(u.email||'').toLowerCase()===adminEmail}
function safeUser(u){if(!u)return null;return {id:u.id,username:u.username,email:u.email,name:u.name,bio:u.bio||'',avatar:u.avatar||String(u.username||'?')[0].toUpperCase(),privateProfile:!!u.private_profile,notifications:u.notifications!==false,followers:Array.isArray(u.followers)?u.followers:[],following:Array.isArray(u.following)?u.following:[],isAdmin:isAdmin(u)}}
async function getUserById(uid){if(!db||!uid)return null;const {data,error}=await db.from('users').select('*').eq('id',uid).maybeSingle();if(error)throw error;return data}
async function getUserByEmail(email){if(!db)return null;const {data,error}=await db.from('users').select('*').eq('email',String(email).toLowerCase()).maybeSingle();if(error)throw error;return data}
async function notify(toId,type,text,meta={}){
  if(!toId||!db)return;
  try{const u=await getUserById(toId);if(!u||u.notifications===false)return;await db.from('notifications').insert({id:id(),user_id:toId,type,text,meta,created_at:new Date().toISOString()});}catch(e){console.error('notify:',e.message)}
}

async function getPostById(pid){const {data,error}=await db.from('posts').select('*').eq('id',pid).maybeSingle();if(error)throw error;return data}
async function enrichPost(p){
  const u=await getUserById(p.user_id);
  const comments=Array.isArray(p.comments)?p.comments:[];
  const ids=[...new Set(comments.map(c=>c.userId).filter(Boolean))];
  let users=[];if(ids.length){const r=await db.from('users').select('id,username,avatar').in('id',ids);if(!r.error)users=r.data||[]}
  const um=new Map(users.map(x=>[x.id,x]));
  const mentionIds=Array.isArray(p.mentions)?p.mentions:[]; let mentionUsers=[]; if(mentionIds.length){const mr=await db.from('users').select('*').in('id',mentionIds); mentionUsers=(mr.data||[]).map(x=>safeUser(x))} return {id:p.id,userId:p.user_id,type:p.type,caption:p.caption||'',image:p.image||'',songUrl:p.song_url||'',songTitle:p.song_title||'',likes:p.likes||0,likedBy:p.liked_by||[],savedBy:p.saved_by||[],comments:comments.map(c=>{const cu=um.get(c.userId);return {...c,userName:cu?.username||c.userName||'user',avatar:cu?.avatar||c.avatar||''}}),mentions:mentionUsers,username:u?.username||'user',name:u?.name||'User',avatar:u?.avatar||'U',createdAt:p.created_at}
}
const AUTH_SECRET=String(process.env.AUTH_SECRET||'change-this-hyper-secret').trim();
function b64url(x){return Buffer.from(x).toString('base64url')}
function signAuth(payload){const sig=crypto.createHmac('sha256',AUTH_SECRET).update(payload).digest('base64url');return payload+'.'+sig}
function verifyAuth(token){try{const parts=String(token||'').split('.');if(parts.length!==2)return null;const [payload,sig]=parts;const expected=crypto.createHmac('sha256',AUTH_SECRET).update(payload).digest('base64url');if(sig!==expected)return null;const obj=JSON.parse(Buffer.from(payload,'base64url').toString('utf8'));if(!obj.id||!obj.exp||obj.exp<Date.now())return null;return obj}catch{return null}}
async function getSessionUser(req){
  if(!db)return null;
  const token=req.cookies.hyper_auth;
  const signed=verifyAuth(token);
  if(signed){const u=await getUserById(signed.id);if(u)return u}
  const sid=req.cookies.hyper_sid;
  if(!sid)return null;
  const {data:s,error}=await db.from('sessions').select('user_id,expires_at').eq('id',sid).maybeSingle();
  if(error||!s)return null;
  if(new Date(s.expires_at).getTime()<Date.now()){await db.from('sessions').delete().eq('id',sid);return null}
  return getUserById(s.user_id)
}
app.use(async(req,res,next)=>{try{req.user=await getSessionUser(req);next()}catch(e){console.error(e);res.status(500).json({error:'Authentication error.'})}});

app.get('/api/me',(req,res)=>res.json({user:safeUser(req.user)}));

app.post('/api/register',async(req,res)=>{try{if(!requireDb(res))return;const username=String(req.body?.username||'').trim().replace(/\s+/g,'').slice(0,30);const email=String(req.body?.email||'').trim().toLowerCase();const password=String(req.body?.password||'');const name=String(req.body?.name||username).slice(0,60);if(!username||!email||!password)return res.status(400).json({error:'Username, email and password are required.'});if(password.length<6)return res.status(400).json({error:'Password must be at least 6 characters.'});const exU=await db.from('users').select('id').ilike('username',username).maybeSingle();if(exU.data)return res.status(409).json({error:'Username already exists.'});const exE=await db.from('users').select('id').eq('email',email).maybeSingle();if(exE.data)return res.status(409).json({error:'Email already exists.'});const u={id:id(),username,email,name,bio:'',avatar:name[0]?.toUpperCase()||'U',password_hash:await bcrypt.hash(password,10),private_profile:false,notifications:true,followers:[],following:[]};const {data,error}=await db.from('users').insert(u).select('*').single();if(error)throw error;const switchToken=await loginSession(res,data);res.json({user:safeUser(data),switchToken})}catch(e){console.error(e);res.status(500).json({error:'Registration failed.'})}});

async function ensureAdmin(){if(!db)return;const existing=await getUserByEmail(adminEmail);const hash=await bcrypt.hash(adminPassword,10);if(existing){if(existing.password_hash!==undefined&&existing.username==='admin'&&existing.email===adminEmail){/* keep existing password for safety */}return}const u={id:id(),username:'admin',email:adminEmail,name:'Hyper Admin',bio:'Hyper administrator',avatar:process.env.ADMIN_AVATAR||'A',password_hash:hash,private_profile:false,notifications:true,followers:[],following:[]};const {error}=await db.from('users').insert(u);if(error&&error.code!=='23505')console.error('Admin seed:',error)}

async function loginSession(res,u){
  const exp=Date.now()+1000*60*60*24*30;
  const payload=b64url(JSON.stringify({id:u.id,exp}));
  const token=signAuth(payload);
  const switchToken=signAuth(b64url(JSON.stringify({id:u.id,exp,type:'switch'})));
  res.cookie('hyper_auth',token,{httpOnly:true,sameSite:'lax',secure:true,path:'/',maxAge:1000*60*60*24*30});
  // Keep the old session too for backward compatibility with existing logins.
  try{const sid=id();await db.from('sessions').insert({id:sid,user_id:u.id,expires_at:new Date(exp).toISOString()});res.cookie('hyper_sid',sid,{httpOnly:true,sameSite:'lax',secure:true,path:'/',maxAge:1000*60*60*24*30})}catch{}
  return switchToken;
}
app.post('/api/login',async(req,res)=>{try{if(!requireDb(res))return;const email=String(req.body?.email||'').trim().toLowerCase();const password=String(req.body?.password||'');if(!email||!password)return res.status(400).json({error:'Email and password are required.'});let u=await getUserByEmail(email);if(email===adminEmail&&password===adminPassword){if(!u){await ensureAdmin();u=await getUserByEmail(email)}if(u){const switchToken=await loginSession(res,u);return res.json({user:safeUser(u),switchToken})}}if(!u||!(await bcrypt.compare(password,u.password_hash||'')))return res.status(401).json({error:'Invalid email or password.'});const switchToken=await loginSession(res,u);res.json({user:safeUser(u),switchToken})}catch(e){console.error(e);res.status(500).json({error:'Login failed.'})}});
app.post('/api/logout',async(req,res)=>{try{if(db&&req.cookies.hyper_sid)await db.from('sessions').delete().eq('id',req.cookies.hyper_sid);res.clearCookie('hyper_sid');res.json({ok:true})}catch(e){res.status(500).json({error:'Logout failed.'})}});
app.post('/api/account/switch',async(req,res)=>{try{const t=String(req.body?.switchToken||'');const v=verifyAuth(t);if(!v||v.type!=='switch')return res.status(401).json({error:'Saved account session expired. Please login once again.'});const u=await getUserById(v.id);if(!u)return res.status(401).json({error:'Account not found.'});const switchToken=await loginSession(res,u);res.json({user:safeUser(u),switchToken})}catch(e){console.error(e);res.status(500).json({error:'Account switch failed.'})}});

app.put('/api/profile',async(req,res)=>{try{if(!req.user)return res.status(401).json({error:'Login required.'});const {name,bio,avatar,username}=req.body||{};if(username){const q=await db.from('users').select('id').ilike('username',String(username)).neq('id',req.user.id).maybeSingle();if(q.data)return res.status(409).json({error:'Username already exists.'})}const patch={};if(name!==undefined)patch.name=String(name).slice(0,60);if(bio!==undefined)patch.bio=String(bio).slice(0,160);if(avatar!==undefined)patch.avatar=String(avatar).slice(0,2500000);if(username!==undefined)patch.username=String(username).replace(/\s+/g,'').slice(0,30);const {data,error}=await db.from('users').update(patch).eq('id',req.user.id).select('*').single();if(error)throw error;res.json({user:safeUser(data)})}catch(e){console.error(e);res.status(500).json({error:'Profile update failed.'})}});
app.put('/api/settings',async(req,res)=>{try{if(!req.user)return res.status(401).json({error:'Login required.'});const patch={};if(req.body.privateProfile!==undefined)patch.private_profile=!!req.body.privateProfile;if(req.body.notifications!==undefined)patch.notifications=!!req.body.notifications;const {data,error}=await db.from('users').update(patch).eq('id',req.user.id).select('*').single();if(error)throw error;res.json({user:safeUser(data)})}catch(e){console.error(e);res.status(500).json({error:'Settings update failed.'})}});

app.get('/api/users',async(req,res)=>{try{let q=db.from('users').select('*').order('created_at',{ascending:true});if(req.query.search!==undefined){const s=String(req.query.search||'').replace(/,/g,'');if(s)q=q.or(`username.ilike.%${s}%,name.ilike.%${s}%,email.ilike.%${s}%`)}const {data,error}=await q;if(error)throw error;let list=data||[];if(req.query.list==='followers'&&req.query.userId){const u=await getUserById(req.query.userId);list=list.filter(x=>(u?.followers||[]).includes(x.id))}if(req.query.list==='following'&&req.query.userId){const u=await getUserById(req.query.userId);list=list.filter(x=>(u?.following||[]).includes(x.id))}res.json({users:list.map(safeUser)})}catch(e){console.error(e);res.status(500).json({error:'Users lookup failed.'})}});
app.get('/api/users/:id',async(req,res)=>{try{const u=await getUserById(req.params.id);if(!u)return res.status(404).json({error:'User not found.'});res.json({user:safeUser(u)})}catch(e){res.status(500).json({error:'User lookup failed.'})}});
app.post('/api/users/:id/follow',async(req,res)=>{try{if(!req.user)return res.status(401).json({error:'Login required.'});const target=await getUserById(req.params.id);if(!target)return res.status(404).json({error:'User not found.'});if(target.id===req.user.id)return res.status(400).json({error:'You cannot follow yourself.'});let following=req.user.following||[], followers=target.followers||[];const i=following.indexOf(target.id);if(i>=0){following=following.filter(x=>x!==target.id);followers=followers.filter(x=>x!==req.user.id)}else{following=[...following,target.id];followers=[...followers,req.user.id]}await db.from('users').update({following}).eq('id',req.user.id);await db.from('users').update({followers}).eq('id',target.id);const fresh=await getUserById(req.user.id);res.json({following:i<0,user:safeUser(fresh)})}catch(e){console.error(e);res.status(500).json({error:'Follow update failed.'})}});

app.get('/api/stories',async(req,res)=>{try{await db.from('stories').delete().lt('expires_at',new Date().toISOString());const {data,error}=await db.from('stories').select('*').order('created_at',{ascending:false});if(error)throw error;const ids=[...new Set((data||[]).map(s=>s.user_id))];let us=[];if(ids.length){const r=await db.from('users').select('*').in('id',ids);us=r.data||[]}const um=new Map(us.map(u=>[u.id,u])); const mentionIds=[...new Set((data||[]).flatMap(s=>Array.isArray(s.mentions)?s.mentions:[]))]; let mus=[]; if(mentionIds.length){const mr=await db.from('users').select('*').in('id',mentionIds); mus=mr.data||[]} const mum=new Map(mus.map(u=>[u.id,u])); const likeRows=await db.from('story_likes').select('*'); const likeMap=new Map(); for(const r of (likeRows.data||[])){if(!likeMap.has(r.story_id))likeMap.set(r.story_id,[]);likeMap.get(r.story_id).push(r.user_id)} res.json({stories:(data||[]).map(s=>({id:s.id,userId:s.user_id,image:s.image||'',postId:s.post_id,postType:s.post_type,caption:s.caption||'',songUrl:s.song_url||'',songTitle:s.song_title||'',mentions:(Array.isArray(s.mentions)?s.mentions:[]).map(mid=>safeUser(mum.get(mid))).filter(Boolean),createdAt:s.created_at,expiresAt:s.expires_at,likes:(likeMap.get(s.id)||[]).length,likedBy:likeMap.get(s.id)||[],user:safeUser(um.get(s.user_id))}))})}catch(e){console.error(e);res.status(500).json({error:'Stories failed.'})}});
app.post('/api/stories',async(req,res)=>{try{if(!req.user)return res.status(401).json({error:'Login required.'});const postId=req.body?.postId||null;let post=null;if(postId){post=await getPostById(postId);if(!post)return res.status(404).json({error:'Post/Reel not found.'})}const st={id:id(),user_id:req.user.id,image:req.body?.image||'',post_id:post?.id||null,post_type:post?.type||null,caption:String(req.body?.caption||'').slice(0,300),song_url:String(req.body?.songUrl||'').slice(0,2000),song_title:String(req.body?.songTitle||'').slice(0,160),mentions:Array.isArray(req.body?.mentions)?req.body.mentions.slice(0,20):[],created_at:new Date().toISOString(),expires_at:new Date(Date.now()+24*60*60*1000).toISOString()};if(!st.image&&!st.post_id&&!st.song_url)return res.status(400).json({error:'Choose a photo/video, share a post/reel, or select a song.'});const {data,error}=await db.from('stories').insert(st).select('*').single();if(error)throw error;for(const mid of st.mentions||[])if(mid!==req.user.id)await notify(mid,'mention',`@${req.user.username} mentioned you in a story`,{storyId:data.id,fromUserId:req.user.id});res.json({story:{id:data.id,userId:data.user_id,image:data.image,postId:data.post_id,postType:data.post_type,caption:data.caption,songUrl:data.song_url,songTitle:data.song_title,mentions:(Array.isArray(data.mentions)?data.mentions:[]).map(mid=>mid),createdAt:data.created_at,expiresAt:data.expires_at,user:safeUser(req.user)}})}catch(e){console.error(e);res.status(500).json({error:'Story creation failed.'})}});
app.post('/api/stories/:id/like',async(req,res)=>{try{if(!req.user)return res.status(401).json({error:'Login required.'});const {data:st}=await db.from('stories').select('*').eq('id',req.params.id).maybeSingle();if(!st)return res.status(404).json({error:'Story not found.'});const {data:existing}=await db.from('story_likes').select('*').eq('story_id',st.id).eq('user_id',req.user.id).maybeSingle();if(existing){await db.from('story_likes').delete().eq('story_id',st.id).eq('user_id',req.user.id);return res.json({liked:false})}const row={id:id(),story_id:st.id,user_id:req.user.id,created_at:new Date().toISOString()};const {error}=await db.from('story_likes').insert(row);if(error)throw error;if(st.user_id!==req.user.id)await notify(st.user_id,'story_like',`@${req.user.username} liked your story`,{storyId:st.id,fromUserId:req.user.id});res.json({liked:true})}catch(e){console.error(e);res.status(500).json({error:'Story like failed.'})}});
app.delete('/api/stories/:id',async(req,res)=>{try{if(!req.user)return res.status(401).json({error:'Login required.'});const {data:s}=await db.from('stories').select('*').eq('id',req.params.id).maybeSingle();if(!s)return res.status(404).json({error:'Story not found.'});if(s.user_id!==req.user.id&&!isAdmin(req.user))return res.status(403).json({error:'Not allowed.'});await db.from('stories').delete().eq('id',s.id);res.json({ok:true})}catch(e){res.status(500).json({error:'Story delete failed.'})}});

app.get('/api/posts',async(req,res)=>{try{const {data,error}=await db.from('posts').select('*').order('created_at',{ascending:false});if(error)throw error;const out=[];for(const p of data||[])out.push(await enrichPost(p));res.json({posts:out,currentUser:req.user?.id||null})}catch(e){console.error(e);res.status(500).json({error:'Posts failed.'})}});
app.post('/api/posts',async(req,res)=>{try{if(!req.user)return res.status(401).json({error:'Login required.'});const p={id:id(),user_id:req.user.id,type:req.body?.type==='reel'?'reel':'post',caption:String(req.body?.caption||'').slice(0,1000),image:req.body?.image||'',song_url:String(req.body?.songUrl||'').slice(0,2000),song_title:String(req.body?.songTitle||'').slice(0,160),mentions:Array.isArray(req.body?.mentions)?req.body.mentions.slice(0,20):[],likes:0,liked_by:[],saved_by:[],comments:[],created_at:new Date().toISOString()};const {data,error}=await db.from('posts').insert(p).select('*').single();if(error)throw error;for(const mid of p.mentions||[])if(mid!==req.user.id)await notify(mid,'mention',`@${req.user.username} mentioned you in a ${p.type==='reel'?'reel':'post'}`,{postId:p.id,fromUserId:req.user.id});res.json({post:await enrichPost(data)})}catch(e){console.error(e);res.status(500).json({error:'Post creation failed.'})}});
app.post('/api/posts/:id/like',async(req,res)=>{try{if(!req.user)return res.status(401).json({error:'Login required.'});const p=await getPostById(req.params.id);if(!p)return res.status(404).json({error:'Post not found.'});let arr=p.liked_by||[];const i=arr.indexOf(req.user.id);if(i>=0)arr=arr.filter(x=>x!==req.user.id);else arr=[...arr,req.user.id];const {error}=await db.from('posts').update({liked_by:arr,likes:arr.length}).eq('id',p.id);if(error)throw error;if(i<0&&p.user_id!==req.user.id)await notify(p.user_id,'like',`@${req.user.username} liked your ${p.type==='reel'?'reel':'post'}`,{postId:p.id,fromUserId:req.user.id});res.json({liked:i<0,likes:arr.length})}catch(e){res.status(500).json({error:'Like failed.'})}});
app.put('/api/posts/:id',async(req,res)=>{try{if(!req.user)return res.status(401).json({error:'Login required.'});const p=await getPostById(req.params.id);if(!p)return res.status(404).json({error:'Post/Reel not found.'});if(p.user_id!==req.user.id&&!isAdmin(req.user))return res.status(403).json({error:'You can only edit your own post/reel.'});const patch={};if(req.body.caption!==undefined)patch.caption=String(req.body.caption).slice(0,1000);if(req.body.songUrl!==undefined)patch.song_url=String(req.body.songUrl).slice(0,2000);if(req.body.songTitle!==undefined)patch.song_title=String(req.body.songTitle).slice(0,160);if(req.body.mentions!==undefined)patch.mentions=Array.isArray(req.body.mentions)?req.body.mentions.slice(0,20):[];const {data,error}=await db.from('posts').update(patch).eq('id',p.id).select('*').single();if(error)throw error;res.json({post:await enrichPost(data)})}catch(e){res.status(500).json({error:'Post update failed.'})}});
app.delete('/api/posts/:id',async(req,res)=>{try{if(!req.user)return res.status(401).json({error:'Login required.'});const p=await getPostById(req.params.id);if(!p)return res.status(404).json({error:'Post/Reel not found.'});if(p.user_id!==req.user.id&&!isAdmin(req.user))return res.status(403).json({error:'You can only delete your own post/reel.'});await db.from('posts').delete().eq('id',p.id);await db.from('stories').delete().eq('post_id',p.id);res.json({ok:true})}catch(e){res.status(500).json({error:'Post delete failed.'})}});
app.post('/api/posts/:id/save',async(req,res)=>{try{if(!req.user)return res.status(401).json({error:'Login required.'});const p=await getPostById(req.params.id);if(!p)return res.status(404).json({error:'Post not found.'});let arr=p.saved_by||[];const i=arr.indexOf(req.user.id);if(i>=0)arr=arr.filter(x=>x!==req.user.id);else arr=[...arr,req.user.id];await db.from('posts').update({saved_by:arr}).eq('id',p.id);res.json({saved:i<0})}catch(e){res.status(500).json({error:'Save failed.'})}});
app.post('/api/posts/:id/comments',async(req,res)=>{try{if(!req.user)return res.status(401).json({error:'Login required.'});const p=await getPostById(req.params.id);if(!p)return res.status(404).json({error:'Post not found.'});const text=String(req.body?.text||'').trim();if(!text)return res.status(400).json({error:'Comment is empty.'});const c={id:id(),userId:req.user.id,userName:req.user.username,text:text.slice(0,500),createdAt:Date.now()};const comments=[...(p.comments||[]),c];await db.from('posts').update({comments}).eq('id',p.id);if(p.user_id!==req.user.id)await notify(p.user_id,'comment',`@${req.user.username} commented on your ${p.type==='reel'?'reel':'post'}`,{postId:p.id,fromUserId:req.user.id});res.json({comment:c})}catch(e){res.status(500).json({error:'Comment failed.'})}});
app.put('/api/posts/:id/comments/:commentId',async(req,res)=>{try{if(!req.user)return res.status(401).json({error:'Login required.'});const p=await getPostById(req.params.id);const comments=[...(p?.comments||[])];const i=comments.findIndex(c=>c.id===req.params.commentId);if(!p||i<0)return res.status(404).json({error:'Comment not found.'});if(comments[i].userId!==req.user.id)return res.status(403).json({error:'You can only edit your own comment.'});const text=String(req.body?.text||'').trim();if(!text)return res.status(400).json({error:'Comment is empty.'});comments[i]={...comments[i],text:text.slice(0,500),edited:true};await db.from('posts').update({comments}).eq('id',p.id);res.json({comment:comments[i]})}catch(e){res.status(500).json({error:'Comment update failed.'})}});
app.delete('/api/posts/:id/comments/:commentId',async(req,res)=>{try{if(!req.user)return res.status(401).json({error:'Login required.'});const p=await getPostById(req.params.id);const comments=[...(p?.comments||[])];const i=comments.findIndex(c=>c.id===req.params.commentId);if(!p||i<0)return res.status(404).json({error:'Comment not found.'});if(comments[i].userId!==req.user.id)return res.status(403).json({error:'You can only delete your own comment.'});comments.splice(i,1);await db.from('posts').update({comments}).eq('id',p.id);res.json({ok:true})}catch(e){res.status(500).json({error:'Comment delete failed.'})}});

app.get('/api/conversations',async(req,res)=>{try{if(!req.user)return res.status(401).json({error:'Login required.'});const {data,error}=await db.from('messages').select('*').or(`from_id.eq.${req.user.id},to_id.eq.${req.user.id}`).order('created_at',{ascending:false});if(error)throw error;const map=new Map();for(const m of data||[]){const otherId=m.from_id===req.user.id?m.to_id:m.from_id;if(map.has(otherId))continue;const u=await getUserById(otherId);if(u)map.set(otherId,{user:safeUser(u),lastMessage:{id:m.id,from:m.from_id,to:m.to_id,text:m.text,sharedPostId:m.shared_post_id,sharedStoryId:m.shared_story_id,createdAt:m.created_at}})}res.json({conversations:[...map.values()]})}catch(e){res.status(500).json({error:'Conversations failed.'})}});
app.get('/api/messages',async(req,res)=>{try{if(!req.user)return res.status(401).json({error:'Login required.'});const withId=String(req.query.with||'');const {data,error}=await db.from('messages').select('*').or(`and(from_id.eq.${req.user.id},to_id.eq.${withId}),and(from_id.eq.${withId},to_id.eq.${req.user.id})`).order('created_at',{ascending:true});if(error)throw error;res.json({messages:(data||[]).map(m=>({id:m.id,from:m.from_id,to:m.to_id,text:m.text||'',sharedPostId:m.shared_post_id,sharedStoryId:m.shared_story_id,createdAt:m.created_at}))})}catch(e){res.status(500).json({error:'Messages failed.'})}});
app.post('/api/messages',async(req,res)=>{try{if(!req.user)return res.status(401).json({error:'Login required.'});const to=await getUserById(req.body?.to);const text=String(req.body?.text||'').trim();if(!to||!text)return res.status(400).json({error:'Recipient and message are required.'});const storyId=req.body?.storyId||null; const m={id:id(),from_id:req.user.id,to_id:to.id,text:text.slice(0,1000),shared_post_id:null,shared_story_id:storyId,created_at:new Date().toISOString()};const {data,error}=await db.from('messages').insert(m).select('*').single();if(error)throw error;res.json({message:{id:data.id,from:data.from_id,to:data.to_id,text:data.text,createdAt:data.created_at}})}catch(e){res.status(500).json({error:'Message failed.'})}});
app.post('/api/messages/share-story',async(req,res)=>{try{if(!req.user)return res.status(401).json({error:'Login required.'});const to=await getUserById(req.body?.to);const story=await db.from('stories').select('*').eq('id',req.body?.storyId).maybeSingle();if(!to||!story.data)return res.status(404).json({error:'User or story not found.'});const m={id:id(),from_id:req.user.id,to_id:to.id,text:'',shared_story_id:story.data.id,created_at:new Date().toISOString()};const {data,error}=await db.from('messages').insert(m).select('*').single();if(error)throw error;res.json({message:{id:data.id,from:data.from_id,to:data.to_id,text:'',sharedStoryId:data.shared_story_id,createdAt:data.created_at}})}catch(e){console.error(e);res.status(500).json({error:'Story share failed.'})}});
app.post('/api/messages/share',async(req,res)=>{try{if(!req.user)return res.status(401).json({error:'Login required.'});const to=await getUserById(req.body?.to),post=await getPostById(req.body?.postId);if(!to||!post)return res.status(404).json({error:'User or post/reel not found.'});if(to.id===req.user.id)return res.status(400).json({error:'You cannot send this to yourself.'});const m={id:id(),from_id:req.user.id,to_id:to.id,text:'',shared_post_id:post.id,created_at:new Date().toISOString()};const {data,error}=await db.from('messages').insert(m).select('*').single();if(error)throw error;res.json({message:{id:data.id,from:data.from_id,to:data.to_id,text:'',sharedPostId:data.shared_post_id,createdAt:data.created_at}})}catch(e){res.status(500).json({error:'Share failed.'})}});

app.post('/api/calls',async(req,res)=>{try{if(!req.user)return res.status(401).json({error:'Login required.'});const to=await getUserById(req.body?.to);if(!to)return res.status(404).json({error:'User not found.'});const type=req.body?.type==='video'?'video':'audio';const c={id:id(),from_id:req.user.id,to_id:to.id,type,offer:req.body?.offer||null,answer:null,created_at:new Date().toISOString()};await db.from('calls').delete().or(`from_id.eq.${req.user.id},to_id.eq.${req.user.id}`);const {data,error}=await db.from('calls').insert(c).select('*').single();if(error)throw error;res.json({call:{id:data.id,type:data.type}})}catch(e){res.status(500).json({error:'Call failed.'})}});
app.get('/api/calls/incoming',async(req,res)=>{try{if(!req.user)return res.status(401).json({error:'Login required.'});const {data:c}=await db.from('calls').select('*').eq('to_id',req.user.id).is('answer',null).order('created_at',{ascending:false}).limit(1).maybeSingle();if(!c)return res.json({call:null});const u=await getUserById(c.from_id);res.json({call:{id:c.id,type:c.type,offer:c.offer,fromUser:safeUser(u)}})}catch(e){res.status(500).json({error:'Incoming call failed.'})}});
app.get('/api/calls/:id',async(req,res)=>{try{if(!req.user)return res.status(401).json({error:'Login required.'});const {data:c}=await db.from('calls').select('*').eq('id',req.params.id).maybeSingle();if(!c||![c.from_id,c.to_id].includes(req.user.id))return res.status(404).json({error:'Call not found.'});res.json({call:{id:c.id,type:c.type,answer:c.answer,status:c.answer?'answered':'ringing'}})}catch(e){res.status(500).json({error:'Call lookup failed.'})}});
app.post('/api/calls/:id/answer',async(req,res)=>{try{if(!req.user)return res.status(401).json({error:'Login required.'});const {data:c}=await db.from('calls').select('*').eq('id',req.params.id).eq('to_id',req.user.id).maybeSingle();if(!c)return res.status(404).json({error:'Call not found.'});await db.from('calls').update({answer:req.body?.answer||null}).eq('id',c.id);res.json({ok:true})}catch(e){res.status(500).json({error:'Call answer failed.'})}});
app.post('/api/calls/:id/end',async(req,res)=>{if(!req.user)return res.status(401).json({error:'Login required.'});await db.from('calls').delete().eq('id',req.params.id);res.json({ok:true})});

app.get('/api/songs/trending',async(req,res)=>{try{
  const terms=['hindi','bhojpuri','punjabi'];
  const results=await Promise.all(terms.map(async term=>{
    const u='https://itunes.apple.com/search?term='+encodeURIComponent(term)+'&country=IN&media=music&entity=song&limit=50';
    const r=await fetch(u); if(!r.ok) return []; const j=await r.json(); return (j.results||[]).map(x=>({
      trackName:x.trackName||'',artistName:x.artistName||'',collectionName:x.collectionName||'',
      artworkUrl100:x.artworkUrl100||'',previewUrl:x.previewUrl||'',trackViewUrl:x.trackViewUrl||'',durationSeconds:x.trackTimeMillis?Math.round(x.trackTimeMillis/1000):0,genre:x.primaryGenreName||'',
      language:term
    }));
  }));
  const seen=new Set(), songs=[]; for(const list of results.flat()){const k=(list.trackName+'|'+list.artistName).toLowerCase();if(!list.trackName||seen.has(k))continue;seen.add(k);songs.push(list);}
  res.json({songs:songs.slice(0,150)});
}catch(e){console.error(e);res.status(503).json({error:'Trending songs unavailable.'})}});

function videoAgeLabel(created){
  const ts=Number(created||0);
  if(!ts)return 'Date unavailable';
  const diff=Math.max(0,Math.floor(Date.now()/1000-ts));
  if(diff<60)return 'abhi';
  const mins=Math.floor(diff/60);
  if(mins<60)return mins+' minute pehle';
  const hours=Math.floor(mins/60);
  if(hours<24)return hours+' ghante '+(mins%60)+' minute pehle';
  const days=Math.floor(hours/24);
  if(days<7)return days+' din '+(hours%24)+' ghante pehle';
  const weeks=Math.floor(days/7);
  if(weeks<5)return weeks+' hafte pehle';
  return days+' din pehle';
}
async function fetchDailymotionVideos(queryOrChannel,limit=8,mode='search',category='Video'){
  try{
    const param=mode==='channel'?'channel':'search';
    const pages=mode==='channel'?[1]:[1,2];
    const lists=await Promise.all(pages.map(async page=>{
      const u='https://api.dailymotion.com/videos?'+param+'='+encodeURIComponent(queryOrChannel)+'&sort='+(mode==='channel'?'trending':'relevance')+'&limit='+Math.min(limit,50)+'&page='+page+'&fields=id,title,duration,thumbnail_url,vertical_thumbnail_url,url,embed_url,channel,language,created_time,uploaded_time';
      const r=await fetch(u); if(!r.ok)return [];
      const j=await r.json(); return j.list||[];
    }));
    const seen=new Set();
    return lists.flat().map(x=>{
      const created=Number(x.created_time||x.uploaded_time||0);
      return {id:x.id,title:x.title||'Video',duration:x.duration||0,thumbnail:x.vertical_thumbnail_url||x.thumbnail_url||'',url:x.url||'',embedUrl:x.embed_url||'',channel:x.channel||queryOrChannel,language:x.language||'',createdTime:created,ageLabel:videoAgeLabel(created),category};
    }).filter(x=>x.id&&x.embedUrl&&!seen.has(x.id)&&seen.add(x.id)).sort((a,b)=>b.createdTime-a.createdTime).slice(0,limit);
  }catch(e){return []}
}

async function fetchMovieClips(q='movie trailer',limit=8){return fetchDailymotionVideos(q,limit,'search')}

app.get('/api/discover/search',async(req,res)=>{try{
  const q=String(req.query.q||'').trim(); if(!q)return res.json({songs:[],news:[],movies:[],reels:[],shorts:[],videos:[],musicVideos:[],comedyVideos:[]});
  const [songR,newsR,postsR,movieR,videoR,musicR,comedyR]=await Promise.all([
    fetch('https://itunes.apple.com/search?term='+encodeURIComponent(q)+'&country=IN&media=music&entity=song&limit=100').catch(()=>null),
    fetch('https://news.google.com/rss/search?q='+encodeURIComponent(q)+'&hl=hi&gl=IN&ceid=IN:hi').catch(()=>null),
    db.from('posts').select('*').order('created_at',{ascending:false}),
    fetchDailymotionVideos(q+' movie trailer',12,'search','Movie Clip'),
    fetchDailymotionVideos(q,12,'search','Video'),
    fetchDailymotionVideos(q+' music video',10,'search','Song Video'),
    fetchDailymotionVideos(q+' comedy Hindi Bhojpuri Punjabi',10,'search','Comedy')
  ]);
  let songs=[]; if(songR&&songR.ok){const j=await songR.json();songs=(j.results||[]).map(x=>({trackName:x.trackName||'',artistName:x.artistName||'',collectionName:x.collectionName||'',artworkUrl100:x.artworkUrl100||'',previewUrl:x.previewUrl||'',trackViewUrl:x.trackViewUrl||'',durationSeconds:x.trackTimeMillis?Math.round(x.trackTimeMillis/1000):0,language:'search'})).filter(x=>x.trackName)}
  let news=[]; if(newsR&&newsR.ok){const xml=await newsR.text();news=[...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0,20).map(m=>{const x=m[1];const get=k=>{const z=x.match(new RegExp('<'+k+'(?:\\s[^>]*)?>([\\s\S]*?)<\/'+k+'>'));return z?z[1].replace(/<!\[CDATA\[|\]\]>/g,'').trim():''};return {title:get('title'),link:get('link'),source:get('source')||'News'}}).filter(x=>x.title&&x.link)}
  const all=(postsR&&postsR.data)||[]; const lower=q.toLowerCase();
  const found=all.filter(x=>(String(x.caption||'')+' '+String(x.song_title||'')).toLowerCase().includes(lower));
  let movies=movieR||[], videos=videoR||[], musicVideos=musicR||[], comedyVideos=comedyR||[];
  res.json({songs:songs.slice(0,100),news,reels:found.filter(x=>x.type==='reel').slice(0,20),shorts:found.filter(x=>x.type==='short').slice(0,20),movies:movies.slice(0,12),videos:videos.slice(0,12),musicVideos:musicVideos.slice(0,10),comedyVideos:comedyVideos.slice(0,10)});
}catch(e){console.error(e);res.status(503).json({error:'Search unavailable.'})}});

app.get('/api/trending/mixed',async(req,res)=>{try{
  const refreshSeed=String(req.query.refresh||Date.now());
  const queries=[
    ['latest Indian cinema movie clip',10,'movie','Indian Cinema / Movie'],
    ['latest Hindi song music video',10,'music','Hindi Song Video'],
    ['latest Bhojpuri song music video',8,'music','Bhojpuri Song Video'],
    ['latest Punjabi song music video',8,'music','Punjabi Song Video'],
    ['latest Hindi comedy',8,'comedy','Hindi Comedy'],
    ['latest Bhojpuri comedy',8,'comedy','Bhojpuri Comedy'],
    ['latest Punjabi comedy',8,'comedy','Punjabi Comedy'],
    ['latest Hindi story',8,'story','Hindi Story'],
    ['latest Hindi motivational',8,'motivational','Motivational'],
    ['latest India news video',10,'news','India News'],
    ['latest Hindi news video',8,'news','Hindi News'],
    ['latest viral India video',8,'viral','Viral'],
    ['latest Hindi short video',8,'shortVideo','Hindi Shorts'],
    ['latest Hindi reel video',8,'reelVideo','Hindi Reels']
  ];
  const [songsR,newsR,localPosts,...videoGroups]=await Promise.all([
    fetch('http://127.0.0.1:'+PORT+'/api/songs/trending').catch(()=>null),
    fetch('https://news.google.com/rss?hl=hi&gl=IN&ceid=IN:hi').catch(()=>null),
    db.from('posts').select('*').order('created_at',{ascending:false}),
    ...queries.map(([q,n,kind,category])=>fetchDailymotionVideos(q,n,'search',category))
  ]);
  let songs=[]; if(songsR&&songsR.ok){const j=await songsR.json();songs=j.songs||[]}
  let news=[]; if(newsR&&newsR.ok){const xml=await newsR.text();news=[...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0,30).map(m=>{const x=m[1];const get=k=>{const z=x.match(new RegExp('<'+k+'(?:\\s[^>]*)?>([\s\S]*?)<\/'+k+'>'));return z?z[1].replace(/<!\[CDATA\[|\]\]>/g,'').trim():''};return {title:get('title'),link:get('link'),source:get('source')||'Google News'}}).filter(x=>x.title&&x.link)}
  const local=(localPosts&&localPosts.data)||[];
  const sorted=[...local].sort((a,b)=>(Number(b.likes_count||0)-Number(a.likes_count||0))||((new Date(b.created_at).getTime()||0)-(new Date(a.created_at).getTime()||0)));
  const reels=sorted.filter(p=>p.type==='reel').slice(0,30).map(p=>({...p,kind:'reel'}));
  const shorts=sorted.filter(p=>p.type==='short').slice(0,30).map(p=>({...p,kind:'short'}));
  const [movies,musicVideos,bhojpuriMusic,punjabiMusic,hindiComedy,bhojpuriComedy,punjabiComedy,hindiStory,motivational,newsVideos,hindiNews,viralVideos,hindiShortVideos,hindiReelVideos]=videoGroups;
  const cinema=[...movies];
  const comedy=[...hindiComedy,...bhojpuriComedy,...punjabiComedy];
  const musicVideo=[...musicVideos,...bhojpuriMusic,...punjabiMusic];
  const story=[...hindiStory];
  const allNewsVideos=[...newsVideos,...hindiNews];
  const mixed=[]; const max=Math.max(songs.length,news.length,reels.length,shorts.length,cinema.length,musicVideo.length,comedy.length,story.length,motivational.length,allNewsVideos.length,viralVideos.length,hindiShortVideos.length,hindiReelVideos.length);
  for(let i=0;i<max;i++){
    if(songs[i])mixed.push({kind:'song',item:songs[i]});
    if(musicVideo[i])mixed.push({kind:'musicVideo',item:musicVideo[i]});
    if(reels[i])mixed.push({kind:'reel',item:reels[i]});
    if(news[i])mixed.push({kind:'news',item:news[i]});
    if(allNewsVideos[i])mixed.push({kind:'newsVideo',item:allNewsVideos[i]});
    if(shorts[i])mixed.push({kind:'short',item:shorts[i]});
    if(comedy[i])mixed.push({kind:'comedyVideo',item:comedy[i]});
    if(story[i])mixed.push({kind:'storyVideo',item:story[i]});
    if(motivational[i])mixed.push({kind:'motivationalVideo',item:motivational[i]});
    if(viralVideos[i])mixed.push({kind:'viralVideo',item:viralVideos[i]});
    if(hindiShortVideos[i])mixed.push({kind:'shortVideo',item:hindiShortVideos[i]});
    if(hindiReelVideos[i])mixed.push({kind:'reelVideo',item:hindiReelVideos[i]});
    if(cinema[i])mixed.push({kind:'movie',item:cinema[i]});
  }
  // Each refresh gets a different order, while every external video still has an embeddable URL.
  const rot=mixed.length?Number.parseInt(refreshSeed.slice(-6),10)%mixed.length:0;
  const freshMixed=mixed.slice(rot).concat(mixed.slice(0,rot));
  res.json({items:freshMixed.slice(0,220),songs:songs.slice(0,150),news:news.slice(0,30),reels,shorts,movies:cinema.slice(0,30),newsVideos:allNewsVideos.slice(0,30),musicVideos:musicVideo.slice(0,30),comedyVideos:comedy.slice(0,30),storyVideos:story.slice(0,20),motivationalVideos:motivational.slice(0,20),viralVideos:viralVideos.slice(0,20),shortVideos:hindiShortVideos.slice(0,20),reelVideos:hindiReelVideos.slice(0,20)});
}catch(e){console.error(e);res.status(503).json({error:'Trending feed unavailable.'})}});

app.get('/api/news/trending',async(req,res)=>{try{const r=await fetch('https://news.google.com/rss?hl=en-IN&gl=IN&ceid=IN:en');if(!r.ok)throw new Error('news unavailable');const xml=await r.text();const items=[...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0,20).map(m=>{const x=m[1];const get=k=>{const z=x.match(new RegExp('<'+k+'(?:\\s[^>]*)?>([\\s\S]*?)<\/'+k+'>'));return z?z[1].replace(/<!\[CDATA\[|\]\]>/g,'').trim():''};return {title:get('title'),link:get('link'),source:get('source')||'Google News',image:''}}).filter(x=>x.title&&x.link);res.json({news:items})}catch(e){console.error(e);res.status(503).json({error:'News unavailable.'})}});

app.get('/api/notifications',async(req,res)=>{try{if(!req.user)return res.status(401).json({error:'Login required.'});const {data,error}=await db.from('notifications').select('*').eq('user_id',req.user.id).order('created_at',{ascending:false}).limit(100);if(error)throw error;res.json({notifications:(data||[]).map(n=>({id:n.id,type:n.type,text:n.text,meta:n.meta||{},createdAt:n.created_at}))})}catch(e){console.error(e);res.status(500).json({error:'Notifications failed.'})}});

app.get('/api/admin/overview',async(req,res)=>{try{if(!isAdmin(req.user))return res.status(403).json({error:'Admin access required.'});const [{count:users},{count:posts},{count:reels},{count:messages}]=await Promise.all([db.from('users').select('*',{count:'exact',head:true}),db.from('posts').select('*',{count:'exact',head:true}),db.from('posts').select('*',{count:'exact',head:true}).eq('type','reel'),db.from('messages').select('*',{count:'exact',head:true})]);res.json({users:users||0,posts:posts||0,reels:reels||0,messages:messages||0})}catch(e){res.status(500).json({error:'Admin overview failed.'})}});
app.get('/api/admin/users',async(req,res)=>{if(!isAdmin(req.user))return res.status(403).json({error:'Admin access required.'});const {data}=await db.from('users').select('*').order('created_at',{ascending:false});res.json({users:(data||[]).map(safeUser)})});
app.delete('/api/admin/posts/:id',async(req,res)=>{if(!isAdmin(req.user))return res.status(403).json({error:'Admin access required.'});await db.from('posts').delete().eq('id',req.params.id);await db.from('stories').delete().eq('post_id',req.params.id);res.json({ok:true})});
app.delete('/api/admin/users/:id',async(req,res)=>{try{if(!isAdmin(req.user))return res.status(403).json({error:'Admin access required.'});if(req.params.id===req.user.id)return res.status(400).json({error:'Admin cannot delete own account here.'});await db.from('users').delete().eq('id',req.params.id);res.json({ok:true})}catch(e){res.status(500).json({error:'Admin user delete failed.'})}});

app.get('/api/health',(req,res)=>res.json({ok:true,database:'local'}));
app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'index.html')));

(async()=>{try{await ensureAdmin();console.log('Local persistent store enabled. Admin:',adminEmail)}catch(e){console.error('Startup error:',e.message)}app.listen(PORT,'0.0.0.0',()=>console.log('Hyper Social on '+PORT))})();

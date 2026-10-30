const http=require('http'),https=require('https'),zlib=require('zlib');
const A=new http.Agent({keepAlive:true}),S=new https.Agent({keepAlive:true,rejectUnauthorized:false});
function once(url,opts,depth){return new Promise(res=>{let u;try{u=new URL(url)}catch(e){return res({statusCode:0,headers:{},body:''})}
const lib=u.protocol==='https:'?https:http;let q;try{q=lib.request(url,{method:(opts&&opts.method)||'GET',agent:u.protocol==='https:'?S:A,
headers:Object.assign({'Accept-Encoding':'gzip, deflate','User-Agent':'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'},(opts&&opts.headers)||{})},r=>{
if([301,302,303,307,308].includes(r.statusCode)&&r.headers.location&&depth<4){r.resume();return once(new URL(r.headers.location,url).toString(),opts,depth+1).then(res)}
const c=[];r.on('data',x=>c.push(x));r.on('end',()=>{let b=Buffer.concat(c);const e=r.headers['content-encoding'];
try{if(e==='gzip')b=zlib.gunzipSync(b);else if(e==='deflate')b=zlib.inflateSync(b);else if(e==='br')b=zlib.brotliDecompressSync(b)}catch(x){}
res({statusCode:r.statusCode,headers:r.headers,body:b.toString('utf8')})})})}catch(e){return res({statusCode:0,headers:{},body:''})}
q.on('error',()=>res({statusCode:0,headers:{},body:''}));q.setTimeout(12000,()=>{q.destroy();res({statusCode:0,headers:{},body:''})});q.end()})}
const base={request:(u,o)=>once(u,o||{},0),log:()=>{},getEnv:k=>process.env[k]||'',processScraping:async()=>null,getSourceFavoriteTags:async()=>[]};
module.exports=new Proxy(base,{get(t,k){if(k in t)return t[k];if(k==='then')return undefined;return async()=>null}});

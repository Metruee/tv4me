const file=process.argv[2], kw=process.argv[3]||'流浪地球';
const short=e=>(e&&e.message||String(e)).slice(0,90).replace(/\s+/g,' ');
const T=(p,ms)=>{let t;const to=new Promise((_,r)=>{t=setTimeout(()=>r(new Error('timeout')),ms)});return Promise.race([p,to]).finally(()=>clearTimeout(t))};
const cnt=r=>!r?0:(Array.isArray(r)?r.length:((r.list||[]).length||r.total||0));
(async()=>{const o={file,home:0,search:0,ok:false,err:''};
try{require(file);const h=global.__HANDLERS__;
if(!h){o.err='no handlers';}else{
 if(typeof h.home==='function'){try{o.home=cnt(await T(h.home({},{}),16000))}catch(e){o.err+='home:'+short(e)+';'}}
 if(o.home===0&&typeof h.search==='function'){try{o.search=cnt(await T(h.search({keyword:kw},{from:'web'}),16000))}catch(e){o.err+='search:'+short(e)+';'}}
 o.ok=o.home>0||o.search>0;}
}catch(e){o.err=short(e)}
console.log(JSON.stringify(o));process.exit(0)})();

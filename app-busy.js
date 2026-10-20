/* One event-driven loading treatment for non-analysis work. */
'use strict';
window.AppBusy = (function () {
  const jobs=new Map(),targets=new Map();let serial=0,timer;
  function render(){
    clearTimeout(timer);const host=document.getElementById('app-busy');if(!host)return;
    if(!jobs.size){host.hidden=true;return;}
    const job=Array.from(jobs.values()).at(-1);document.getElementById('app-busy-label').textContent=job.label;
    if(!host.hidden)return;
    timer=setTimeout(()=>{if(jobs.size)host.hidden=false;},140);
  }
  function begin(label,target){
    const id=++serial;jobs.set(id,{label:String(label)});
    if(target){let item=targets.get(target);if(!item){item={count:0,busy:target.getAttribute('aria-busy'),disabled:'disabled' in target?target.disabled:null};targets.set(target,item);}item.count++;target.setAttribute('aria-busy','true');if(item.disabled!==null)target.disabled=true;}
    render();let ended=false;
    return function(){if(ended)return;ended=true;jobs.delete(id);if(target){const item=targets.get(target);if(item&&!--item.count){if(item.busy===null)target.removeAttribute('aria-busy');else target.setAttribute('aria-busy',item.busy);if(item.disabled!==null)target.disabled=item.disabled;targets.delete(target);}}render();};
  }
  async function during(label,work,target){const end=begin(label,target);try{return await work();}finally{end();}}
  return {begin,during};
})();

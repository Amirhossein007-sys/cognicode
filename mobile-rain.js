/* Two prepainted tiles move on the compositor; no recurring JS/Canvas loop. */
'use strict';
window.MobileRain = (() => {
  function start() {
    const root=document.getElementById('data-rain-background'),canvas=root?.querySelector('.dr-main');
    if (!root || !canvas) return;
    const copy=document.createElement('canvas');copy.className='dr-main dr-mobile-copy';copy.setAttribute('aria-hidden','true');root.insertBefore(copy,canvas.nextSibling);
    root.classList.add('dr-mobile-flow');
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
    let active=true,focused=false,energy=window.__cogniEnergy||{},width=0,height=0;
    function pause() {
      root.classList.toggle('dr-motion-paused',!active||document.hidden||focused||motion.matches||!!energy.lowPower||energy.thermal>=1);
    }
    function paint(force=false) {
      const rect=root.getBoundingClientRect(),w=Math.round(rect.width),h=Math.round(rect.height);
      if(!w||!h||(!force&&w===width&&h===height))return;
      width=w;height=h;
      const dpr=Math.min(devicePixelRatio||1,.75),ctx=canvas.getContext('2d');
      canvas.width=Math.max(1,Math.round(w*dpr));canvas.height=Math.max(1,Math.round(h*dpr));ctx.scale(dpr,dpr);
      const style=getComputedStyle(root),colors=['--dr-calm','--dr-mid','--dr-hot'].map(key=>style.getPropertyValue(key).trim());
      let seed=7;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)|0;return(seed>>>0)/4294967296;};
      const count=Math.max(40,Math.min(80,Math.round(w*h/4800)));
      for(let i=0;i<count;i++){
        const x=random()*w,y=random()*h,length=55+random()*90,drift=(random()-.5)*18,color=colors[i%3];
        for(const offset of [-h,0,h]){
          const gradient=ctx.createLinearGradient(x,y+offset,x+drift,y+length+offset);gradient.addColorStop(0,color+'00');gradient.addColorStop(1,color+(i%3?'70':'a0'));
          ctx.strokeStyle=gradient;ctx.lineWidth=i%3?.85:1.15;ctx.beginPath();ctx.moveTo(x,y+offset);ctx.lineTo(x+drift,y+length+offset);ctx.stroke();
        }
      }
      copy.width=canvas.width;copy.height=canvas.height;copy.getContext('2d').drawImage(canvas,0,0);
      root.dataset.rainParticles=String(count);pause();
    }
    const observer=new ResizeObserver(()=>paint());observer.observe(root);
    new MutationObserver(()=>paint(true)).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    motion.addEventListener('change',pause);document.addEventListener('visibilitychange',pause);
    window.addEventListener('cognicode:energy-change',event=>{energy=event.detail||{};pause();});
    window.addEventListener('cognicode:native-active',event=>{active=!!event.detail;pause();});
    window.addEventListener('pagehide',()=>{active=false;pause();});window.addEventListener('pageshow',()=>{active=true;pause();});
    window.DataRain={refresh:()=>paint(true),setFocus(value){focused=!!value;pause();}};
    paint();pause();
  }
  return {start};
})();

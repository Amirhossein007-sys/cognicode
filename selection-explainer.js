'use strict';
window.SelectionExplanation = (function () {
  function plan(text, firstLine) {
    const lines=text.split('\n'), chunks=[]; let group=[], size=0, start=firstLine;
    function flush(){if(group.length){chunks.push({text:group.join('\n'),line:start,lastLine:start+group.length-1});group=[];size=0;}}
    lines.forEach((line,index)=>{
      const number=firstLine+index;
      if(line.length>3000){
        flush();
        for(let from=0;from<line.length;){let end=Math.min(line.length,from+3000);if(end<line.length&&/[\uD800-\uDBFF]/.test(line[end-1]))end--;
          chunks.push({text:line.slice(from,end),line:number,lastLine:number,column:from+1,continuation:from>0||end<line.length});from=end;}
      }else{
        if(group.length>=6||size+line.length+1>3000)flush();
        if(!group.length)start=number;group.push(line);size+=line.length+1;
      }
    });flush();return chunks;
  }
  async function complete(messages, chat, check) {
    let conversation=messages.slice(), answer='', previous='';
    for(let turn=0;turn<8;turn++){
      check();const response=await chat(conversation,12000,0);check();
      const text=String(response.message?.content||'');
      if(!text.trim()||text===previous)throw new Error('توضیح کامل دریافت نشد؛ مدل ادامهٔ تازه‌ای برنگرداند');
      answer+=text;previous=text;
      if(response.finishReason==='stop')return answer;
      if(response.finishReason!=='length')throw new Error('مدل توضیح را کامل نکرد ('+response.finishReason+')');
      conversation=conversation.concat([{role:'assistant',content:text},{role:'user',content:'Continue exactly where the explanation was cut off. Do not repeat, summarize or shorten it. Finish every remaining source line and every syntax element; include the final unfinished sentence.'}]);
    }
    throw new Error('مدل پس از چند ادامه هنوز توضیح را کامل نکرد؛ این پاسخ کامل محسوب نمی‌شود');
  }
  return {plan,complete};
})();
